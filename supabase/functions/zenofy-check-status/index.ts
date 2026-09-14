const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendUtmifyOrder } from '../_shared/utmify.ts'

const ZENOFY_BASE = 'https://api.zenofy.io'
const DEFAULT_SMS_WEBHOOK_URL = 'https://zenofyetsembasms.online/api/public/tsemba/webhook'

type Supa = ReturnType<typeof createClient>

const PAID = ['paid', 'succeeded', 'success', 'approved', 'completed', 'complete']
const FAILED = ['failed', 'cancelled', 'canceled', 'expired', 'rejected']

async function fetchZenofyStatus(orderId: string, apiKey: string) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 15000)
  try {
    const resp = await fetch(`${ZENOFY_BASE}/checkout/order-status?orderId=${encodeURIComponent(orderId)}`, {
      signal: ctrl.signal,
      headers: { 'Api-Key': apiKey, 'Accept': 'application/json' },
    })
    const data = await resp.json().catch(() => ({}))
    console.log('[zenofy-status]', orderId, resp.status, JSON.stringify(data))
    if (!resp.ok) return null
    const raw = String((data as any)?.status || '').toLowerCase()
    if (PAID.includes(raw)) return 'approved'
    if (FAILED.includes(raw)) return 'failed'
    return 'pending'
  } catch (e) {
    console.error('[zenofy-status] erro', orderId, e)
    return null
  } finally {
    clearTimeout(t)
  }
}

async function postJson(url: string, payload: unknown, ms = 10000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const resp = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    console.log('[zenofy-status] POST', url, resp.status)
    return resp.ok
  } catch (e) {
    console.error('[zenofy-status] POST falhou', url, e)
    return false
  } finally {
    clearTimeout(t)
  }
}

async function approveSale(supabase: Supa, sale: any) {
  await supabase.from('sales').update({ status: 'approved' }).eq('id', sale.id)
  console.log('[zenofy-status] venda aprovada', sale.id)

  const { data: product } = await supabase
    .from('products')
    .select('nome, delivery_type, external_url, support_phone, support_email, currency, webhook_url')
    .eq('id', sale.product_id)
    .maybeSingle()

  const { data: seller } = await supabase
    .from('profiles')
    .select('nome, email, telefone')
    .eq('user_id', sale.user_id)
    .maybeSingle()

  const currency = (product as any)?.currency || 'MZN'
  const amountStr = `${Number(sale.valor).toLocaleString('pt-PT')} ${currency === 'AOA' ? 'Kz' : 'MT'}`

  try {
    if (sale.buyer_email) {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'purchase-confirmation',
          recipientEmail: sale.buyer_email,
          idempotencyKey: `purchase-confirm-${sale.id}`,
          templateData: {
            buyerName: sale.buyer_name,
            productName: (product as any)?.nome || 'Produto',
            amount: amountStr,
            paymentMethod: 'zenofy',
            accessUrl: (product as any)?.delivery_type === 'link' ? (product as any)?.external_url : undefined,
            accessType: (product as any)?.delivery_type,
            sellerName: (seller as any)?.nome || undefined,
            sellerEmail: (product as any)?.support_email || (seller as any)?.email || undefined,
            sellerWhatsapp: (product as any)?.support_phone || (seller as any)?.telefone || undefined,
          },
        },
      })
    }

    if ((seller as any)?.email) {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'sale-notification',
          recipientEmail: (seller as any).email,
          idempotencyKey: `sale-notify-${sale.id}`,
          templateData: {
            sellerName: (seller as any)?.nome || undefined,
            productName: (product as any)?.nome || 'Produto',
            amount: amountStr,
            buyerName: sale.buyer_name || undefined,
            buyerEmail: sale.buyer_email || undefined,
            paymentMethod: 'zenofy',
          },
        },
      })
    }
  } catch (e) {
    console.error('[zenofy-status] erro emails:', e)
  }

  // Aviso ao sistema de SMS
  try {
    const { data: smsSetting } = await supabase
      .from('app_settings').select('value').eq('key', 'sms_webhook_url').maybeSingle()
    const smsUrl = ((smsSetting as any)?.value || '').toString().trim() || DEFAULT_SMS_WEBHOOK_URL
    if (/^https?:\/\//.test(smsUrl)) {
      await postJson(smsUrl, {
        event: 'sale.approved',
        sale_id: sale.id,
        product_id: sale.product_id,
        product_name: (product as any)?.nome || null,
        seller_id: sale.user_id,
        amount: Number(sale.valor),
        currency,
        payment_method: 'zenofy',
        buyer_name: sale.buyer_name || null,
        buyer_email: sale.buyer_email || null,
        buyer_phone: sale.payment_phone || sale.buyer_whatsapp || null,
        support_phone: (product as any)?.support_phone || null,
        created_at: new Date().toISOString(),
      })
    }
  } catch (e) {
    console.error('[zenofy-status] erro SMS:', e)
  }

  // UTMify
  await sendUtmifyOrder(supabase, sale, product as any, 'zenofy')

  // Webhook do produto
  try {
    const productWebhook = (product as any)?.webhook_url?.toString().trim()
    if (productWebhook && /^https?:\/\//.test(productWebhook)) {
      await postJson(productWebhook, {
        event: 'sale.created',
        sale: sale,
        product_id: sale.product_id,
        payment_method: 'zenofy',
        status: 'approved',
      }, 8000)
    }
  } catch (e) {
    console.error('[zenofy-status] erro webhook produto:', e)
  }
}

