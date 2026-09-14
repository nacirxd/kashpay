// Cron: marca vendas pending há > 30min como 'failed'
// Limpa o dashboard automaticamente de vendas que nunca foram pagas
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    // Vendas Zenofy são reconciliadas pela função zenofy-check-status (podem
    // demorar mais tempo a confirmar), por isso não são tocadas aqui.
    const { data, error } = await supabase
      .from('sales')
      .update({ status: 'failed' })
      .eq('status', 'pending')
      .lt('created_at', cutoff)
      .or('gateway.is.null,gateway.neq.zenofy')
      .select('id')


    if (error) throw error

    const updated = data?.length || 0
    console.log(`[cleanup] ${updated} vendas pending → failed (criadas antes de ${cutoff})`)

    return new Response(JSON.stringify({ success: true, updated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[cleanup] erro:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
