/**
 * Preço autoritativo calculado no servidor.
 * NUNCA confiar no valor enviado pelo browser.
 */
export type ResolvedPrice = {
  error?: string
  total: number
  bumpProductId: string | null
  bumpValor: number | null
  sellerId: string
  currency: string
  productName: string
}

export async function resolvePrice(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  productId: string,
  requestedBumpId?: string | null,
): Promise<ResolvedPrice> {
  const empty = {
    total: 0,
    bumpProductId: null,
    bumpValor: null,
    sellerId: '',
    currency: 'MZN',
    productName: '',
  }

  const { data: product } = await supabase
    .from('products')
    .select('id, user_id, nome, preco, currency, order_bump_product_id, order_bump_price')
    .eq('id', productId)
    .maybeSingle()

  if (!product) return { ...empty, error: 'Produto não encontrado' }

  const base = Number(product.preco)
  if (!Number.isFinite(base) || base <= 0) {
    return { ...empty, error: 'Produto com preço inválido' }
  }

  let bumpProductId: string | null = null
  let bumpValor: number | null = null

  if (requestedBumpId) {
    if (product.order_bump_product_id !== requestedBumpId) {
      return { ...empty, error: 'Oferta extra inválida' }
    }
    const { data: bump } = await supabase
      .from('products')
      .select('id, preco')
      .eq('id', requestedBumpId)
      .maybeSingle()
    if (!bump) return { ...empty, error: 'Oferta extra inválida' }

    const promo = product.order_bump_price
    const value = promo != null ? Number(promo) : Number(bump.preco)
    if (!Number.isFinite(value) || value < 0) {
      return { ...empty, error: 'Oferta extra com preço inválido' }
    }
    bumpProductId = requestedBumpId
    bumpValor = Math.round(value * 100) / 100
  }

  return {
    total: Math.round((base + (bumpValor ?? 0)) * 100) / 100,
    bumpProductId,
    bumpValor,
    sellerId: product.user_id,
    currency: product.currency || 'MZN',
    productName: product.nome || '',
  }
}
