// Entrega da(s) oferta(s) extra (order bump) por email, quando a venda é aprovada.
import { resolveAccessUrl } from './deliveryAccess.ts'
import { sendAppEmail } from './sendAppEmail.ts'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Supa = any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deliverOrderBump(supabase: Supa, sale: any, paymentMethod?: string) {
  try {
    // Lista de ofertas aceites (nova) ou oferta única (legado)
    const bumps: { id: string; valor: number }[] = Array.isArray(sale?.bumps) && sale.bumps.length
      ? sale.bumps
          .filter((b: { product_id?: string; valor?: number }) => b && b.product_id)
          .map((b: { product_id: string; valor?: number }) => ({
            id: b.product_id,
            valor: Number(b.valor || 0),
          }))
      : sale?.bump_product_id
        ? [{ id: sale.bump_product_id, valor: Number(sale.bump_valor || 0) }]
        : []

    if (!bumps.length) return
    if (!sale?.buyer_email) return

    for (const b of bumps) {
      const { data: bump } = await supabase
        .from('products')
        .select('nome, delivery_type, external_url, file_url, support_phone, support_email, currency')
        .eq('id', b.id)
        .maybeSingle()

      if (!bump) continue

      const accessUrl = await resolveAccessUrl(supabase, bump)

      const currency = bump.currency || 'MZN'
      const amountStr = `${Number(b.valor || 0).toLocaleString('pt-PT')} ${currency === 'AOA' ? 'Kz' : 'MT'}`

      await sendAppEmail(supabase, 'purchase-confirmation', sale.buyer_email, {
            templateData: {
          buyerName: sale.buyer_name || undefined,
          productName: bump.nome || 'Oferta extra',
          amount: amountStr,
          paymentMethod: paymentMethod || sale.payment_method || undefined,
          accessUrl: accessUrl,
          accessType: bump.delivery_type,
          sellerEmail: bump.support_email || undefined,
          sellerWhatsapp: bump.support_phone || undefined,
        },
            idempotencyKey: `purchase-confirm-bump-${sale.id}-${b.id}`,
          })
      console.log('[order-bump] email da oferta extra enviado', sale.id, b.id)
    }
  } catch (e) {
    console.error('[order-bump] erro ao entregar oferta extra:', e)
  }
}