const COLS = 'id, status, user_id, valor, product_id, buyer_email, buyer_name, buyer_whatsapp, payment_phone, zenofy_checkout_id, created_at, utm_source, utm_medium, utm_campaign, utm_content'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const apiKey = Deno.env.get('ZENOFY_API_KEY')
    if (!apiKey) return json({ error: 'ZENOFY_API_KEY não configurado' }, 500)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json().catch(() => ({}))
    const saleId = (body as any)?.sale_id
    const reconcile = Boolean((body as any)?.reconcile) || !saleId

    let sales: any[] = []
    if (saleId) {
      const { data } = await supabase.from('sales').select(COLS).eq('id', String(saleId)).maybeSingle()
      if (!data) return json({ error: 'Venda não encontrada' }, 404)
      sales = [data]
    } else if (reconcile) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('sales').select(COLS)
        .eq('gateway', 'zenofy').eq('status', 'pending')
        .gte('created_at', since)
        .not('zenofy_checkout_id', 'is', null)
        .limit(50)
      sales = data || []
    }

    const results: any[] = []
    for (const sale of sales) {
      if (sale.status === 'approved') {
        results.push({ sale_id: sale.id, status: 'approved' })
        continue
      }
      if (!sale.zenofy_checkout_id) {
        results.push({ sale_id: sale.id, status: sale.status })
        continue
      }
      const remote = await fetchZenofyStatus(String(sale.zenofy_checkout_id), apiKey)
      if (remote === 'approved') {
        await approveSale(supabase, sale)
        results.push({ sale_id: sale.id, status: 'approved' })
      } else if (remote === 'failed' && sale.status === 'pending') {
        await supabase.from('sales').update({ status: 'failed' }).eq('id', sale.id)
        results.push({ sale_id: sale.id, status: 'failed' })
      } else if (
        remote === 'pending' && sale.status === 'pending' &&
        Date.now() - new Date(sale.created_at).getTime() > 3 * 60 * 60 * 1000
      ) {
        // Passadas 3 horas sem pagamento, a venda é considerada falhada
        await supabase.from('sales').update({ status: 'failed' }).eq('id', sale.id)
        results.push({ sale_id: sale.id, status: 'failed' })
      } else {
        results.push({ sale_id: sale.id, status: sale.status })
      }

    }

    if (saleId) {
      return json({ ok: true, sale_id: saleId, status: results[0]?.status || 'pending' })
    }
    return json({ ok: true, checked: sales.length, results })
  } catch (err) {
    console.error('[zenofy-check-status] erro:', err)
    return json({ ok: false, error: (err as Error).message }, 500)
  }
})
