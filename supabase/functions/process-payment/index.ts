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

    await supabase.from('sales').insert({
      product_id,
      user_id,
      valor: amount,
      status,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
    })

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
