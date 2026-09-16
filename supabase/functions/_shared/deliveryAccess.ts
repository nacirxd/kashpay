// Resolve o link de acesso a enviar no email de confirmação de compra.
// Para produtos entregues por link, usa o external_url.
// Para produtos entregues por ficheiro, gera um link assinado (bucket privado).

const SIGNED_URL_TTL = 60 * 60 * 24 * 30 // 30 dias

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveAccessUrl(supabase: any, product: any): Promise<string | undefined> {
  try {
    if (!product) return undefined
    const type = product.delivery_type
    if (type === 'link') return product.external_url || undefined
    if (type === 'file' && product.file_url) {
      const { data, error } = await supabase.storage
        .from('product-files')
        .createSignedUrl(product.file_url, SIGNED_URL_TTL)
      if (error) {
        console.error('[delivery] erro ao gerar link assinado:', error)
        return undefined
      }
      return data?.signedUrl || undefined
    }
    return undefined
  } catch (e) {
    console.error('[delivery] erro ao resolver acesso:', e)
    return undefined
  }
}
