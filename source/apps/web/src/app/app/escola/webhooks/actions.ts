'use server';

import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  toggleWebhookEndpoint,
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

export async function createWebhookEndpointAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const url = String(formData.get('url') ?? '').trim();
  const events = formData.getAll('events').map(String).filter(Boolean);
  const secret = (formData.get('secret') as string) || undefined;
  if (!url || events.length === 0) return;
  await createWebhookEndpoint(db(), ctx, { url, events, secret });
  revalidatePath('/app/escola/webhooks', 'page');
}

export async function toggleWebhookEndpointAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id') ?? '');
  const active = formData.get('active') === 'true';
  await toggleWebhookEndpoint(db(), ctx, id, active);
  revalidatePath('/app/escola/webhooks', 'page');
}

export async function deleteWebhookEndpointAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await deleteWebhookEndpoint(db(), ctx, String(formData.get('id')));
  revalidatePath('/app/escola/webhooks', 'page');
}
