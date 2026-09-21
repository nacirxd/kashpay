// Envio do evento Purchase para a Meta (Conversions API), por produto.
// Usa products.meta_pixel_id + products.meta_access_token.

async function hashSHA256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function sendMetaPurchase(
  supabase: any,
  sale: any,
  product?: { nome?: string; currency?: string; meta_pixel_id?: string | null; meta_access_token?: string | null } | null,
) {
  try {
    let pixelId = product?.meta_pixel_id?.toString().trim() || ''
    let accessToken = product?.meta_access_token?.toString().trim() || ''
    let nome = product?.nome
    let currency = product?.currency || 'MZN'

    if (!pixelId || !accessToken) {
      const { data } = await supabase
        .from('products')
        .select('nome, currency, meta_pixel_id, meta_access_token')
        .eq('id', sale.product_id)
        .maybeSingle()
      pixelId = (data?.meta_pixel_id || '').toString().trim()
      accessToken = (data?.meta_access_token || '').toString().trim()
      nome = nome || data?.nome
      currency = currency || data?.currency || 'MZN'
    }

    if (!pixelId || !accessToken) {
      console.log('[meta-capi] ignorado: produto sem pixel/token')
      return
    }

    const email = (sale.buyer_email || '').toString().trim().toLowerCase()
    const phone = (sale.payment_phone || sale.buyer_whatsapp || '').toString().replace(/\D/g, '')
    const firstName = (sale.buyer_name || '').toString().trim().toLowerCase().split(/\s+/)[0] || ''
    const eventTime = Math.floor(new Date(sale.created_at || Date.now()).getTime() / 1000)

    const resp = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name: 'Purchase',
          event_time: eventTime,
          event_id: sale.id,
          action_source: 'website',
          user_data: {
            em: email ? [await hashSHA256(email)] : [],
            ph: phone ? [await hashSHA256(phone)] : [],
            fn: firstName ? [await hashSHA256(firstName)] : [],
          },
          custom_data: {
            currency: currency === 'AOA' ? 'AOA' : 'MZN',
            value: Number(sale.valor),
            content_name: nome || 'Produto',
            content_ids: [sale.product_id],
            content_type: 'product',
          },
        }],
        access_token: accessToken,
      }),
    })
    console.log('[meta-capi]', pixelId, resp.status, await resp.text())
  } catch (e) {
    console.error('[meta-capi] erro:', e)
  }
}
