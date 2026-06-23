'use server';

import { sendGuardianMessage } from '@on-education/module-comunicacao';
import { resolvePortalToken } from '@on-education/module-nucleo';
import { revalidatePath } from 'next/cache';

import { db } from '@/server/db';

export async function sendPortalMessageAction(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '');
  const body = String(formData.get('body') ?? '');
  const target = formData.get('target') === 'professor' ? 'professor' : 'coordenacao';
  if (!token || !body.trim()) return;
  // Re-resolve o token no servidor (não confiar em tenantId vindo do cliente).
  const data = await resolvePortalToken(db(), token).catch(() => null);
  if (data) {
    await sendGuardianMessage(db(), {
      tenantId: data.tenantId,
      guardianId: data.guardian.id,
      body,
      target,
      authorName: data.guardian.fullName,
    });
  }
  revalidatePath(`/portal/${token}`);
}
