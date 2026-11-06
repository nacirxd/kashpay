const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolvePrice } from '../_shared/pricing.ts'

const PAYZENO_BASE = 'https://api.payzeno.io'

function normalizePhoneMZ9(raw: string): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  let local = digits.startsWith('258') ? digits.slice(3) : digits
  if (local.length > 9) local = local.slice(0, 9)
  return /^8[2-7]\d{7}$/.test(local) ? local : null
}

// Zenofy exige E.164: +258XXXXXXXXX
function toE164MZ(local: string | null): string | null {
  return local ? `+258${local}` : null
}

function pickUrl(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null
  const candidates = [
    obj.checkoutUrl, obj.checkout_url, obj.paymentUrl, obj.payment_url,
    obj.redirectUrl, obj.redirect_url, obj.url, obj.link,
    obj?.data?.checkoutUrl, obj?.data?.checkout_url, obj?.data?.paymentUrl,
    obj?.data?.url, obj?.data?.link, obj?.checkout?.url,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && /^https?:\/\//.test(c)) return c
  }
  return null
}

function forcePortuguese(url: string | null): string | null {
  if (!url) return null
  try {
    const checkoutUrl = new URL(url)
    checkoutUrl.searchParams.set('lang', 'pt')
    return checkoutUrl.toString()
  } catch {
    return url
  }
}

