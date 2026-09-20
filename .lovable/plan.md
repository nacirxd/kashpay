# Confirmação de pagamentos de Angola (Multicaixa) sem ficar presa

## Problema confirmado

O aviso de pagamento da Kumbify só é aceite se trouxer a chave secreta no endereço. Se a Kumbify não estiver configurada com esse endereço (com a chave), todos os avisos são recusados e a compra fica "pendente" para sempre: sem email de entrega, sem acesso, e o vendedor não vê a venda. Hoje não existe nenhuma segunda via de confirmação para pagamentos de Angola — ao contrário da Zenofy, que tem verificação automática.

## O que vou construir

1. Verificação automática das compras de Angola (segunda via)
   - Nova função `kumbify-check-status` que pergunta diretamente à Kumbify se um pagamento foi pago, usando a chave de API que já temos.
   - Se estiver pago: marca a venda como aprovada e dispara exatamente o mesmo processo do aviso (email de compra com entregável, oferta extra, email ao vendedor, SMS, webhook do produto, Utmify).
   - Se continuar pendente há mais de 3 horas: marca como falhada.
2. Verificação no ecrã de espera
   - Na página onde o cliente vê a referência Multicaixa, passamos a consultar essa nova verificação a cada poucos segundos, para que o ecrã mude para "Pagamento confirmado" sozinho.
3. Verificação periódica
   - Tarefa agendada (a cada minuto) que reconcilia as vendas Kumbify pendentes, para funcionar mesmo que o cliente feche a página.
4. A chave secreta do aviso mantém-se
   - A proteção continua (o aviso recusa pedidos sem chave), mas já não é o único caminho para aprovar a venda.

## Detalhes técnicos

- Novo `supabase/functions/kumbify-check-status/index.ts`: autentica em `/api/auth/login` com `KUMBIFY_API_CLIENT_KEY`, consulta o estado por `external_transaction_id`/`merchantTransactionId`, e reutiliza `_shared/orderBump.ts`, `_shared/deliveryAccess.ts`, `_shared/sendAppEmail.ts`, `_shared/utmify.ts` numa função `approveSale` idêntica à de `zenofy-check-status`.
- `verify_jwt = false` em `supabase/config.toml` para a nova função.
- `src/pages/Checkout.tsx`: no fluxo `ref`/`mcx`, o polling atual passa a chamar `kumbify-check-status` além de `check-payment-status`.
- `pg_cron`: job `kumbify-reconcile` a cada minuto.
- Se o endpoint de estado da Kumbify não responder como esperado, a função registra o motivo nos logs e a venda mantém-se pendente (sem aprovar nada por engano).

## Ação sua (independente do plano)

No painel da Kumbify, o endereço de aviso de pagamento deve ser:
`https://eabvrprjqmpdcxkhwvbf.supabase.co/functions/v1/kumbify-webhook?secret=aureon_kbf_9f2c7a41d6b84e05b3c1d7f8a6e02b9c`
