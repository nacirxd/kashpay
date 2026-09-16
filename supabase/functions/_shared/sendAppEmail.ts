// Envio de emails da aplicação através da entrega gerida pela Lovable.
// Mantém o histórico em email_send_log (apenas registo — nunca decide o envio).
import { sendTemplateEmail } from './transactional-email-templates/send-email.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Supa = any

export interface SendAppEmailOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templateData?: Record<string, any>
  idempotencyKey?: string
  replyTo?: string
}

async function logSend(
  supabase: Supa,
  templateName: string,
  recipient: string,
  status: 'sent' | 'suppressed' | 'failed',
  errorMessage?: string,
) {
  const { error } = await supabase.from('email_send_log').insert({
    template_name: templateName,
    recipient_email: recipient,
    status,
    error_message: errorMessage ? errorMessage.slice(0, 1000) : null,
  })
  if (error) {
    console.error('[email] falha ao registar envio no histórico', {
      code: error.code,
      message: error.message,
      templateName,
      status,
    })
  }
}

export async function sendAppEmail(
  supabase: Supa,
  templateName: string,
  recipientEmail: string,
  options: SendAppEmailOptions = {},
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const result = await sendTemplateEmail(templateName, recipientEmail, options)
    if (result.sent) {
      await logSend(supabase, templateName, recipientEmail, 'sent')
      return { sent: true }
    }
    await logSend(supabase, templateName, recipientEmail, 'suppressed')
    return { sent: false, reason: result.reason }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await logSend(supabase, templateName, recipientEmail, 'failed', msg)
    throw error
  }
}
