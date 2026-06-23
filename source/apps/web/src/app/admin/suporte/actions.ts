'use server';

import { adminReplyTicket, setSupportStatus } from '@on-education/module-nucleo';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getSuperAdminEmail } from '@/server/session';

async function requireAdmin() {
  const a = await getSuperAdminEmail();
  if (!a) redirect('/login');
}

export async function adminReplySupportAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const ticketId = String(formData.get('ticketId') ?? '');
  const tenantId = String(formData.get('tenantId') ?? '');
  const body = String(formData.get('body') ?? '');
  if (ticketId && tenantId && body.trim()) await adminReplyTicket(db(), ticketId, tenantId, body);
  revalidatePath('/admin/suporte');
}

export async function setSupportStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await setSupportStatus(db(), String(formData.get('ticketId') ?? ''), String(formData.get('status') ?? ''));
  revalidatePath('/admin/suporte');
}
