'use server';

import {
  createWorkRequest,
  deleteWorkRequest,
  setWorkRequestStatus,
} from '@on-education/module-nucleo';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

async function requireCtx() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  return ctx;
}

export async function createWorkRequestAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const copiesRaw = formData.get('copies');
  await createWorkRequest(db(), ctx, {
    type: String(formData.get('type') ?? 'servico'),
    title: String(formData.get('title') ?? ''),
    body: String(formData.get('body') ?? ''),
    studentId: (formData.get('studentId') as string) || null,
    classId: (formData.get('classId') as string) || null,
    activityId: (formData.get('activityId') as string) || null,
    copies: copiesRaw ? Number(copiesRaw) || null : null,
  });
  revalidatePath('/app/painel');
}

export async function setWorkRequestStatusAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id'));
  const status = String(formData.get('status')) as 'enviada' | 'em_analise' | 'resolvida';
  const resolution = formData.get('resolution');
  await setWorkRequestStatus(
    db(),
    ctx,
    id,
    status,
    resolution !== null ? String(resolution) : undefined,
  );
  revalidatePath('/app/painel');
}

export async function deleteWorkRequestAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteWorkRequest(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/painel');
}
