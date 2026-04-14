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
    const { method, phone, amount, reference, product_id, user_id, utm_source, utm_medium, utm_campaign } = await req.json()

    if (!method || !phone || !amount || !product_id || !user_id) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios em falta' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get OAuth token
    const tokenResp = await fetch("https://e2payments.explicador.co.mz/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: "9ec6e1b3-f7ba-42ce-a580-a781788989ed",
        client_secret: "OukiSHefGsaydwOTRRlLdIY88s4NegQfSjgBofAH",
      }),
    })

    const tokenData = await tokenResp.json()
    const token = tokenData.access_token

    if (!token) {
      return new Response(JSON.stringify({ error: 'Falha ao obter token de pagamento' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call payment endpoint
    const endpoint = method === 'mpesa'
      ? 'https://e2payments.explicador.co.mz/v1/c2b/mpesa-payment/993700'
      : 'https://e2payments.explicador.co.mz/v1/c2b/emola-payment/993699'

    const payResp = await fetch(endpoint, {
      method: 'POST',
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
    }).select().single()

    // Get product info for UTMify
    const { data: productData } = await supabase.from('products').select('nome').eq('id', product_id).single()

    // Check if user has active UTMify integration and send sale
    const { data: utmifyIntegration } = await supabase
      .from('integrations')
      .select('config, ativo')
      .eq('user_id', user_id)
      .eq('tipo', 'utmify')
      .eq('ativo', true)
      .maybeSingle()

    if (utmifyIntegration?.config && (utmifyIntegration.config as any).api_token) {
      const apiToken = (utmifyIntegration.config as any).api_token
      try {
        const utmifyPayload = {
          orderId: saleData?.id || crypto.randomUUID(),
          platform: "MoonPay",
          paymentMethod: method === 'mpesa' ? 'M-Pesa' : 'e-Mola',
          status: status === 'approved' ? 'paid' : 'waiting_payment',
          createdAt: new Date().toISOString(),
          approvedDate: status === 'approved' ? new Date().toISOString() : null,
          customer: { phone },
          products: [{
            name: productData?.nome || 'Produto',
            quantity: 1,
            price: amount,
          }],
          trackingParameters: {
            src: utm_source || null,
            utm_source: utm_source || null,
            utm_medium: utm_medium || null,
            utm_campaign: utm_campaign || null,
          },
          commission: { totalPrice: amount, currency: 'MZN' },
        }

        console.log('Sending to UTMify:', JSON.stringify(utmifyPayload))

        await fetch('https://api.utmify.com.br/api-credentials/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-token': apiToken,
          },
          body: JSON.stringify(utmifyPayload),
        })
      } catch (utmErr) {
        console.error('UTMify send error:', utmErr)
      }
    }

    // Check if user has active webhook integration and send notification
    const { data: webhookIntegration } = await supabase
      .from('integrations')
      .select('config, ativo')
      .eq('user_id', user_id)
      .eq('tipo', 'webhook')
      .eq('ativo', true)
      .maybeSingle()

    if (webhookIntegration?.config && (webhookIntegration.config as any).url) {
      try {
        await fetch((webhookIntegration.config as any).url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'sale.created',
            sale: saleData,
            product: productData,
            payment_method: method,
            status,
          }),
        })
      } catch (whErr) {
        console.error('Webhook send error:', whErr)
      }
    }

    return new Response(JSON.stringify({ success: payResp.ok, data: payData, status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
