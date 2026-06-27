'use server';

import { adminReplyTicket, adminStartConversation } from '@on-education/module-nucleo';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getSuperAdminEmail } from '@/server/session';

async function requireAdmin() {
  const a = await getSuperAdminEmail();
  if (!a) redirect('/login');
}

/** Admin inicia uma conversa com uma escola. */
export async function adminStartConversationAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const tenantId = String(formData.get('tenantId') ?? '');
  const body = String(formData.get('body') ?? '');
  if (tenantId && body.trim()) await adminStartConversation(db(), tenantId, body);
  revalidatePath('/admin/mensagens');
}

/** Admin responde numa conversa já aberta. */
export async function adminReplyConversationAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const ticketId = String(formData.get('ticketId') ?? '');
  const tenantId = String(formData.get('tenantId') ?? '');
  const body = String(formData.get('body') ?? '');
  if (ticketId && tenantId && body.trim()) await adminReplyTicket(db(), ticketId, tenantId, body);
  revalidatePath('/admin/mensagens');
}
