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
  Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const LOGO_URL = 'https://eabvrprjqmpdcxkhwvbf.supabase.co/storage/v1/object/public/email-assets/aureon-pay-logo.png'
const SITE_NAME = 'Aureon Pay'

interface SaleNotificationProps {
  sellerName?: string
  productName?: string
  amount?: string
  buyerName?: string
  buyerEmail?: string
  paymentMethod?: string
}

const SaleNotificationEmail = ({
  sellerName,
  productName,
  amount,
  buyerName,
  buyerEmail,
  paymentMethod,
}: SaleNotificationProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Nova venda — {productName || 'seu produto'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Aureon Pay" width="48" height="48" style={{ margin: '0 0 20px' }} />
        <Heading style={h1}>
          {sellerName ? `Parabéns, ${sellerName}! 🎉` : 'Nova venda realizada! 🎉'}
        </Heading>
        <Text style={text}>
          Você acabou de vender <strong>{productName || 'um produto'}</strong>.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailLabel}>Produto</Text>
          <Text style={detailValue}>{productName || '—'}</Text>
          <Text style={detailLabel}>Valor</Text>
          <Text style={detailValue}>{amount || '—'}</Text>
          {buyerName && (
            <>
              <Text style={detailLabel}>Comprador</Text>
              <Text style={detailValue}>{buyerName}{buyerEmail ? ` (${buyerEmail})` : ''}</Text>
            </>
          )}
          {paymentMethod && (
            <>
              <Text style={detailLabel}>Método</Text>
              <Text style={detailValue}>{paymentMethod === 'mpesa' ? 'M-Pesa' : paymentMethod === 'emola' ? 'e-Mola' : paymentMethod}</Text>
            </>
          )}
        </Section>

        <Text style={text}>
          O valor já está disponível na sua conta {SITE_NAME}. Acesse o painel para mais detalhes.
        </Text>

        <Text style={footer}>
          Esta é uma notificação automática do {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SaleNotificationEmail,
  subject: (data: Record<string, any>) =>
    `Nova venda — ${data.productName || 'seu produto'}`,
  displayName: 'Notificação de venda ao vendedor',
  previewData: {
    sellerName: 'João',
    productName: 'Curso de Marketing Digital',
    amount: '500,00 MT',
    buyerName: 'Maria',
    buyerEmail: 'maria@exemplo.com',
    paymentMethod: 'mpesa',
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
