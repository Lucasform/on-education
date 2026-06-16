'use server';

import { applyComboPlan, setTenantFeatures } from '@on-education/module-nucleo';
import { FEATURES, type Feature } from '@on-education/entitlements';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

async function requireCtx() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  return ctx;
}

export async function applyComboPlanAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const planId = String(formData.get('planId') ?? '').trim();
  if (!planId) return;
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
  try {
    await setTenantFeatures(db(), ctx, features);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro';
    redirect(`/app/planos?erro=${encodeURIComponent(msg)}`);
  }
  revalidatePath('/app', 'layout');
  redirect('/app/planos?ok=alacarte');
}
