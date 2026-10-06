/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const LOGO_URL = 'https://wyfzffmndlfizxzumiep.supabase.co/storage/v1/object/public/email-assets/kashpay-logo.png'
const SITE_NAME = 'KashPay'

interface WithdrawalNotificationProps {
  sellerName?: string
  amount?: string
  method?: string
  account?: string
  status?: string
}

const WithdrawalNotificationEmail = ({
  sellerName,
  amount,
  method,
  account,
  status,
}: WithdrawalNotificationProps) => {
  const isApproved = status === 'aprovado'
  const isRejected = status === 'rejeitado'

  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>Saque {isApproved ? 'aprovado' : isRejected ? 'rejeitado' : 'atualizado'} — {amount || ''}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt="KashPay" width="48" height="48" style={{ margin: '0 0 20px' }} />
          <Heading style={h1}>
            {sellerName ? `Olá, ${sellerName}` : 'Atualização do saque'}
          </Heading>
          <Text style={text}>
            {isApproved
              ? 'Seu saque foi aprovado e será processado em breve.'
              : isRejected
              ? 'Infelizmente, seu pedido de saque foi rejeitado.'
              : 'O status do seu saque foi atualizado.'}
          </Text>

          <Section style={detailsBox}>
            <Text style={detailLabel}>Valor</Text>
            <Text style={detailValue}>{amount || '—'}</Text>
            {method && (
              <>
                <Text style={detailLabel}>Método</Text>
                <Text style={detailValue}>{method === 'mpesa' ? 'M-Pesa' : method === 'emola' ? 'e-Mola' : method === 'banco' ? 'Transferência Bancária' : method}</Text>
              </>
            )}
            {account && (
              <>
                <Text style={detailLabel}>Conta</Text>
                <Text style={detailValue}>{account}</Text>
              </>
            )}
            <Text style={detailLabel}>Status</Text>
            <Text style={{
              ...detailValue,
              color: isApproved ? 'hsl(160, 84%, 39%)' : isRejected ? 'hsl(0, 72%, 51%)' : 'hsl(220, 20%, 10%)',
            }}>
              {isApproved ? '✅ Aprovado' : isRejected ? '❌ Rejeitado' : status || '—'}
            </Text>
          </Section>

          {isRejected && (
            <Text style={text}>
              Se tiver alguma dúvida, entre em contacto com o suporte.
            </Text>
          )}

          <Text style={footer}>
            Esta é uma notificação automática do {SITE_NAME}.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WithdrawalNotificationEmail,
  subject: (data: Record<string, any>) =>
    `Saque ${data.status === 'aprovado' ? 'aprovado' : data.status === 'rejeitado' ? 'rejeitado' : 'atualizado'} — ${data.amount || ''}`,
  displayName: 'Notificação de saque',
  previewData: {
    sellerName: 'João',
    amount: '1.500,00 MT',
    method: 'mpesa',
    account: '841234567',
    status: 'aprovado',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(220, 20%, 10%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(220, 10%, 46%)', lineHeight: '1.5', margin: '0 0 25px' }
const detailsBox = { backgroundColor: '#f8faf9', borderRadius: '12px', padding: '16px 20px', margin: '0 0 25px' }
const detailLabel = { fontSize: '12px', color: '#999999', margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const detailValue = { fontSize: '14px', color: 'hsl(220, 20%, 10%)', fontWeight: '600' as const, margin: '0 0 12px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
