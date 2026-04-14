const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { method, phone, amount, reference, product_id, user_id, utm_source, utm_medium, utm_campaign, utm_content } = await req.json()

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

    // Call payment endpoint with timeout
    const payController = new AbortController()
    const payTimeout = setTimeout(() => payController.abort(), 20000)

    const endpoint = method === 'mpesa'
      ? 'https://e2payments.explicador.co.mz/v1/c2b/mpesa-payment/993700'
      : 'https://e2payments.explicador.co.mz/v1/c2b/emola-payment/993699'

    const payResp = await fetch(endpoint, {
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
        phone: phone,
      }),
    })
    clearTimeout(payTimeout)

    const payData = await payResp.json()

    // Record sale in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const status = payResp.ok ? 'approved' : 'pending'

    const { data: saleData } = await supabase.from('sales').insert({
      product_id,
      user_id,
      valor: amount,
      status,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
    }).select().single()

    // Return response immediately, then fire integrations in background
    const response = new Response(JSON.stringify({ success: payResp.ok, data: payData, status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

    // Fire-and-forget: send to UTMify and webhook (don't block response)
    const bgWork = async () => {
      try {
        const [utmifyResult, webhookResult] = await Promise.all([
          supabase.from('integrations').select('config, ativo').eq('user_id', user_id).eq('tipo', 'utmify').eq('ativo', true).maybeSingle(),
          supabase.from('integrations').select('config, ativo').eq('user_id', user_id).eq('tipo', 'webhook').eq('ativo', true).maybeSingle(),
        ])

        // UTMify - only send if approved, active integration, and valid token
        if (status === 'approved' && utmifyResult.data?.config) {
          const config = utmifyResult.data.config as any
          const apiToken = config.api_token || config.token
          if (apiToken) {
            console.log('Enviando evento UTMify para venda:', saleData?.id)
            const ctrl = new AbortController()
            const t = setTimeout(() => ctrl.abort(), 8000)
            try {
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
                  paymentMethod: method === 'mpesa' ? 'M-Pesa' : 'e-Mola',
                  status: 'paid',
                  createdAt: new Date().toISOString(),
                  approvedDate: new Date().toISOString(),
                  customer: { phone },
                  products: [{ name: product_id, quantity: 1, price: amount }],
                  trackingParameters: {
                    src: utm_source || null,
                    utm_source: utm_source || null,
                    utm_medium: utm_medium || null,
                    utm_campaign: utm_campaign || null,
                    utm_content: utm_content || null,
                  },
                  commission: { totalPrice: amount, currency: 'MZN' },
                }),
              })
              console.log('UTMify response status:', utmifyResp.status)
              const utmifyBody = await utmifyResp.text()
              console.log('UTMify response body:', utmifyBody)
            } catch (err) {
              console.error('Erro UTMify:', err)
            }
            clearTimeout(t)
          }
        }

        // Webhook
        if (webhookResult.data?.config && (webhookResult.data.config as any).url) {
          const ctrl = new AbortController()
          const t = setTimeout(() => ctrl.abort(), 8000)
          await fetch((webhookResult.data.config as any).url, {
            method: 'POST',
            signal: ctrl.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'sale.created', sale: saleData, payment_method: method, status }),
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
