// Envia WhatsApp ao comprador via VisionSpy:
// - { sale_id }: mensagem de compra aprovada com acesso (disparada por gatilho)
// - { mode: "recovery" }: recupera pedidos pendentes (a cada 15 min) + reenvio de aprovadas perdidas
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveAccessUrl } from '../_shared/deliveryAccess.ts'

const API = 'https://visionspyads.com/api/public/v1/whatsapp/send'
const SITE = 'https://kashpay.lovable.app'
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })

function toDigits(raw?: string | null): string | null {
  if (!raw) return null
  const d = String(raw).replace(/\D/g, '')
  if (/^8[2-7]\d{7}$/.test(d)) return `258${d}`
  if (/^9\d{8}$/.test(d)) return `244${d}`
  if (/^(258|244)\d{9}$/.test(d)) return d
  return null
}

async function send(to: string, message: string) {
  const r = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('VISIONSPY_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ instance_id: Deno.env.get('VISIONSPY_INSTANCE_ID'), to, message }),
  })
  const body = await r.text()
  if (!r.ok) console.error(`[visionspy] envio falhou [${r.status}]: ${body}`)
  return r.ok
}

const TSEMBA_SMS_URL = 'https://hdxqelinqivwgmggolhs.supabase.co/functions/v1/api-gateway/sms/send'

// SMS personalizados configurados pelo vendedor em "Disparos SMS"
async function sendTemplateSms(supabase: any, sale: any, evento: 'approved' | 'pending', vars: Record<string, string>) {
  try {
    const apiKey = Deno.env.get('TSEMBA_API_KEY')
    if (!apiKey) return
    const digits = toDigits(sale.buyer_whatsapp || sale.payment_phone)
    if (!digits) return
    const { data: tpls } = await supabase.from('sms_templates').select('id, mensagem, product_ids')
      .eq('user_id', sale.user_id).eq('evento', evento).eq('ativo', true)
    for (const t of tpls || []) {
      const ids: string[] = t.product_ids || []
      if (ids.length && !ids.includes(sale.product_id)) continue
      const message = String(t.mensagem).replace(/\{(\w+)\}/g, (m: string, k: string) => vars[k] ?? m)
      const body: Record<string, string> = { to: `+${digits}`, message }
      const sender = Deno.env.get('TSEMBA_SENDER_ID'); if (sender) body.sender_id = sender
      const r = await fetch(TSEMBA_SMS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }, body: JSON.stringify(body) })
      const txt = await r.text()
      await supabase.from('sms_logs').insert({ user_id: sale.user_id, sale_id: sale.id, recipient_phone: `+${digits}`, sender_id: sender || null, message, status: r.ok ? 'sent' : 'failed', provider_response: txt.slice(0, 1000) })
    }
  } catch (e) { console.error('[sms-template] erro:', e) }
}

const firstName = (n?: string | null) => (n || '').trim().split(/\s+/)[0] || 'Olá'

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: tok } = await supabase.from('app_settings').select('value').eq('key', 'wa_cron_token').maybeSingle()
  if (!tok?.value || req.headers.get('x-cron-token') !== tok.value) return json({ error: 'unauthorized' }, 401)
  if (!Deno.env.get('VISIONSPY_API_KEY') || !Deno.env.get('VISIONSPY_INSTANCE_ID')) {
    return json({ error: 'VisionSpy não configurado' }, 500)
  }

  const body = await req.json().catch(() => ({}))
  const cols = 'id, user_id, status, buyer_name, buyer_whatsapp, payment_phone, product_id, wa_approved_sent_at, wa_recovery_sent_at, products!sales_product_id_fkey(id, nome, delivery_type, external_url, file_url)'

  const sendApproved = async (sale: any) => {
    const to = toDigits(sale.buyer_whatsapp || sale.payment_phone)
    if (!to) return false
    const access = await resolveAccessUrl(supabase, sale.products)
    const msg = `${firstName(sale.buyer_name)}, o seu pagamento de *${sale.products?.nome || 'produto'}* foi confirmado! ✅\n\n` +
      (access ? `Aceda aqui: ${access}\n\n` : 'Enviámos o acesso para o seu email.\n\n') + 'Obrigado pela compra!'
    await sendTemplateSms(supabase, sale, 'approved', { nome: firstName(sale.buyer_name), produto: sale.products?.nome || '', link: access || '' })
    const ok = await send(to, msg)
    if (ok) await supabase.from('sales').update({ wa_approved_sent_at: new Date().toISOString() }).eq('id', sale.id)
    return ok
  }

  if (body.sale_id) {
    const { data: sale } = await supabase.from('sales').select(cols).eq('id', body.sale_id).maybeSingle()
    if (!sale || sale.status !== 'approved' || sale.wa_approved_sent_at) return json({ skipped: true })
    return json({ sent: await sendApproved(sale) })
  }

  // Recuperação: pendentes criados entre 15 min e 3 h atrás, ainda sem mensagem
  const now = Date.now()
  const { data: pend } = await supabase.from('sales').select(cols)
    .eq('status', 'pending').is('wa_recovery_sent_at', null)
    .lt('created_at', new Date(now - 15 * 60e3).toISOString())
    .gt('created_at', new Date(now - 3 * 3600e3).toISOString()).limit(50)
  let recovered = 0
  for (const s of pend || []) {
    const to = toDigits((s as any).buyer_whatsapp || (s as any).payment_phone)
    await supabase.from('sales').update({ wa_recovery_sent_at: new Date().toISOString() }).eq('id', (s as any).id)
    if (!to) continue
    const link = `${SITE}/checkout/${(s as any).product_id}`
    await sendTemplateSms(supabase, s, 'pending', { nome: firstName((s as any).buyer_name), produto: (s as any).products?.nome || '', link })
    if (await send(to, `${firstName((s as any).buyer_name)}, notámos que o seu pedido de *${(s as any).products?.nome || 'produto'}* ainda não foi pago. 😊\n\nFinalize aqui: ${link}\n\nSe precisar de ajuda, responda esta mensagem.`)) recovered++
  }

  // Reenvio de aprovadas que ficaram sem mensagem (últimas 3 h)
  const { data: missed } = await supabase.from('sales').select(cols)
    .eq('status', 'approved').is('wa_approved_sent_at', null)
    .gt('created_at', new Date(now - 3 * 3600e3).toISOString()).limit(50)
  let approved = 0
  for (const s of missed || []) if (await sendApproved(s)) approved++

  return json({ recovered, approved })
})
