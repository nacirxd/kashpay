// Envio de venda aprovada para a UTMify (integração por vendedor)
const EXCHANGE_RATE_URL = 'https://open.er-api.com/v6/latest/MZN'

async function convertToBrlCents(amount: number, currency: string) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const base = currency === 'AOA' ? 'AOA' : 'MZN'
    const url = base === 'MZN' ? EXCHANGE_RATE_URL : `https://open.er-api.com/v6/latest/${base}`
    const resp = await fetch(url, { signal: ctrl.signal })
    const data = await resp.json()
    const rate = Number(data?.rates?.BRL)
    if (!resp.ok || !Number.isFinite(rate) || rate <= 0) throw new Error('Falha na cotação BRL')
    return Math.round(amount * rate * 100)
  } finally {
    clearTimeout(t)
  }
}

export async function sendUtmifyOrder(
  supabase: any,
  sale: any,
  product: { id?: string; nome?: string; currency?: string } | null,
  paymentMethod: string,
) {
  try {
    const { data: integration } = await supabase
      .from('integrations')
      .select('config, ativo')
      .eq('user_id', sale.user_id)
      .eq('tipo', 'utmify')
      .eq('ativo', true)
      .maybeSingle()

    const config = (integration as any)?.config
    const apiToken = config?.api_token || config?.token
    if (!apiToken) {
      console.log('[utmify] ignorado: integração inativa ou sem token')
      return
    }
    if (!sale.buyer_name || !sale.buyer_email) {
      console.log('[utmify] ignorado: nome/email do comprador em falta')
      return
    }

    const cents = await convertToBrlCents(Number(sale.valor), product?.currency || 'MZN')
    const nowIso = new Date().toISOString()

    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 10000)
    try {
      const resp = await fetch('https://api.utmify.com.br/api-credentials/orders', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'x-api-token': apiToken },
        body: JSON.stringify({
          orderId: sale.id,
          platform: 'KashPay',
          paymentMethod: 'unknown',
          status: 'paid',
          createdAt: sale.created_at || nowIso,
          approvedDate: nowIso,
          customer: {
            name: sale.buyer_name,
            email: sale.buyer_email,
            phone: sale.payment_phone || sale.buyer_whatsapp || null,
            document: null,
          },
          products: [{
            id: sale.product_id,
            name: product?.nome || sale.product_id,
            planId: sale.product_id,
            planName: product?.nome || 'Produto digital',
            quantity: 1,
            priceInCents: cents,
          }],
          trackingParameters: {
            src: sale.utm_source || null,
            utm_source: sale.utm_source || null,
            utm_medium: sale.utm_medium || null,
            utm_campaign: sale.utm_campaign || null,
            utm_content: sale.utm_content || null,
            utm_term: null,
          },
          commission: {
            totalPriceInCents: cents,
            gatewayFeeInCents: 0,
            userCommissionInCents: cents,
            currency: 'BRL',
          },
        }),
      })
      console.log('[utmify] status', resp.status, await resp.text())
    } finally {
      clearTimeout(t)
    }
  } catch (e) {
    console.error('[utmify] erro:', e)
  }
}
