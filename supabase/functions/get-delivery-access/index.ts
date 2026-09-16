import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveAccessUrl } from '../_shared/deliveryAccess.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { product_id, email, sale_id } = await req.json()

    if (!sale_id && (!product_id || !email)) {
      return json({ error: 'Campos obrigatórios em falta' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Só devolve acesso quando existe uma venda aprovada para este comprador
    let query = supabase
      .from('sales')
      .select('id, status, product_id, bump_product_id, buyer_email')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)

    if (sale_id) {
      query = query.eq('id', sale_id)
    } else {
      query = query.eq('product_id', product_id).ilike('buyer_email', String(email).trim())
    }

    const { data: sales, error } = await query
    if (error) throw error

    const sale = sales?.[0]
    if (!sale) return json({ authorized: false })

    const cols = 'id, nome, delivery_type, external_url, file_url'
    const { data: product } = await supabase
      .from('products')
      .select(cols)
      .eq('id', sale.product_id)
      .maybeSingle()

    const productUrl = await resolveAccessUrl(supabase, product)

    let bumpUrl: string | undefined
    if (sale.bump_product_id) {
      const { data: bump } = await supabase
        .from('products')
        .select(cols)
        .eq('id', sale.bump_product_id)
        .maybeSingle()
      bumpUrl = await resolveAccessUrl(supabase, bump)
    }

    return json({ authorized: true, sale_id: sale.id, access_url: productUrl ?? null, bump_access_url: bumpUrl ?? null })
  } catch (err) {
    console.error('[get-delivery-access] erro:', err)
    return json({ error: (err as Error).message }, 500)
  }
})
