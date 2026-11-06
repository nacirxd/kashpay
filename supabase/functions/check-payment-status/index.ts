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
    const { product_id, buyer_token } = await req.json()

    if (!product_id || typeof buyer_token !== 'string' || buyer_token.length < 32) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios em falta' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: sales, error } = await supabase
      .from('sales')
      .select('id, status')
      .eq('product_id', product_id)
      .eq('access_token', buyer_token)
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
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
