const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { deliverOrderBump } from '../_shared/orderBump.ts'
import { resolveAccessUrl } from '../_shared/deliveryAccess.ts'
import { sendAppEmail } from '../_shared/sendAppEmail.ts'

/**
 * Webhook chamado pela Kumbify quando o status do pagamento muda.
 * Payload esperado:
 * {
 *   merchantTransactionId: string,
 *   externalTransactionId: string,
 *   status: "pending" | "completed" | "cancelled" | "failed",
 *   code: number
 * }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Autenticação do webhook: segredo compartilhado (header ou query ?secret=)
    const expectedSecret = Deno.env.get('KUMBIFY_WEBHOOK_SECRET') || ''
    const url = new URL(req.url)
    const providedSecret =
      req.headers.get('x-webhook-secret') ||
      req.headers.get('x-kumbify-secret') ||
      url.searchParams.get('secret') ||
      ''
    if (!expectedSecret || providedSecret !== expectedSecret) {
      console.warn('[kumbify-webhook] pedido rejeitado: segredo inválido')
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({} as any))
    console.log('[kumbify-webhook] payload:', JSON.stringify(body))

    const externalId = body?.externalTransactionId
    const merchantId = body?.merchantTransactionId
    const status = String(body?.status || '').toLowerCase()

    if (!externalId && !merchantId) {
      return new Response(JSON.stringify({ ok: false, error: 'IDs em falta' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const map: Record<string, string> = {
      completed: 'approved',
      pending: 'pending',
      cancelled: 'cancelled',
      failed: 'failed',
    }
    const newStatus = map[status] || 'pending'

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Localiza a venda por external_transaction_id
    const { data: sale } = await supabase
      .from('sales')
      .select('id, status, user_id, valor, product_id, buyer_email, buyer_name, payment_method, bump_product_id, bump_valor')
      .eq('external_transaction_id', externalId)
      .maybeSingle()

    if (!sale) {
      console.warn('[kumbify-webhook] venda não encontrada para externalId=', externalId)
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Idempotência: se já está approved, não muda
    if (sale.status === 'approved') {
      return new Response(JSON.stringify({ ok: true, idempotent: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase.from('sales').update({ status: newStatus }).eq('id', sale.id)
    console.log(`[kumbify-webhook] sale ${sale.id} → ${newStatus}`)

    // Se aprovou, dispara emails de confirmação (compra + notificação ao vendedor)
    if (newStatus === 'approved') {
      await deliverOrderBump(supabase, sale, sale.payment_method)
      try {
        const { data: productData } = await supabase
          .from('products')
          .select('nome, delivery_type, external_url, file_url, support_phone, support_email, currency')
          .eq('id', sale.product_id)
          .maybeSingle()

        const { data: sellerProfile } = await supabase
          .from('profiles')
          .select('nome, email, telefone')
          .eq('user_id', sale.user_id)
          .maybeSingle()

        const currency = productData?.currency || 'AOA'
        const amountStr = `${Number(sale.valor).toLocaleString('pt-PT')} ${currency === 'AOA' ? 'Kz' : 'MT'}`

        if (sale.buyer_email) {
          await sendAppEmail(supabase, 'purchase-confirmation', sale.buyer_email, {
            templateData: {
                buyerName: sale.buyer_name,
                productName: productData?.nome || 'Produto',
                amount: amountStr,
                paymentMethod: sale.payment_method,
                accessUrl: await resolveAccessUrl(supabase, productData),
                accessType: productData?.delivery_type,
                sellerName: sellerProfile?.nome || undefined,
                sellerEmail: productData?.support_email || sellerProfile?.email || undefined,
                sellerWhatsapp: productData?.support_phone || sellerProfile?.telefone || undefined,
              },
            idempotencyKey: `purchase-confirm-${sale.id}`,
          })
        }

        if (sellerProfile?.email) {
          await sendAppEmail(supabase, 'sale-notification', sellerProfile.email, {
            templateData: {
                sellerName: sellerProfile.nome || undefined,
                productName: productData?.nome || 'Produto',
                amount: amountStr,
                buyerName: sale.buyer_name || undefined,
                buyerEmail: sale.buyer_email || undefined,
                paymentMethod: sale.payment_method,
              },
            idempotencyKey: `sale-notify-${sale.id}`,
          })
        }
      } catch (e) {
        console.error('[kumbify-webhook] erro emails:', e)
      }
    }

    return new Response(JSON.stringify({ ok: true, status: newStatus }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[kumbify-webhook] erro:', err)
    // Mesmo em erro respondemos 200 para evitar reintents repetidos; logamos e investigamos.
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})