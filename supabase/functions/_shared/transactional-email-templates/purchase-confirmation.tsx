/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
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

const LOGO_URL = 'https://eabvrprjqmpdcxkhwvbf.supabase.co/storage/v1/object/public/email-assets/aureon-pay-logo.svg'

const SITE_NAME = 'Aureon Pay'

interface PurchaseConfirmationProps {
  buyerName?: string
  productName?: string
  amount?: string
  paymentMethod?: string
  accessUrl?: string
  accessType?: string
}

const PurchaseConfirmationEmail = ({
  buyerName,
  productName,
  amount,
  paymentMethod,
  accessUrl,
  accessType,
}: PurchaseConfirmationProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Compra confirmada — {productName || 'seu produto'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Aureon Pay" width="48" height="48" style={{ margin: '0 0 20px' }} />
        <Heading style={h1}>
          {buyerName ? `Obrigado, ${buyerName}!` : 'Compra confirmada!'}
        </Heading>
        <Text style={text}>
          Sua compra de <strong>{productName || 'produto'}</strong> foi realizada com sucesso.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailLabel}>Produto</Text>
          <Text style={detailValue}>{productName || '—'}</Text>
          <Text style={detailLabel}>Valor</Text>
          <Text style={detailValue}>{amount || '—'}</Text>
          {paymentMethod && (
            <>
              <Text style={detailLabel}>Método</Text>
              <Text style={detailValue}>{paymentMethod === 'mpesa' ? 'M-Pesa' : paymentMethod === 'emola' ? 'e-Mola' : paymentMethod}</Text>
            </>
          )}
        </Section>

        {accessUrl && (
          <>
            <Hr style={hr} />
            <Text style={text}>
              {accessType === 'file'
                ? 'Clique no botão abaixo para baixar seu arquivo:'
                : 'Clique no botão abaixo para acessar seu conteúdo:'}
            </Text>
            <Button style={button} href={accessUrl}>
              {accessType === 'file' ? 'Baixar Arquivo' : 'Acessar Conteúdo'}
            </Button>
          </>
        )}

        <Text style={footer}>
          Se tiver alguma dúvida, responda a este email. Obrigado por comprar com {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PurchaseConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `Compra confirmada — ${data.productName || 'seu produto'}`,
  displayName: 'Confirmação de compra',
  previewData: {
    buyerName: 'Maria',
    productName: 'Curso de Marketing Digital',
    amount: '500,00 MT',
    paymentMethod: 'mpesa',
    accessUrl: 'https://exemplo.com/conteudo',
    accessType: 'link',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(220, 20%, 10%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(220, 10%, 46%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const detailsBox = {
  backgroundColor: '#f8faf9',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 25px',
}
const detailLabel = {
  fontSize: '12px',
  color: '#999999',
  margin: '0 0 2px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}
const detailValue = {
  fontSize: '14px',
  color: 'hsl(220, 20%, 10%)',
  fontWeight: '600' as const,
  margin: '0 0 12px',
}
const hr = { borderColor: '#e5e7eb', margin: '0 0 25px' }
const button = {
  backgroundColor: 'hsl(160, 84%, 39%)',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '12px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
