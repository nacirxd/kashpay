/**
 * Preço autoritativo calculado no servidor.
 * NUNCA confiar no valor enviado pelo browser.
 */
export type ResolvedBump = { id: string; valor: number }

export type ResolvedPrice = {
  error?: string
  total: number
  bumpProductId: string | null
  bumpValor: number | null
  bumps: ResolvedBump[]
  sellerId: string
  currency: string
  productName: string
}

export async function resolvePrice(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  productId: string,
  requestedBumpIds?: string | (string | null | undefined)[] | null,
): Promise<ResolvedPrice> {
  const empty = {
    total: 0,
    bumpProductId: null,
    bumpValor: null,
    bumps: [] as ResolvedBump[],
    sellerId: '',
    currency: 'MZN',
    productName: '',
  }

  const { data: product } = await supabase
    .from('products')
    .select('id, user_id, nome, preco, currency, order_bump_product_id, order_bump_price, order_bumps')
    .eq('id', productId)
    .maybeSingle()

  if (!product) return { ...empty, error: 'Produto não encontrado' }

  const base = Number(product.preco)
  if (!Number.isFinite(base) || base <= 0) {
    return { ...empty, error: 'Produto com preço inválido' }
  }

  // Ofertas extra configuradas no produto: lista nova (order_bumps) + legado (colunas únicas)
  const offers = new Map<string, number | null>()
  if (Array.isArray(product.order_bumps)) {
    for (const o of product.order_bumps) {
      if (o && typeof o.product_id === 'string' && o.product_id) {
        offers.set(o.product_id, o.price != null ? Number(o.price) : null)
      }
    }
  }
  if (product.order_bump_product_id && !offers.has(product.order_bump_product_id)) {
    offers.set(
      product.order_bump_product_id,
      product.order_bump_price != null ? Number(product.order_bump_price) : null,
    )
  }

  const requested: string[] = Array.isArray(requestedBumpIds)
    ? requestedBumpIds.filter((x): x is string => typeof x === 'string' && !!x)
    : requestedBumpIds
      ? [requestedBumpIds]
      : []

  const uniqueRequested = [...new Set(requested)]
  const bumps: ResolvedBump[] = []

  for (const bumpId of uniqueRequested) {
    if (!offers.has(bumpId)) {
      return { ...empty, error: 'Oferta extra inválida' }
    }
    const { data: bump } = await supabase
      .from('products')
      .select('id, preco')
      .eq('id', bumpId)
      .maybeSingle()
    if (!bump) return { ...empty, error: 'Oferta extra inválida' }

    const promo = offers.get(bumpId)
    const value = promo != null ? promo : Number(bump.preco)
    if (!Number.isFinite(value) || value < 0) {
      return { ...empty, error: 'Oferta extra com preço inválido' }
    }
    bumps.push({ id: bumpId, valor: Math.round(value * 100) / 100 })
  }

  const bumpSum = bumps.reduce((s, b) => s + b.valor, 0)

  return {
    total: Math.round((base + bumpSum) * 100) / 100,
    bumpProductId: bumps[0]?.id ?? null,
    bumpValor: bumps.length ? Math.round(bumpSum * 100) / 100 : null,
    bumps,
    sellerId: product.user_id,
    currency: product.currency || 'MZN',
    productName: product.nome || '',
  }
}
