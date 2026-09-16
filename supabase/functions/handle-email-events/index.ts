import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const REASON_MESSAGE: Record<string, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

const REASON_STATUS: Record<string, 'bounced' | 'complained' | 'suppressed'> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}

function client() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Missing Supabase configuration')
  return createClient(url, key)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function record(event: any, reason: 'bounce' | 'complaint' | 'unsubscribe') {
  const recipient: string | undefined = event?.data?.recipient
  if (!recipient) {
    console.warn('Email event without recipient', { event_id: event?.event_id })
    return
  }
  const supabase = client()
  const email = recipient.toLowerCase()

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: null }, { onConflict: 'email' })

  if (suppressError) {
    console.error('Failed to upsert suppressed email', {
      code: suppressError.code,
      message: suppressError.message,
      event_id: event?.event_id,
    })
    throw new Error('Failed to write suppression')
  }

  const { error: logError } = await supabase.from('email_send_log').insert({
    message_id: event?.data?.message_id ?? null,
    template_name: 'system',
    recipient_email: email,
    status: REASON_STATUS[reason],
    error_message: REASON_MESSAGE[reason],
    metadata: null,
  })

  if (logError) {
    console.warn('Failed to insert email_send_log', {
      code: logError.code,
      message: logError.message,
      event_id: event?.event_id,
    })
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await record(event, 'bounce')
    },
    'email.complaint': async (event) => {
      await record(event, 'complaint')
    },
    'email.unsubscribed': async (event) => {
      await record(event, 'unsubscribe')
    },
  },
})

Deno.serve((req) => handler(req))
