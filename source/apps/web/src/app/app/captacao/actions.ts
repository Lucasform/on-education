'use server';

import { createLead, deleteLead, setLeadStage } from '@on-education/module-nucleo';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

async function requireCtx() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  return ctx;
}

export async function createLeadAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await createLead(db(), ctx, {
    name: String(formData.get('name') ?? ''),
    guardianName: (formData.get('guardianName') as string) || null,
    contact: (formData.get('contact') as string) || null,
    source: String(formData.get('source') ?? 'outro'),
    interestGrade: (formData.get('interestGrade') as string) || null,
    notes: (formData.get('notes') as string) || null,
  });
  revalidatePath('/app/captacao');
}

export async function setLeadStageAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await setLeadStage(db(), ctx, String(formData.get('id')), String(formData.get('stage')));
  revalidatePath('/app/captacao');
}

export async function deleteLeadAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteLead(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/captacao');
}
