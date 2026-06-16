import 'server-only';

import { loadEnv } from '@on-education/config';
import type { TenantType } from '@on-education/core';
import { type Feature } from '@on-education/entitlements';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Integração de cobrança (Stripe) via REST — sem SDK, no mesmo estilo do provider de IA.
 * Tudo é opcional: sem STRIPE_SECRET_KEY o app fica em modo "ativação imediata" (a tela de
 * planos aplica o plano direto, sem checkout). Quando as chaves existirem, o fluxo passa por
 * Stripe Checkout (assinatura) e o webhook aplica o plano/funcionalidades.
 *
 * Convenção dos price IDs (criados no painel do Stripe e setados no ambiente):
 *   - Combo:        STRIPE_PRICE_PLAN_<PLANID>      ex.: STRIPE_PRICE_PLAN_TEACHER_PRO
 *   - À la carte:   STRIPE_PRICE_FEATURE_<FEATURE>  ex.: STRIPE_PRICE_FEATURE_AI_IMAGES
 */

export function isBillingConfigured(): boolean {
  return Boolean(loadEnv().STRIPE_SECRET_KEY);
}

const envKey = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();

export function priceIdForPlan(planId: string): string | undefined {
  return process.env[`STRIPE_PRICE_PLAN_${envKey(planId)}`] || undefined;
}

export function priceIdForFeature(feature: Feature): string | undefined {
  return process.env[`STRIPE_PRICE_FEATURE_${envKey(feature)}`] || undefined;
}

interface CheckoutInput {
  tenantId: string;
  tenantType: TenantType;
  /** combo: 1 line item do plano; alacarte: 1 line item por funcionalidade. */
  kind: 'combo' | 'alacarte';
  planId?: string;
  features?: Feature[];
  origin: string;
  customerEmail?: string | null;
}

/**
 * Cria uma sessão de Stripe Checkout (assinatura) e retorna a URL de redirecionamento.
 * Lança se faltar price ID — assim o erro aparece cedo na configuração.
 */
export async function createCheckoutSession(input: CheckoutInput): Promise<string> {
  const secret = loadEnv().STRIPE_SECRET_KEY;
  if (!secret) throw new Error('Stripe não configurado.');

  const priceIds: string[] =
    input.kind === 'combo'
      ? [priceIdForPlan(input.planId ?? '') ?? throwMissing(`plano ${input.planId}`)]
      : (input.features ?? []).map(
          (f) => priceIdForFeature(f) ?? throwMissing(`funcionalidade ${f}`),
        );

  const base = loadEnv().APP_PUBLIC_URL || input.origin;
  const form = new URLSearchParams();
  form.set('mode', 'subscription');
  form.set('success_url', `${base}/app/planos?ok=${input.kind}`);
  form.set('cancel_url', `${base}/app/planos?erro=cancelado`);
  form.set('client_reference_id', input.tenantId);
  if (input.customerEmail) form.set('customer_email', input.customerEmail);
  priceIds.forEach((price, i) => {
    form.set(`line_items[${i}][price]`, price);
    form.set(`line_items[${i}][quantity]`, '1');
  });
  // Metadados para o webhook saber o que aplicar (na sessão e na assinatura criada).
  const meta: Record<string, string> = {
    tenantId: input.tenantId,
    tenantType: input.tenantType,
    kind: input.kind,
    planId: input.planId ?? '',
    features: (input.features ?? []).join(','),
  };
  for (const [k, v] of Object.entries(meta)) {
    form.set(`metadata[${k}]`, v);
    form.set(`subscription_data[metadata][${k}]`, v);
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  if (!res.ok) throw new Error(`Stripe checkout erro ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error('Stripe não retornou a URL do checkout.');
  return data.url;
}

export interface StripeEvent {
  type: string;
  data: { object: Record<string, unknown> };
}

/**
 * Verifica a assinatura do webhook (Stripe-Signature) com HMAC-SHA256 e retorna o evento.
 * Retorna null se a assinatura for inválida. Tolerância de 5 min contra replay.
 */
export function verifyStripeWebhook(payload: string, sigHeader: string | null): StripeEvent | null {
  const secret = loadEnv().STRIPE_WEBHOOK_SECRET;
  if (!secret || !sigHeader) return null;
  const parts = Object.fromEntries(
    sigHeader.split(',').map((kv) => {
      const [k, v] = kv.split('=');
      return [k, v] as const;
    }),
  );
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return null;

  // Replay: rejeita timestamps muito antigos (5 min). `t` é epoch em segundos.
  const ageSec = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(ageSec) || ageSec > 300) return null;

  const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(payload) as StripeEvent;
  } catch {
    return null;
  }
}

function throwMissing(what: string): never {
  throw new Error(`Price ID do Stripe ausente para ${what}. Configure STRIPE_PRICE_*.`);
}
