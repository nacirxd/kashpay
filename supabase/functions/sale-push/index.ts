// Envia notificação push ao vendedor quando uma venda é aprovada
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: tok } = await supabase.from('app_settings').select('value').eq('key', 'wa_cron_token').maybeSingle()
  if (!tok?.value || req.headers.get('x-cron-token') !== tok.value) return json({ error: 'unauthorized' }, 401)

  const { sale_id } = await req.json().catch(() => ({}))
  if (typeof sale_id !== 'string') return json({ error: 'sale_id obrigatório' }, 400)

  const { data: sale } = await supabase.from('sales')
    .select('id, user_id, valor, status, products!sales_product_id_fkey(nome)').eq('id', sale_id).maybeSingle()
  if (!sale || sale.status !== 'approved') return json({ skipped: true })

  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', sale.user_id)
  if (!subs?.length) return json({ sent: 0 })

  webpush.setVapidDetails('mailto:suporte@kashpay.shop', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)
  const valor = Number(sale.valor || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })
  const payload = JSON.stringify({
    title: '💰 Venda aprovada!',
    body: `${(sale as any).products?.nome || 'Produto'} — MT ${valor}`,
    url: '/vendas',
  })

  let sent = 0
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      sent++
    } catch (e: any) {
      console.error('[sale-push] falha', e?.statusCode, e?.body)
      if (e?.statusCode === 404 || e?.statusCode === 410) await supabase.from('push_subscriptions').delete().eq('id', s.id)
    }
  }
  return json({ sent })
})
