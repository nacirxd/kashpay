// Cadastro de vendedor com código (OTP) enviado por WhatsApp via VisionSpy.
// { action: "send", phone } -> envia código
// { action: "register", nome, email, password, phone, code } -> valida código e cria conta já confirmada
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const API = 'https://visionspyads.com/api/public/v1/whatsapp/send'
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

function toDigits(raw?: string | null): string | null {
  if (!raw) return null
  const d = String(raw).replace(/\D/g, '')
  if (/^8[2-7]\d{7}$/.test(d)) return `258${d}`
  if (/^9\d{8}$/.test(d)) return `244${d}`
  if (/^(258|244)\d{9}$/.test(d)) return d
  return null
}

async function sha(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const body = await req.json().catch(() => ({}))
  const phone = toDigits(body.phone)
  if (!phone) return json({ error: 'Número de WhatsApp inválido (use número de Moçambique ou Angola)' }, 400)

  if (body.action === 'send') {
    const { count } = await supabase.from('phone_otps').select('id', { count: 'exact', head: true })
      .eq('phone', phone).gt('created_at', new Date(Date.now() - 10 * 60e3).toISOString())
    if ((count || 0) >= 3) return json({ error: 'Muitos pedidos. Aguarde alguns minutos.' }, 429)
    const code = String(Math.floor(100000 + Math.random() * 900000))
    await supabase.from('phone_otps').insert({ phone, code_hash: await sha(phone + code), expires_at: new Date(Date.now() + 10 * 60e3).toISOString() })
    const r = await fetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('VISIONSPY_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ instance_id: Deno.env.get('VISIONSPY_INSTANCE_ID'), to: phone, message: `O seu código KashPay é: *${code}*\n\nVálido por 10 minutos. Não partilhe com ninguém.` }),
    })
    if (!r.ok) { console.error('[otp] envio falhou', r.status, await r.text()); return json({ error: 'Não foi possível enviar o código no WhatsApp' }, 502) }
    return json({ sent: true })
  }

  if (body.action === 'register') {
    const nome = String(body.nome || '').trim().slice(0, 120)
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const code = String(body.code || '').trim()
    if (!nome || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6 || !/^\d{6}$/.test(code)) return json({ error: 'Dados inválidos' }, 400)

    const { data: otp } = await supabase.from('phone_otps').select('*').eq('phone', phone)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!otp || new Date(otp.expires_at).getTime() < Date.now()) return json({ error: 'Código expirado. Peça um novo.' }, 400)
    if (otp.attempts >= 5) return json({ error: 'Muitas tentativas. Peça um novo código.' }, 400)
    if (otp.code_hash !== await sha(phone + code)) {
      await supabase.from('phone_otps').update({ attempts: otp.attempts + 1 }).eq('id', otp.id)
      return json({ error: 'Código incorreto' }, 400)
    }

    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nome } })
    if (error) {
      const msg = /already|registered|exists/i.test(error.message) ? 'Este email já está em uso. Tente fazer login.' : error.message
      return json({ error: msg }, 400)
    }
    await supabase.from('phone_otps').delete().eq('phone', phone)
    await supabase.from('profiles').update({ telefone: `+${phone}` }).eq('user_id', data.user.id)
    return json({ ok: true })
  }

  return json({ error: 'Ação inválida' }, 400)
})
