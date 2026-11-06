// Proteções partilhadas do checkout público.

const ALLOWED_HOSTS = new Set(['kashpay.shop', 'www.kashpay.shop', 'kashpay.lovable.app'])

/** Só aceita voltar para a página de checkout do próprio produto num domínio do KashPay. */
export function safeReturnUrl(raw: unknown, productId: string): string | null {
  if (typeof raw !== 'string') return null
  try {
    const u = new URL(raw)
    const hostOk = ALLOWED_HOSTS.has(u.hostname) || /^[a-z0-9-]+\.lovable\.app$/.test(u.hostname)
    if (u.protocol !== 'https:' || !hostOk) return null
    return `${u.origin}/checkout/${encodeURIComponent(productId)}`
  } catch {
    return null
  }
}

/** Token aleatório gerado pelo navegador do comprador para provar que a compra é dele. */
export function validBuyerToken(t: unknown): string | null {
  return typeof t === 'string' && /^[A-Za-z0-9-]{32,64}$/.test(t) ? t : null
}

/**
 * Evita pedidos de pagamento repetidos para o mesmo telemóvel:
 * no máximo 1 pedido pendente por minuto e 5 em 30 minutos.
 */
export async function phoneIsBusy(supabase: any, phone: string): Promise<boolean> {
  const digits = String(phone).replace(/\D/g, '')
  const last9 = digits.slice(-9)
  const variants = Array.from(new Set([phone, digits, last9, `258${last9}`, `+258${last9}`].filter(Boolean)))
  const now = Date.now()
  const { data } = await supabase
    .from('sales')
    .select('created_at, status')
    .in('payment_phone', variants)
    .gte('created_at', new Date(now - 30 * 60e3).toISOString())
    .limit(10)
  const rows = (data || []) as { created_at: string; status: string }[]
  if (rows.length >= 5) return true
  return rows.some((r) => r.status === 'pending' && now - new Date(r.created_at).getTime() < 60e3)
}

export function maskPhone(p: unknown): string {
  const s = String(p ?? '').replace(/\D/g, '')
  return s ? `***${s.slice(-3)}` : '(vazio)'
}

export function maskEmail(e: unknown): string {
  const s = String(e ?? '')
  const [u, d] = s.split('@')
  return d ? `${u.slice(0, 1)}***@${d}` : '(vazio)'
}
