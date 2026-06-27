import { afterEach, describe, expect, it, vi } from 'vitest';

// billing.ts é server-only; no vitest stubamos o marcador para poder testar a lógica pura.
vi.mock('server-only', () => ({}));

import { isBillingConfigured, isLaunchFree, priceIdForPlan } from '../billing';

const origLive = process.env.BILLING_LIVE;
const origPrice = process.env.STRIPE_PRICE_PLAN_TEACHER_PRO;

afterEach(() => {
  if (origLive === undefined) delete process.env.BILLING_LIVE;
  else process.env.BILLING_LIVE = origLive;
  if (origPrice === undefined) delete process.env.STRIPE_PRICE_PLAN_TEACHER_PRO;
  else process.env.STRIPE_PRICE_PLAN_TEACHER_PRO = origPrice;
});

describe('billing: interruptor de lançamento', () => {
  it('sem BILLING_LIVE, fica em modo lançamento (tudo free)', () => {
    delete process.env.BILLING_LIVE;
    expect(isLaunchFree()).toBe(true);
    // No modo lançamento a cobrança nunca está configurada, mesmo com Stripe setado.
    expect(isBillingConfigured()).toBe(false);
  });

  it('BILLING_LIVE=1 tira do modo lançamento', () => {
    process.env.BILLING_LIVE = '1';
    expect(isLaunchFree()).toBe(false);
  });

  it('priceIdForPlan mapeia o plano para STRIPE_PRICE_PLAN_*', () => {
    process.env.STRIPE_PRICE_PLAN_TEACHER_PRO = 'price_abc';
    expect(priceIdForPlan('teacher_pro')).toBe('price_abc');
    expect(priceIdForPlan('plano_inexistente')).toBeUndefined();
  });
});
