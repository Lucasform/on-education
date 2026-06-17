# Ligar o pagamento da mensalidade (Asaas / Iugu)

Esta é a camada de pagamento da **MENSALIDADE** (família paga a escola). É **distinta** do
Stripe, que cobra a **assinatura do SaaS** (a escola paga a On Way). Aqui o PSP gera uma
cobrança Pix/boleto que a família paga; o webhook dá baixa automática na fatura.

O código já está pronto e é **agnóstico de provedor**. Enquanto não houver
`PAYMENTS_PROVIDER` + chave, nada muda: o portal mostra as mensalidades em modo 2ª via
read-only e a secretaria dá baixa manual. Quando configurar, surge o botão **Pagar
(Pix/boleto)** no portal do responsável.

## Escolher o provedor

Suportamos dois adaptadores REST (sem SDK), ambos com Pix e boleto no Brasil:

- **Asaas** (https://www.asaas.com) — `PAYMENTS_PROVIDER=asaas`.
- **Iugu** (https://www.iugu.com) — `PAYMENTS_PROVIDER=iugu`.

Escolha um. A recomendação é avaliar taxas de Pix/boleto e a disponibilidade de
**subcontas por escola** (ver TODO no fim).

## Passo a passo

1. **Criar conta** no PSP escolhido e gerar a API key.
2. **Preencher o ambiente** (Vercel > Project > Settings > Environment Variables):
   - `PAYMENTS_PROVIDER=asaas` (ou `iugu`)
   - `ASAAS_API_KEY=...` (ou `IUGU_API_KEY=...`)
   - `ASAAS_WEBHOOK_TOKEN=...` (ou `IUGU_WEBHOOK_TOKEN=...`) — token para autenticar o webhook.
3. **Configurar o webhook** no painel do PSP apontando para:
   - `https://SEU-APP/api/payments/webhook`
   - Eventos de pagamento confirmado (Asaas: `PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED`; Iugu:
     `invoice.status_changed` com status `paid`).
4. **Definir** `APP_PUBLIC_URL` (já usado pelo Stripe) com a URL pública.
5. **Redeploy**. Pronto: o portal passa a exibir o botão de pagar nas faturas abertas.

## Como funciona por dentro

- `apps/web/src/server/payments.ts` — interface `PaymentProvider` + adaptadores Asaas/Iugu
  (REST via fetch) + `resolvePaymentProvider()` / `isPaymentsConfigured()`. Sem config,
  devolve o provider **noop** (createCharge lança, verifyWebhook ignora).
- `apps/web/src/app/portal/me/actions.ts` — `payInvoiceAction` valida a posse da fatura
  (nucleo), chama `createCharge` no PSP (camada de app) e persiste com `setInvoiceCharge`.
- `apps/web/src/app/api/payments/webhook/route.ts` — verifica o evento, descobre o tenant
  pela fatura (`findInvoiceTenantByExternalCharge`) e dá baixa
  (`markInvoicePaidByExternalCharge`). Idempotente.
- Colunas em `invoices`: `provider`, `external_charge_id`, `payment_method`, `payment_url`,
  `pix_code`, `boleto_line`, `charged_at` (todas opcionais).

## TODOs (quando houver conta real)

- **Asaas createCharge**: hoje o `POST /v3/payments` não envia o `customer` (cliente do
  Asaas). É preciso criar/recuperar o customer (`POST /v3/customers`) antes de cobrar e,
  no Pix, buscar o copia-e-cola em `GET /v3/payments/{id}/pixQrCode`.
- **Iugu createCharge**: o adaptador é um stub que lança `TODO: implementar iugu
  createCharge`. Implementar `POST /v1/charges` (ou `/v1/invoices`) com `payer` e
  `payable_with` corretos.
- **Subcontas / split por escola (recomendado)**: numa plataforma multi-tenant, o dinheiro
  da mensalidade deve cair na conta da **escola**, não numa conta única da On Way. Tanto
  Asaas quanto Iugu suportam subcontas (marketplace) e split. O próximo passo é provisionar
  uma subconta por tenant e usar a credencial/`walletId` da escola ao cobrar.
