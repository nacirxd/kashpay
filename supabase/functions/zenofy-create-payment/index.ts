const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ZENOFY_BASE = 'https://api.zenofy.io'

function normalizePhoneMZ9(raw: string): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  const local = digits.startsWith('258') && digits.length === 12 ? digits.slice(3) : digits
  return /^8[2-7]\d{7}$/.test(local) ? local : null
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
      amount, product_id, user_id, name, email, phone, whatsapp,
      utm_source, utm_medium, utm_campaign, utm_content,
    } = body

    if (!amount || !product_id || !user_id || !name || !email) {
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

    const zenofyProductId = (productData as any)?.zenofy_product_id?.toString().trim()
    if (!zenofyProductId) {
      return new Response(JSON.stringify({
        error: 'Este produto não tem o ID do produto Zenofy configurado. Adicione-o na edição do produto.',
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const amountNumber = Number(amount)
    const localPhone = normalizePhoneMZ9(phone || whatsapp || '')

    const { data: saleData, error: saleErr } = await supabase.from('sales').insert({
      product_id,
      user_id,
      valor: amountNumber,
      status: 'pending',
      buyer_name: name || null,
      buyer_email: email || null,
      buyer_whatsapp: whatsapp || null,
      payment_method: 'zenofy',
      payment_phone: localPhone,
      gateway: 'zenofy',
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
    }).select().single()

    if (saleErr || !saleData) {
      console.error('[zenofy] erro criando venda:', saleErr)
      return new Response(JSON.stringify({ error: 'Erro registando venda' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload: Record<string, unknown> = {
      productId: zenofyProductId,
      amount: Math.round(amountNumber * 100), // unidades menores
      currency: (productData as any)?.currency || 'MZN',
      reference: saleData.id,
      metadata: { sale_id: saleData.id, product_id, user_id },
      customer: { name, email, phone: localPhone || undefined },
      name,
      email,
      phone: localPhone || undefined,
    }

    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 30000)
    let resp: Response
    try {
      resp = await fetch(`${ZENOFY_BASE}/checkout/order-api-gateway`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Api-Key': apiKey,
        },
        body: JSON.stringify(payload),
      })
    } catch (e) {
      clearTimeout(t)
      await supabase.from('sales').update({ status: 'failed' }).eq('id', saleData.id)
      console.error('[zenofy] erro de rede:', e)
      return new Response(JSON.stringify({ error: 'Não foi possível contactar a Zenofy. Tente novamente.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    clearTimeout(t)

    const data = await resp.json().catch(() => ({}))
    console.log(`[zenofy] create status=${resp.status} body=`, JSON.stringify(data))

    if (!resp.ok) {
      await supabase.from('sales').update({ status: 'failed' }).eq('id', saleData.id)
      return new Response(JSON.stringify({
        success: false,
        error: data?.message || data?.error || 'Falha ao criar pagamento na Zenofy',
        status: resp.status,
        details: data,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const checkoutId = pickId(data)
    const checkoutUrl = pickUrl(data)

    await supabase.from('sales').update({
      zenofy_checkout_id: checkoutId,
      external_transaction_id: checkoutId,
    }).eq('id', saleData.id)

    return new Response(JSON.stringify({
      success: true,
      sale_id: saleData.id,
      checkout_id: checkoutId,
      checkout_url: checkoutUrl,
      raw: data,
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
