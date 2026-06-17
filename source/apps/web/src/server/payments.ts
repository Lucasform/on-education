import 'server-only';

import { loadEnv } from '@on-education/config';

/**
 * Camada de pagamento da MENSALIDADE (família -> escola), AGNÓSTICA de provedor.
 * Distinta do Stripe (que cobra a ASSINATURA do SaaS, escola -> On Way). Aqui o PSP
 * (Asaas/Iugu) gera a cobrança Pix/boleto que a família paga para a escola.
 *
 * Tudo é OPCIONAL e gateado por isPaymentsConfigured(): sem PAYMENTS_PROVIDER + chave,
 * resolvePaymentProvider() devolve o provider NOOP e a UI mantém o comportamento de hoje
 * (2ª via read-only, baixa manual pela secretaria). Estilo REST-via-fetch, sem SDK, igual
 * a server/billing.ts.
 */

export type PaymentMethod = 'pix' | 'boleto' | 'card';
export type ChargeStatus = 'paid' | 'pending' | 'failed' | 'canceled';

export interface CreateChargeInput {
  /** Identificador interno da fatura (referência externa no PSP). */
  invoiceId: string;
  amountCents: number;
  description: string;
  dueDate: string; // 'YYYY-MM-DD'
  method: PaymentMethod;
  /** Pagador (família). Asaas/Iugu exigem ao menos nome; CPF/e-mail conforme o PSP. */
  payer: { name: string; email?: string | null; taxId?: string | null };
}

export interface ChargeResult {
  externalChargeId: string;
  paymentUrl?: string;
  pixCode?: string;
  boletoLine?: string;
  method: PaymentMethod;
  status: ChargeStatus;
}

export interface WebhookEvent {
  externalChargeId: string;
  status: ChargeStatus;
}

export interface PaymentProvider {
  name: string;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  verifyWebhook(payload: string, headers: Headers): WebhookEvent | null;
}

/**
 * Provider padrão quando nada está configurado. Não cobra nada online: createCharge
 * lança e verifyWebhook ignora. Garante que, sem PSP, o app se comporta como hoje.
 */
const noopProvider: PaymentProvider = {
  name: 'noop',
  async createCharge(): Promise<ChargeResult> {
    throw new Error('Pagamento online não configurado.');
  },
  verifyWebhook(): WebhookEvent | null {
    return null;
  },
};

// --- Asaas (https://docs.asaas.com) ------------------------------------------
// REST via fetch, sem SDK. Auth por header `access_token`. Sandbox usa o host
// https://api-sandbox.asaas.com/v3; produção https://api.asaas.com/v3.
function asaasProvider(apiKey: string, webhookToken: string | undefined): PaymentProvider {
  const base = 'https://api.asaas.com/v3';
  const billingType: Record<PaymentMethod, string> = {
    pix: 'PIX',
    boleto: 'BOLETO',
    card: 'CREDIT_CARD',
  };
  const mapStatus = (s: string): ChargeStatus => {
    const v = (s || '').toUpperCase();
    if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(v)) return 'paid';
    if (['OVERDUE', 'REFUNDED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE'].includes(v))
      return 'failed';
    if (v === 'DELETED') return 'canceled';
    return 'pending';
  };

  return {
    name: 'asaas',
    async createCharge(input): Promise<ChargeResult> {
      // O Asaas exige primeiro um customer (cliente) e depois um payment vinculado.
      // Para manter o escopo deste scaffold, criamos a cobrança assumindo que o
      // `customer` já será resolvido/criado num próximo passo (subconta por escola).
      // TODO: criar/recuperar o customer (POST /customers) e usar seu id aqui.
      // TODO: definir o `customer` correto (hoje a cobrança quebra sem ele) e, no Pix,
      //       buscar o copia-e-cola em GET /payments/{id}/pixQrCode.
      const res = await fetch(`${base}/payments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', access_token: apiKey },
        body: JSON.stringify({
          // customer: '<id do customer no Asaas>', // TODO
          billingType: billingType[input.method],
          value: input.amountCents / 100,
          dueDate: input.dueDate,
          description: input.description,
          externalReference: input.invoiceId,
        }),
      });
      if (!res.ok) throw new Error(`Asaas erro ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as {
        id?: string;
        invoiceUrl?: string;
        bankSlipUrl?: string;
        identificationField?: string;
        status?: string;
      };
      if (!data.id) throw new Error('Asaas não retornou o id da cobrança.');
      return {
        externalChargeId: data.id,
        paymentUrl: data.invoiceUrl || data.bankSlipUrl,
        boletoLine: data.identificationField,
        // pixCode: precisa de chamada extra a /pixQrCode (TODO acima).
        method: input.method,
        status: mapStatus(data.status ?? 'PENDING'),
      };
    },
    verifyWebhook(payload, headers): WebhookEvent | null {
      // O Asaas autentica o webhook por um token configurável enviado no header
      // `asaas-access-token`. Comparamos com ASAAS_WEBHOOK_TOKEN.
      if (webhookToken) {
        const got = headers.get('asaas-access-token');
        if (!got || got !== webhookToken) return null;
      }
      try {
        const body = JSON.parse(payload) as { payment?: { id?: string; status?: string } };
        const id = body.payment?.id;
        if (!id) return null;
        return { externalChargeId: id, status: mapStatus(body.payment?.status ?? '') };
      } catch {
        return null;
      }
    },
  };
}

