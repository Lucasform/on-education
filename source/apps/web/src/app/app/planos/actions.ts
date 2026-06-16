'use server';

import { applyComboPlan, setTenantFeatures } from '@on-education/module-nucleo';
import { FEATURES, getPlan as getPlanDef, type Feature } from '@on-education/entitlements';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createCheckoutSession, isBillingConfigured } from '@/server/billing';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

async function requireCtx() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  return ctx;
}

async function origin(): Promise<string> {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('host') ?? '';
  return `${proto}://${host}`;
}

export async function applyComboPlanAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const planId = String(formData.get('planId') ?? '').trim();
  if (!planId) return;

  // Plano pago + Stripe configurado → checkout. Grátis ou sem Stripe → ativa direto.
  const def = getPlanDef(planId);
  if (isBillingConfigured() && def && def.monthlyPrice !== 0) {
    const url = await createCheckoutSession({
      tenantId: ctx.tenantId,
      tenantType: ctx.tenantType,
      kind: 'combo',
      planId,
      origin: await origin(),
    });
    redirect(url);
  }

  await applyComboPlan(db(), ctx, planId);
  revalidatePath('/app', 'layout');
  redirect('/app/planos?ok=combo');
}

export async function applyAlaCarteAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const valid = new Set<string>(FEATURES);
  const features = formData
    .getAll('features')
    .map((f) => String(f))
    .filter((f) => valid.has(f)) as Feature[];

  if (isBillingConfigured()) {
    try {
      const url = await createCheckoutSession({
        tenantId: ctx.tenantId,
        tenantType: ctx.tenantType,
        kind: 'alacarte',
        features,
        origin: await origin(),
      });
      redirect(url);
    } catch (e) {
      if (e instanceof Error && e.message.includes('NEXT_REDIRECT')) throw e;
      const msg = e instanceof Error ? e.message : 'erro';
      redirect(`/app/planos?erro=${encodeURIComponent(msg)}`);
    }
  }

  try {
    await setTenantFeatures(db(), ctx, features);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro';
    redirect(`/app/planos?erro=${encodeURIComponent(msg)}`);
  }
  revalidatePath('/app', 'layout');
  redirect('/app/planos?ok=alacarte');
}
