import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { product_id, email, phone } = await req.json()

    if (!product_id || !email || !phone) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios em falta' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const digits = String(phone).replace(/\D/g, '')
    const last9 = digits.slice(-9)
    const variants = Array.from(new Set([String(phone), digits, last9].filter(Boolean)))
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: sales, error } = await supabase
      .from('sales')
      .select('id, status')
      .eq('product_id', product_id)
      .eq('buyer_email', email)
      .in('payment_phone', variants)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    const sale = sales?.[0]

    return new Response(JSON.stringify({
      found: Boolean(sale),
      sale_id: sale?.id || null,
      status: sale?.status || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