// --- Iugu (https://dev.iugu.com) ---------------------------------------------
// REST via fetch, sem SDK. Auth Basic com a API key como usuário (senha vazia).
function iuguProvider(apiKey: string, webhookToken: string | undefined): PaymentProvider {
  const mapStatus = (s: string): ChargeStatus => {
    const v = (s || '').toLowerCase();
    if (['paid'].includes(v)) return 'paid';
    if (['canceled', 'refunded'].includes(v)) return 'canceled';
    if (['expired', 'in_protest', 'chargeback'].includes(v)) return 'failed';
    return 'pending';
  };

  return {
    name: 'iugu',
    async createCharge(input): Promise<ChargeResult> {
      // STUB funcional: a Iugu cria a cobrança via POST https://api.iugu.com/v1/charges
      // (auth Basic com a API key) ou fatura via /v1/invoices. O mapeamento de método
      // (pix/bank_slip/credit_card) e o payer (CPF/e-mail) variam por conta.
      // TODO: implementar o corpo real (payable_with, payer, items) quando houver conta Iugu.
      void apiKey;
      void input;
      throw new Error('TODO: implementar iugu createCharge (POST /v1/charges).');
    },
    verifyWebhook(payload, headers): WebhookEvent | null {
      // A Iugu envia triggers (invoice.status_changed) por form-urlencoded; a
      // autenticação recomendada é por um token no path/segredo combinado.
      if (webhookToken) {
        const got = headers.get('x-iugu-token') || headers.get('authorization');
        if (!got || !got.includes(webhookToken)) return null;
      }
      try {
        const body = JSON.parse(payload) as { data?: { id?: string; status?: string } };
        const id = body.data?.id;
        if (!id) return null;
        return { externalChargeId: id, status: mapStatus(body.data?.status ?? '') };
      } catch {
        return null;
      }
    },
  };
}

/** Resolve o provider conforme o ambiente. Sem config -> noop (comportamento de hoje). */
export function resolvePaymentProvider(): PaymentProvider {
  const env = loadEnv();
  const which = env.PAYMENTS_PROVIDER;
  if (which === 'asaas' && env.ASAAS_API_KEY) {
    return asaasProvider(env.ASAAS_API_KEY, env.ASAAS_WEBHOOK_TOKEN);
  }
  if (which === 'iugu' && env.IUGU_API_KEY) {
    return iuguProvider(env.IUGU_API_KEY, env.IUGU_WEBHOOK_TOKEN);
  }
  return noopProvider;
}

/** Há um PSP de mensalidade configurado? Gateia o botão de pagar e o webhook. */
export function isPaymentsConfigured(): boolean {
  return resolvePaymentProvider().name !== 'noop';
}