function pickId(obj: any): string | null {
  const candidates = [
    obj?.checkout_id, obj?.checkoutId, obj?.orderId, obj?.order_id,
    obj?.id, obj?.data?.checkout_id, obj?.data?.checkoutId,
    obj?.data?.id, obj?.data?.orderId,
  ]
  for (const c of candidates) {
    if (c !== undefined && c !== null && String(c).length > 0) return String(c)
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('ZENOFY_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ZENOFY_API_KEY não configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const {
      amount, product_id, user_id, name, email, phone, whatsapp, bump_product_id, bump_product_ids, bump_valor,
      utm_source, utm_medium, utm_campaign, utm_content, return_url, referrer_url: body_referrer,
    } = body


    if (!product_id || !name || !email) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios em falta' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: productData } = await supabase
      .from('products')
      .select('id, nome, zenofy_product_id, currency')
      .eq('id', product_id)
      .maybeSingle()

    // ID global definido pelo admin tem prioridade; fallback: ID do próprio produto
    const { data: settingRows } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['zenofy_product_id', 'mpesa_enabled', 'emola_enabled'])

    const settings = Object.fromEntries(
      (settingRows || []).map((row: { key: string; value: string | null }) => [row.key, row.value]),
    )
    const globalZenofyId = settings.zenofy_product_id?.toString().trim()
    void globalZenofyId

    // Preço autoritativo do servidor (ignora o valor enviado pelo browser)
    const priced = await resolvePrice(supabase, product_id,
      Array.isArray(bump_product_ids) && bump_product_ids.length ? bump_product_ids : bump_product_id)
    if (priced.error) {
      return new Response(JSON.stringify({ error: priced.error }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const amountNumber = priced.total
    const localPhone = normalizePhoneMZ9(phone || whatsapp || '')
    const activeMethods = [
      ...(settings.mpesa_enabled === 'false' ? [] : ['mpesa']),
      ...(settings.emola_enabled === 'false' ? [] : ['emola']),
    ]
    const preferred = body.preferred_method === 'mpesa' || body.preferred_method === 'emola'
      ? body.preferred_method as string
      : null
    const zenofyPaymentMethods = preferred ? activeMethods.filter((m) => m === preferred) : activeMethods

    if (!localPhone) {
      return new Response(JSON.stringify({
        error: 'Número de WhatsApp inválido. Use o formato 8X XXX XXXX (9 dígitos).',
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (zenofyPaymentMethods.length === 0) {
      return new Response(JSON.stringify({
        error: 'Os métodos de pagamento estão temporariamente indisponíveis.',
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: saleData, error: saleErr } = await supabase.from('sales').insert({
      product_id,
      user_id: priced.sellerId,
      valor: amountNumber,
      status: 'pending',
      buyer_name: name || null,
      buyer_email: email || null,
      buyer_whatsapp: whatsapp || null,
      payment_method: 'zenofy',
      payment_phone: localPhone,
      gateway: 'zenofy',
      bump_product_id: priced.bumpProductId,
      bump_valor: priced.bumpValor,
      bumps: priced.bumps,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
      referrer_url: typeof body_referrer === "string" ? body_referrer.slice(0, 500) : null,
    }).select().single()

    if (saleErr || !saleData) {
      console.error('[zenofy] erro criando venda:', saleErr)
      return new Response(JSON.stringify({ error: 'Erro registando venda' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // M-Pesa directo via API oficial Vodacom (produção)
    const mpesaKey = Deno.env.get('MPESA_API_KEY')
    const mpesaPub = Deno.env.get('MPESA_PUBLIC_KEY')
    if (preferred === 'mpesa' && mpesaKey && mpesaPub) {
      const { publicEncrypt, constants } = await import('node:crypto')
      const pem = `-----BEGIN PUBLIC KEY-----\n${mpesaPub.replace(/\s/g, '').match(/.{1,64}/g)!.join('\n')}\n-----END PUBLIC KEY-----`
      const token = publicEncrypt({ key: pem, padding: constants.RSA_PKCS1_PADDING }, new TextEncoder().encode(mpesaKey)).toString('base64')
      const ref = String(saleData.id).replace(/-/g, '').slice(0, 12).toUpperCase()
      await supabase.from('sales').update({ payment_method: 'mpesa', gateway: 'mpesa', external_transaction_id: ref }).eq('id', saleData.id)
      let mr: any = {}
      let mstatus = 0
      try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 90000)
        const r = await fetch('https://api.vm.co.mz:18352/ipg/v1x/c2bPayment/singleStage/', {
          method: 'POST', signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Origin': 'developer.mpesa.vm.co.mz' },
          body: JSON.stringify({
            input_TransactionReference: ref.slice(0, 10),
            input_CustomerMSISDN: `258${localPhone}`,
            input_Amount: String(Math.round(amountNumber * 100) / 100),
            input_ThirdPartyReference: ref,
            input_ServiceProviderCode: Deno.env.get('MPESA_SERVICE_PROVIDER_CODE') || '902914',
          }),
        })
        clearTimeout(t)
        mstatus = r.status
        mr = await r.json().catch(() => ({}))
        console.log(`[mpesa] status=${r.status} body=`, JSON.stringify(mr))
      } catch (e) {
        console.error('[mpesa] erro de rede:', e)
        await supabase.from('sales').update({ status: 'failed' }).eq('id', saleData.id)
        return new Response(JSON.stringify({ success: false, sale_id: saleData.id, error: 'Não foi possível contactar o M-Pesa. Tente novamente.' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (mr.output_ResponseCode === 'INS-0') {
        await supabase.from('sales').update({ external_transaction_id: mr.output_TransactionID || ref, zenofy_checkout_id: `mpesa-${ref}` }).eq('id', saleData.id)
        const job = fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/zenofy-check-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-key': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! },
          body: JSON.stringify({ sale_id: saleData.id, force_approve: true }),
        }).catch((e) => console.error('[mpesa] aprovação falhou', e))
        // @ts-ignore EdgeRuntime existe no runtime
        if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(job); else await job
        return new Response(JSON.stringify({ success: true, sale_id: saleData.id, direct_payment: true, paid: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      await supabase.from('sales').update({ status: 'failed' }).eq('id', saleData.id)
      const msgs: Record<string, string> = {
        'INS-5': 'Transação cancelada pelo cliente.', 'INS-6': 'Falha na transação.', 'INS-9': 'Tempo esgotado. Tente novamente.',
        'INS-2006': 'Saldo insuficiente.', 'INS-2051': 'Número M-Pesa inválido.', 'INS-996': 'Conta M-Pesa não está activa.',
      }
      return new Response(JSON.stringify({
        success: false, sale_id: saleData.id, status: mstatus,
        error: msgs[mr.output_ResponseCode] || mr.output_ResponseDesc || 'Pagamento M-Pesa não concluído.',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const baseReturn = typeof return_url === 'string' && /^https?:\/\//.test(return_url)
      ? return_url
      : null
    const sep = baseReturn && baseReturn.includes('?') ? '&' : '?'

    const payload: Record<string, unknown> = {
      amount: Math.round(amountNumber * 100), // unidades menores
      currency: (productData as any)?.currency || 'MZN',
      description: `${(productData as any)?.nome || 'Pedido'} #${String(saleData.id).slice(0, 8)}`,
      customer: { name, email, phone: toE164MZ(localPhone) },
      payment_methods: zenofyPaymentMethods,
      metadata: { sale_id: saleData.id, product_id, user_id },
      success_url: baseReturn ? `${baseReturn}${sep}zsale=${saleData.id}` : undefined,
      cancel_url: baseReturn ? `${baseReturn}${sep}zsale=${saleData.id}&zcancel=1` : undefined,
    }

    const callApi = async (path: string, idem: string, body: unknown) => {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 30000)
      try {
        const r = await fetch(`${PAYZENO_BASE}${path}`, {
          method: 'POST',
          signal: ctrl.signal,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Api-Key': apiKey,
            'Idempotency-Key': idem,
          },
          body: JSON.stringify(body),
        })
        const d = await r.json().catch(() => ({}))
        console.log(`[payzeno] ${path} status=${r.status} body=`, JSON.stringify(d))
        return { ok: r.ok, status: r.status, data: d as any }
      } finally {
        clearTimeout(t)
      }
    }

    let session
    try {
      session = await callApi('/v1/checkout/sessions', `order-${saleData.id}`, payload)
    } catch (e) {
      await supabase.from('sales').update({ status: 'failed' }).eq('id', saleData.id)
      console.error('[payzeno] erro de rede:', e)
      return new Response(JSON.stringify({ error: 'Não foi possível contactar o gateway de pagamento. Tente novamente.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!session.ok) {
      await supabase.from('sales').update({ status: 'failed' }).eq('id', saleData.id)
      return new Response(JSON.stringify({
        success: false,
        error: session.data?.message || session.data?.error || 'Falha ao criar pagamento',
        status: session.status,
        details: session.data,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const checkoutId = pickId(session.data)
    const checkoutUrl = forcePortuguese(pickUrl(session.data))

    await supabase.from('sales').update({
      zenofy_checkout_id: checkoutId,
      external_transaction_id: checkoutId,
    }).eq('id', saleData.id)

    // Pagamento directo (push no telemóvel) quando o comprador escolheu M-Pesa ou e-Mola
    let directOk = false
    let paidNow = false
    if (preferred && checkoutId) {
      try {
        const pay = await callApi(`/v1/payment/${preferred}`, `pay-${saleData.id}-${preferred}`, {
          checkout_id: checkoutId,
          phone: localPhone,
        })
        directOk = pay.ok
        const pst = String(pay.data?.status || '').toLowerCase()
        if (pay.ok && ['succeeded','paid','success','approved','completed'].includes(pst)) {
          paidNow = true
          // Emails/WhatsApp/SMS correm em segundo plano para o cliente não esperar
          const job = fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/zenofy-check-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-key': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! },
            body: JSON.stringify({ sale_id: saleData.id, force_approve: true }),
          }).catch((e) => console.error('[payzeno] aprovação falhou', e))
          // @ts-ignore EdgeRuntime existe no runtime
          if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(job); else await job
        }
        if (!pay.ok && !checkoutUrl) {
          return new Response(JSON.stringify({
            success: false,
            sale_id: saleData.id,
            error: pay.data?.message || pay.data?.error || 'Não foi possível iniciar o pagamento no telemóvel.',
          }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      } catch (e) {
        console.error('[payzeno] pagamento directo falhou:', e)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sale_id: saleData.id,
      checkout_id: checkoutId,
      checkout_url: checkoutUrl,
      direct_payment: directOk,
      paid: paidNow,
      raw: session.data,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('zenofy-create-payment error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
