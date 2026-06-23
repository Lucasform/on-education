'use server';

import { replyToGuardian } from '@on-education/module-comunicacao';
import { upsertTenantSettings } from '@on-education/module-nucleo';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

async function requireCtx() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  return ctx;
}

export async function replyToGuardianAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const guardianId = String(formData.get('guardianId') ?? '');
  const body = String(formData.get('body') ?? '');
  if (guardianId && body.trim()) await replyToGuardian(db(), ctx, guardianId, body);
  revalidatePath('/app/mensagens-pais');
}

export async function setGuardianMsgTeacherAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await upsertTenantSettings(db(), ctx, {
    allowGuardianMessageTeacher: formData.get('allowGuardianMessageTeacher') != null,
  });
  revalidatePath('/app/mensagens-pais');
}
