const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const KUMBIFY_BASE = 'https://kumbify-payment-api-production.up.railway.app/api'

// In-memory JWT cache (per isolate)
let cachedJwt: { token: string; exp: number } | null = null

async function getKumbifyJwt(apiKey: string): Promise<string> {
  const now = Date.now()
  if (cachedJwt && cachedJwt.exp - 60_000 > now) return cachedJwt.token

  const resp = await fetch(`${KUMBIFY_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok || !data?.token) {
    throw new Error(`Falha autenticando Kumbify [${resp.status}]: ${JSON.stringify(data)}`)
  }
  // ~50min validade — guardamos 45min
  cachedJwt = { token: data.token, exp: now + 45 * 60 * 1000 }
  return data.token
}

function normalizePhoneAO(raw: string): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  // Remover 244 (código Angola) se vier com prefixo
  const local = digits.startsWith('244') && digits.length === 12 ? digits.slice(3) : digits
  if (/^9\d{8}$/.test(local)) return local
  return null
}

function genMerchantId(saleId: string): string {
  // Máx 15 chars alfanuméricos. Usamos prefixo 'A' + base36 do timestamp + 6 chars do sale id
  const ts = Date.now().toString(36).toUpperCase()
  const tail = saleId.replace(/-/g, '').slice(0, 14 - ts.length).toUpperCase()
  return ('A' + ts + tail).slice(0, 15)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('KUMBIFY_API_CLIENT_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'KUMBIFY_API_CLIENT_KEY não configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { method, phone, amount, product_id, user_id, name, email, whatsapp, bump_product_id, bump_valor, utm_source, utm_medium, utm_campaign, utm_content } = body

    if (!method || !amount || !product_id || !user_id) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios em falta' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const kMethod = method === 'mcx' ? 'GPO' : method === 'ref' ? 'REF' : null
    if (!kMethod) {
      return new Response(JSON.stringify({ error: 'Método inválido (use mcx ou ref)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let phoneAo: string | null = null
    if (kMethod === 'GPO') {
      phoneAo = normalizePhoneAO(phone || '')
      if (!phoneAo) {
        return new Response(JSON.stringify({
          error: 'Telefone inválido para Multicaixa Express. Use formato 9XXXXXXXX.',
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const amountNumber = Number(amount)

    // 1) Cria venda como pending
    const { data: saleData, error: saleErr } = await supabase.from('sales').insert({
      product_id,
      user_id,
      valor: amountNumber,
      status: 'pending',
      buyer_name: name || null,
      buyer_email: email || null,
      buyer_whatsapp: whatsapp || null,
      payment_method: method,
      payment_phone: phoneAo || null,
      gateway: 'kumbify',
      bump_product_id: bump_product_id || null,
      bump_valor: bump_valor != null ? Number(bump_valor) : null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
    }).select().single()

    if (saleErr || !saleData) {
      console.error('Erro criando venda:', saleErr)
      return new Response(JSON.stringify({ error: 'Erro registando venda' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: productData } = await supabase
      .from('products')
      .select('id, nome')
      .eq('id', product_id)
      .maybeSingle()

    // 2) Autentica + cria pagamento
    const jwt = await getKumbifyJwt(apiKey)
    const merchantTransactionId = genMerchantId(saleData.id)

    const payload: Record<string, unknown> = {
      amount: amountNumber,
      method: kMethod,
      description: (productData?.nome || 'Compra').slice(0, 80),
      merchantTransactionId,
    }
    if (kMethod === 'GPO') payload.phone_num = phoneAo

    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 25000)

    let payResp: Response
    try {
      payResp = await fetch(`${KUMBIFY_BASE}/pay4all/create-payment`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify(payload),
      })
    } finally { clearTimeout(t) }

    const payData = await payResp.json().catch(() => ({}))
    console.log(`[kumbify] ${kMethod} status=${payResp.status} body=`, JSON.stringify(payData))

    if (!payResp.ok) {
      await supabase.from('sales').update({ status: 'failed' }).eq('id', saleData.id)
      return new Response(JSON.stringify({
        success: false,
        error: payData?.message || payData?.error || 'Falha ao criar pagamento na Kumbify',
        details: payData,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3) Guarda dados do gateway na venda
    const update: Record<string, unknown> = {
      external_transaction_id: payData.externalTransactionId || merchantTransactionId,
    }
    // Kumbify retorna referência em payData.reference = { number, entity, amount }
    // ou em payData.data.responseStatus.reference = { referenceNumber, entity, dueDate }
    const refObj = payData?.reference || payData?.data?.responseStatus?.reference || null
    const entity = refObj?.entity || null
    const reference = refObj?.number || refObj?.referenceNumber || null
    const externalTxId = payData?.externalTransactionId || payData?.transaction_id || payData?.data?.id || merchantTransactionId
    update.external_transaction_id = externalTxId
    if (kMethod === 'REF') {
      update.mcx_entity = entity
      update.mcx_reference = reference
    }
    await supabase.from('sales').update(update).eq('id', saleData.id)

    return new Response(JSON.stringify({
      success: true,
      sale_id: saleData.id,
      method: kMethod,
      merchantTransactionId,
      externalTransactionId: externalTxId,
      entity,
      reference,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('kumbify-create-payment error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})