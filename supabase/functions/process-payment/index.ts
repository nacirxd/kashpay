const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXCHANGE_RATE_URL = 'https://open.er-api.com/v6/latest/MZN'
const TSEMBA_SMS_URL = 'https://hdxqelinqivwgmggolhs.supabase.co/functions/v1/api-gateway/sms/send'

async function hashSHA256(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function normalizePhoneMZ(raw: string): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('258') && digits.length === 12) return `+${digits}`
  if (digits.length === 9 && digits.startsWith('8')) return `+258${digits}`
  if (digits.startsWith('+')) return digits
  return null
}

// e2payments espera APENAS 9 dígitos: 8XXXXXXXX (sem 258, sem +, sem espaços)
function normalizePhoneE2Pay(raw: string): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 9 && /^8[4-7]/.test(digits)) return digits
  if (digits.length === 12 && digits.startsWith('258') && /^2588[4-7]/.test(digits)) return digits.slice(3)
  return null
}

async function sendTsembaSMSOnce(apiKey: string, senderId: string | null, to: string, message: string, timeoutMs: number) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const body: Record<string, string> = { to, message }
    if (senderId) body.sender_id = senderId
    const resp = await fetch(TSEMBA_SMS_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify(body),
    })
    const text = await resp.text()
    console.log('Tsemba SMS response:', resp.status, text)
    return { ok: resp.ok, aborted: false }
  } catch (err: any) {
    const aborted = err?.name === 'AbortError'
    console.error('Erro Tsemba SMS:', err)
    return { ok: false, aborted }
  } finally {
    clearTimeout(t)
  }
}

async function sendTsembaSMS(apiKey: string, senderId: string | null, to: string, message: string) {
  // 1ª tentativa: 20s
  let r = await sendTsembaSMSOnce(apiKey, senderId, to, message, 20000)
  if (r.ok) return true
  // Retry apenas se timeout
  if (r.aborted) {
    console.log('Tsemba SMS retry após timeout para', to)
    r = await sendTsembaSMSOnce(apiKey, senderId, to, message, 25000)
    if (r.ok) return true
  }
  return false
}

// Sistema de SMS externo (recebe aviso de venda aprovada e envia o SMS)
const DEFAULT_SMS_WEBHOOK_URL = 'https://zenofyetsembasms.online/api/public/tsemba/webhook'

async function notifySmsWebhook(url: string, payload: Record<string, unknown>) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 10000)
  try {
    const resp = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    console.log('SMS webhook response:', resp.status, await resp.text())
    return resp.ok
  } catch (err) {
    console.error('Erro no SMS webhook:', err)
    return false
  } finally {
    clearTimeout(t)
  }
}

