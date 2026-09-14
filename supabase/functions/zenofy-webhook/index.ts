const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendUtmifyOrder } from '../_shared/utmify.ts'
import { deliverOrderBump } from '../_shared/orderBump.ts'

/**
 * Webhook chamado pela Zenofy.
 * Eventos: payment.succeeded | payment.refunded | payment.chargeback
 * Payload (exemplo): { event, checkout_id, amount, customer: {...}, reference }
 * Assinatura opcional: header X-Signature (HMAC sha256 do corpo com ZENOFY_WEBHOOK_SECRET)
 */

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const raw = await req.text()
    console.log('[zenofy-webhook] payload:', raw)

    const secret = Deno.env.get('ZENOFY_WEBHOOK_SECRET')
    if (secret) {
      const provided = (req.headers.get('x-signature') || '').replace(/^sha256=/, '').trim()
      const expected = await hmacSha256Hex(secret, raw)
      if (provided.toLowerCase() !== expected.toLowerCase()) {
        console.warn('[zenofy-webhook] assinatura inválida')
        return json({ ok: false, error: 'invalid signature' }, 401)
      }
    }

    const body = JSON.parse(raw || '{}')
    const event = String(body?.event || body?.type || '').toLowerCase()
    const checkoutId = body?.checkout_id || body?.checkoutId || body?.data?.checkout_id || body?.data?.id
    const reference = body?.reference || body?.metadata?.sale_id || body?.data?.reference

    const map: Record<string, string> = {
      'payment.succeeded': 'approved',
      'payment.refunded': 'refunded',
      'payment.chargeback': 'chargeback',
      'payment.failed': 'failed',
    }
    const newStatus = map[event]
    if (!newStatus) {
      console.log('[zenofy-webhook] evento ignorado:', event)
      return json({ ok: true, ignored: true })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const cols = 'id, status, user_id, valor, product_id, bump_product_id, bump_valor, buyer_email, buyer_name, buyer_whatsapp, payment_phone, payment_method, created_at, utm_source, utm_medium, utm_campaign, utm_content'
    let sale: any = null
    if (checkoutId) {
      const { data } = await supabase.from('sales').select(cols).eq('zenofy_checkout_id', String(checkoutId)).maybeSingle()
      sale = data
    }
    if (!sale && reference && /^[0-9a-f-]{36}$/i.test(String(reference))) {
      const { data } = await supabase.from('sales').select(cols).eq('id', String(reference)).maybeSingle()
      sale = data
    }

    if (!sale) {
      console.warn('[zenofy-webhook] venda não encontrada. checkoutId=', checkoutId, 'ref=', reference)
      return json({ ok: true, ignored: true })
    }

    if (sale.status === newStatus) return json({ ok: true, idempotent: true })

    await supabase.from('sales').update({ status: newStatus }).eq('id', sale.id)
    console.log(`[zenofy-webhook] sale ${sale.id} → ${newStatus}`)

    if (newStatus === 'approved') {
      await deliverOrderBump(supabase, sale, 'zenofy')
      try {
        const { data: productData } = await supabase
          .from('products')
          .select('nome, delivery_type, external_url, support_phone, support_email, currency')
          .eq('id', sale.product_id)
          .maybeSingle()

        const { data: sellerProfile } = await supabase
          .from('profiles')
          .select('nome, email, telefone')
          .eq('user_id', sale.user_id)
          .maybeSingle()

        const currency = productData?.currency || 'MZN'
        const amountStr = `${Number(sale.valor).toLocaleString('pt-PT')} ${currency === 'AOA' ? 'Kz' : 'MT'}`

        if (sale.buyer_email) {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'purchase-confirmation',
              recipientEmail: sale.buyer_email,
              idempotencyKey: `purchase-confirm-${sale.id}`,
              templateData: {
                buyerName: sale.buyer_name,
                productName: productData?.nome || 'Produto',
                amount: amountStr,
                paymentMethod: 'zenofy',
                accessUrl: productData?.delivery_type === 'link' ? productData?.external_url : undefined,
                accessType: productData?.delivery_type,
                sellerName: sellerProfile?.nome || undefined,
                sellerEmail: productData?.support_email || sellerProfile?.email || undefined,
                sellerWhatsapp: productData?.support_phone || sellerProfile?.telefone || undefined,
              },
            },
          })
        }

        if (sellerProfile?.email) {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'sale-notification',
              recipientEmail: sellerProfile.email,
              idempotencyKey: `sale-notify-${sale.id}`,
              templateData: {
                sellerName: sellerProfile.nome || undefined,
                productName: productData?.nome || 'Produto',
                amount: amountStr,
                buyerName: sale.buyer_name || undefined,
                buyerEmail: sale.buyer_email || undefined,
                paymentMethod: 'zenofy',
              },
            },
          })
        }
      } catch (e) {
        console.error('[zenofy-webhook] erro emails:', e)
      }

      try {
        const { data: prod } = await supabase
          .from('products').select('nome, currency').eq('id', sale.product_id).maybeSingle()
        await sendUtmifyOrder(supabase, sale, prod as any, 'zenofy')
      } catch (e) {
        console.error('[zenofy-webhook] erro utmify:', e)
      }
    }

    return json({ ok: true, status: newStatus })
  } catch (err) {
    console.error('[zenofy-webhook] erro:', err)
    return json({ ok: false, error: (err as Error).message })
  }
})
