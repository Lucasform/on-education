'use server';

import { deleteGateLog, logGate } from '@on-education/module-nucleo';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

async function requireCtx() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  return ctx;
}

export async function logGateAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await logGate(db(), ctx, {
    personName: String(formData.get('personName') ?? ''),
    kind: String(formData.get('kind') ?? 'visitante'),
    direction: String(formData.get('direction') ?? 'entrada'),
    note: (formData.get('note') as string) || null,
  });
  revalidatePath('/app/portaria');
}

export async function deleteGateLogAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteGateLog(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/portaria');
}
