// Entrega da oferta extra (order bump) por email, quando a venda é aprovada.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Supa = any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deliverOrderBump(supabase: Supa, sale: any, paymentMethod?: string) {
  try {
    const bumpId = sale?.bump_product_id
    if (!bumpId) return
    if (!sale?.buyer_email) return

    const { data: bump } = await supabase
      .from('products')
      .select('nome, delivery_type, external_url, support_phone, support_email, currency')
      .eq('id', bumpId)
      .maybeSingle()

    if (!bump) return

    const currency = bump.currency || 'MZN'
    const amountStr = `${Number(sale.bump_valor || 0).toLocaleString('pt-PT')} ${currency === 'AOA' ? 'Kz' : 'MT'}`

    await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'purchase-confirmation',
        recipientEmail: sale.buyer_email,
        idempotencyKey: `purchase-confirm-bump-${sale.id}`,
        templateData: {
          buyerName: sale.buyer_name || undefined,
          productName: bump.nome || 'Oferta extra',
          amount: amountStr,
          paymentMethod: paymentMethod || sale.payment_method || undefined,
          accessUrl: bump.delivery_type === 'link' ? bump.external_url : undefined,
          accessType: bump.delivery_type,
          sellerEmail: bump.support_email || undefined,
          sellerWhatsapp: bump.support_phone || undefined,
        },
      },
    })
    console.log('[order-bump] email da oferta extra enviado', sale.id, bumpId)
  } catch (e) {
    console.error('[order-bump] erro ao entregar oferta extra:', e)
  }
}
