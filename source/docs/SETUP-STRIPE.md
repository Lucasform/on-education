# Ligar o pagamento (Stripe)

O código já está pronto. Enquanto não houver `STRIPE_SECRET_KEY`, a tela de **Planos**
ativa o plano na hora (sem cobrança). Ao preencher as chaves, a ativação passa a exigir
pagamento via **Stripe Checkout** (cartão, Pix e boleto) e o **webhook** libera o plano.

## Passo a passo

1. **Criar conta** em https://dashboard.stripe.com e ativar o modo de teste.
2. **Pegar a chave secreta**: Developers > API keys > *Secret key* (`sk_test_...`).
   - Preencher `STRIPE_SECRET_KEY` no ambiente (Vercel > Project > Settings > Environment Variables).
3. **Criar os produtos/preços** (Products > Add product). Para cada plano pago e/ou
   funcionalidade avulsa, crie um preço **recorrente / mensal em BRL** e copie o `price_...`:
   - Combos: `STRIPE_PRICE_PLAN_TEACHER_BASIC`, `_TEACHER_PRO`, `_SCHOOL_STARTER`, `_SCHOOL_FULL`.
   - À la carte (opcional): `STRIPE_PRICE_FEATURE_<FUNCIONALIDADE>` (ver `.env.example`).
   - Só precisa criar os que for realmente vender. Se faltar o price de um item escolhido,
     o checkout falha com mensagem clara.
4. **Habilitar Pix e boleto** (recomendado no Brasil): Settings > Payment methods > ative Pix e Boleto.
5. **Configurar o webhook**: Developers > Webhooks > Add endpoint:
   - URL: `https://SEU-APP/api/billing/webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`.
   - Copie o *Signing secret* (`whsec_...`) para `STRIPE_WEBHOOK_SECRET`.
6. **Definir** `APP_PUBLIC_URL` com a URL pública (ex.: `https://on-education-seven.vercel.app`).
7. **Redeploy**. Pronto: a tela de Planos passa a abrir o checkout do Stripe; ao pagar, o
   webhook aplica o plano/funcionalidades automaticamente.

## Como funciona por dentro

- `apps/web/src/server/billing.ts` — cria a sessão de checkout (REST) e verifica a
  assinatura do webhook (HMAC, sem SDK).
- `apps/web/src/app/api/billing/webhook/route.ts` — recebe o evento e chama
  `applyComboPlanForTenant` / `setFeaturesForTenant`, que escrevem na tabela `entitlements`.
- `entitlements` é a fonte de verdade: o app libera as telas conforme as flags do tenant.

## Reverter acesso ao cancelar (passo futuro, ainda não implementado)

Hoje o webhook só **libera** o que foi pago. Para rebaixar para o Free quando a assinatura
é cancelada/expira, tratar `customer.subscription.deleted` aplicando o plano free do segmento.