async function convertMznToBrlCents(amountMzn: number) {
  const fxController = new AbortController()
  const fxTimeout = setTimeout(() => fxController.abort(), 8000)

  try {
    const fxResp = await fetch(EXCHANGE_RATE_URL, { signal: fxController.signal })
    const fxData = await fxResp.json()
    const rate = Number(fxData?.rates?.BRL)

    if (!fxResp.ok || !Number.isFinite(rate) || rate <= 0) {
      throw new Error('Falha ao obter cotação MZN→BRL')
    }

    return {
      rate,
      cents: Math.round(amountMzn * rate * 100),
    }
  } finally {
    clearTimeout(fxTimeout)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { method, phone, amount, reference, product_id, user_id, name, email, whatsapp, utm_source, utm_medium, utm_campaign, utm_content } = await req.json()

    if (!method || !phone || !amount || !product_id || !user_id) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios em falta' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get OAuth token with timeout
    const tokenController = new AbortController()
    const tokenTimeout = setTimeout(() => tokenController.abort(), 15000)
    
    const tokenResp = await fetch("https://e2payments.explicador.co.mz/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: tokenController.signal,
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: "9ec6e1b3-f7ba-42ce-a580-a781788989ed",
        client_secret: "OukiSHefGsaydwOTRRlLdIY88s4NegQfSjgBofAH",
      }),
    })
    clearTimeout(tokenTimeout)

    const tokenData = await tokenResp.json()
    const token = tokenData.access_token

    if (!token) {
      return new Response(JSON.stringify({ error: 'Falha ao obter token de pagamento' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Record sale in database FIRST as pending
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const amountNumber = Number(amount)

    const { data: saleData } = await supabase.from('sales').insert({
      product_id,
      user_id,
      valor: amountNumber,
      status: 'pending',
      buyer_name: name || null,
      buyer_email: email || null,
      buyer_whatsapp: whatsapp || null,
      payment_method: method || null,
      payment_phone: phone || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
    }).select().single()

    const { data: productData } = await supabase
      .from('products')
      .select('id, nome, delivery_type, external_url, file_url, support_phone, support_email, meta_pixel_id, meta_access_token, webhook_url')
      .eq('id', product_id)
      .maybeSingle()

    // Normalizar telefone para o formato exigido pela e2payments (258XXXXXXXXX)
    const e2payPhone = normalizePhoneE2Pay(phone)
    if (!e2payPhone) {
      console.error('Telefone inválido para e2payments:', phone)
      return new Response(JSON.stringify({
        success: false,
        error: 'Número de telefone inválido. Use formato 84/85 (M-Pesa) ou 86/87 (e-Mola).',
        status: 'pending',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call payment endpoint with timeout
    const payController = new AbortController()
    const payTimeout = setTimeout(() => payController.abort(), 45000)

    const endpoint = method === 'mpesa'
      ? 'https://e2payments.explicador.co.mz/v1/c2b/mpesa-payment/993700'
      : 'https://e2payments.explicador.co.mz/v1/c2b/emola-payment/993699'

    console.log(`[e2pay] ${method} request → phone=${e2payPhone} amount=${amount} sale=${saleData?.id}`)

    let payResp: Response | null = null
    let payData: any = {}
    let networkError: string | null = null
    try {
      payResp = await fetch(endpoint, {
        method: 'POST',
        signal: payController.signal,
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: new URLSearchParams({
          client_id: "9ec6e1b3-f7ba-42ce-a580-a781788989ed",
          amount: String(amount),
          reference: reference || "moonpay",
          phone: e2payPhone,
        }),
      })
      payData = await payResp.json().catch(() => ({}))
      console.log(`[e2pay] ${method} response status=${payResp.status} body=`, JSON.stringify(payData))
    } catch (err: any) {
      networkError = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'network_error')
      console.error(`[e2pay] ${method} fetch erro:`, networkError)
    } finally {
      clearTimeout(payTimeout)
    }

    // Update sale status: approved on success, failed on any error/timeout (no orphan pending)
    const ok = !!payResp && payResp.ok
    const status = ok ? 'approved' : 'failed'
    if (saleData?.id) {
      await supabase.from('sales').update({ status }).eq('id', saleData.id)
      if (!ok) {
        console.warn(`[e2pay] Venda ${saleData.id} marcada como FAILED. http=${payResp?.status || 'n/a'} err=${networkError || 'http_error'}`)
      }
    }

    // Return response immediately, then fire integrations in background
    const response = new Response(JSON.stringify({
      success: ok,
      data: payData,
      status,
      error: ok ? undefined : (networkError || `Pagamento recusado (HTTP ${payResp?.status || 'n/a'})`),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

    // Fire-and-forget: send to UTMify and webhook (don't block response)
    const bgWork = async () => {
      try {
        // Fetch seller profile for contact info (used by emails + SMS)
        const { data: sellerProfile } = await supabase
          .from('profiles')
          .select('nome, email, telefone, mpesa_telefone')
          .eq('user_id', user_id)
          .maybeSingle()

        // Send purchase confirmation email
        if (status === 'approved' && email) {
          try {
            await supabase.functions.invoke('send-transactional-email', {
              body: {
                templateName: 'purchase-confirmation',
                recipientEmail: email,
                idempotencyKey: `purchase-confirm-${saleData?.id || product_id}-${Date.now()}`,
                templateData: {
                  buyerName: name,
                  productName: productData?.nome || 'Produto',
                  amount: `${Number(amount).toLocaleString('pt-MZ')} MT`,
                  paymentMethod: method,
                  accessUrl: productData?.delivery_type === 'link' ? productData?.external_url : undefined,
                  accessType: productData?.delivery_type,
                  sellerName: sellerProfile?.nome || undefined,
                  // Suporte do PRODUTO (preferido) com fallback para vendedor
                  sellerEmail: productData?.support_email || sellerProfile?.email || undefined,
                  sellerWhatsapp: productData?.support_phone || sellerProfile?.telefone || sellerProfile?.mpesa_telefone || undefined,
                },
              },
            })
            console.log('Email de compra enviado para:', email)
          } catch (emailErr) {
            console.error('Erro ao enviar email de compra:', emailErr)
          }

          // Send sale notification to seller
          if (sellerProfile?.email) {
            try {
              await supabase.functions.invoke('send-transactional-email', {
                body: {
                  templateName: 'sale-notification',
                  recipientEmail: sellerProfile.email,
                  idempotencyKey: `sale-notify-${saleData?.id || product_id}-${Date.now()}`,
                  templateData: {
                    sellerName: sellerProfile.nome || undefined,
                    productName: productData?.nome || 'Produto',
                    amount: `${Number(amount).toLocaleString('pt-MZ')} MT`,
                    buyerName: name || undefined,
                    buyerEmail: email || undefined,
                    paymentMethod: method,
                  },
                },
              })
              console.log('Notificação de venda enviada para vendedor:', sellerProfile.email)
            } catch (sellerEmailErr) {
              console.error('Erro ao notificar vendedor:', sellerEmailErr)
            }
          }
        }

        const [utmifyResult, webhookResult] = await Promise.all([
          supabase.from('integrations').select('config, ativo').eq('user_id', user_id).eq('tipo', 'utmify').eq('ativo', true).maybeSingle(),
          supabase.from('integrations').select('config, ativo').eq('user_id', user_id).eq('tipo', 'webhook').eq('ativo', true).maybeSingle(),
        ])

        // Tsemba SMS GLOBAL (controlado pelo admin via secrets) - dispara em todas as vendas aprovadas
        if (status === 'approved') {
          const apiKey = Deno.env.get('TSEMBA_API_KEY') || ''
          const senderId = Deno.env.get('TSEMBA_SENDER_ID') || null
          const buyerPhone = phone
          const normalized = normalizePhoneMZ(buyerPhone || '')
          const firstName = String(name || '').split(' ')[0]
          const valorFormatado = `${Number(amount).toLocaleString('pt-MZ')} MT`
          const supportContact = (productData?.support_phone || '').toString().trim() || '864381528'
          const message = `Ola ${firstName}, confirmamos sua compra de ${valorFormatado}. Duvidas? Fale conosco no WhatsApp: ${supportContact}`

          if (apiKey && normalized && name) {
            // Aguardar 3 segundos antes de enviar o SMS apos a compra
            await new Promise((resolve) => setTimeout(resolve, 3000))
            const sent = await sendTsembaSMS(apiKey, senderId, normalized, message)
            await supabase.from('sms_logs').insert({
              user_id,
              sale_id: saleData?.id || null,
              provider: 'tsemba',
              recipient_phone: normalized,
              sender_id: senderId,
              message,
              status: sent ? 'sent' : 'failed',
              provider_response: sent ? 'Pedido aceite pela Tsemba' : null,
              error_message: sent ? null : 'Falha ao enviar SMS pela Tsemba',
            })
          } else {
            const reason = !apiKey ? 'TSEMBA_API_KEY nao configurado no admin' : 'Faltam telefone valido ou nome do comprador'
            console.log('Tsemba SMS ignorado:', reason)
            await supabase.from('sms_logs').insert({
              user_id,
              sale_id: saleData?.id || null,
              provider: 'tsemba',
              recipient_phone: normalized || buyerPhone || 'indisponivel',
              sender_id: senderId,
              message,
              status: 'failed',
              provider_response: null,
              error_message: reason,
            })
          }
        }

        // Meta Conversion API (CAPI) - server-side Purchase event
        // Pixel é por produto: products.meta_pixel_id + products.meta_access_token
        if (status === 'approved') {
          const pixelId = (productData as any)?.meta_pixel_id?.toString().trim()
          const accessToken = (productData as any)?.meta_access_token?.toString().trim()
          if (pixelId && accessToken) {
            try {
              const eventTime = Math.floor(Date.now() / 1000)
              const capiResp = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  data: [{
                    event_name: 'Purchase',
                    event_time: eventTime,
                    event_id: saleData?.id || `${product_id}-${eventTime}`,
                    action_source: 'website',
                    user_data: {
                      em: email ? [await hashSHA256(email.toLowerCase().trim())] : [],
                      ph: phone ? [await hashSHA256(phone.replace(/\D/g, ''))] : [],
                      fn: name ? [await hashSHA256(name.toLowerCase().trim().split(' ')[0])] : [],
                    },
                    custom_data: {
                      currency: 'MZN',
                      value: amountNumber,
                      content_name: productData?.nome || 'Produto',
                      content_ids: [product_id],
                      content_type: 'product',
                    },
                  }],
                  access_token: accessToken,
                }),
              })
              const capiBody = await capiResp.text()
              console.log('Meta CAPI response (product pixel):', pixelId, capiResp.status, capiBody)
            } catch (capiErr) {
              console.error('Erro Meta CAPI:', capiErr)
            }
          } else {
            console.log('Meta CAPI ignorado: produto sem meta_pixel_id/meta_access_token')
          }
        }

        // UTMify - only send if approved, active integration, and valid token
        if (status === 'approved' && utmifyResult.data?.config) {
          const config = utmifyResult.data.config as any
          const apiToken = config.api_token || config.token
          if (apiToken && name && email) {
            console.log('Enviando evento UTMify para venda:', saleData?.id)
            const ctrl = new AbortController()
            const t = setTimeout(() => ctrl.abort(), 8000)
            try {
              const { rate, cents } = await convertMznToBrlCents(amountNumber)
              console.log('Cotação MZN→BRL utilizada:', rate)

              const utmifyResp = await fetch('https://api.utmify.com.br/api-credentials/orders', {
                method: 'POST',
                signal: ctrl.signal,
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-token': apiToken,
                },
                body: JSON.stringify({
                  orderId: saleData?.id,
                  platform: 'MoonPay',
                  paymentMethod: 'unknown',
                  status: 'paid',
                  createdAt: new Date().toISOString(),
                  approvedDate: new Date().toISOString(),
                  customer: {
                    name,
                    email,
                    phone,
                    document: null,
                  },
                  products: [{
                    id: productData?.id || product_id,
                    name: productData?.nome || product_id,
                    planId: productData?.id || product_id,
                    planName: productData?.nome || 'Produto digital',
                    quantity: 1,
                    priceInCents: cents,
                  }],
                  trackingParameters: {
                    src: utm_source || null,
                    utm_source: utm_source || null,
                    utm_medium: utm_medium || null,
                    utm_campaign: utm_campaign || null,
                    utm_content: utm_content || null,
                    utm_term: null,
                  },
                  commission: {
                    totalPriceInCents: cents,
                    gatewayFeeInCents: 0,
                    userCommissionInCents: cents,
                    currency: 'BRL',
                  },
                }),
              })
              console.log('UTMify response status:', utmifyResp.status)
              const utmifyBody = await utmifyResp.text()
              console.log('UTMify response body:', utmifyBody)
            } catch (err) {
              console.error('Erro UTMify:', err)
            }
            clearTimeout(t)
          } else if (apiToken) {
            console.error('UTMify ignorado: nome/email do comprador em falta')
          }
        }

        // Webhook — por produto (fallback: integração global antiga)
        const productWebhookUrl = (productData as any)?.webhook_url?.toString().trim()
        const legacyWebhookUrl = (webhookResult.data?.config as any)?.url
        const webhookUrl = productWebhookUrl || legacyWebhookUrl
        if (webhookUrl) {
          const ctrl = new AbortController()
          const t = setTimeout(() => ctrl.abort(), 8000)
          await fetch(webhookUrl, {
            method: 'POST',
            signal: ctrl.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'sale.created', sale: saleData, product_id, payment_method: method, status }),
          }).catch((err) => console.error('Erro Webhook:', err))
          clearTimeout(t)
        }
      } catch (e) {
        console.error('Background integration error:', e)
      }
    }
    
    // Don't await - let it run in background
    bgWork()

    return response
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
