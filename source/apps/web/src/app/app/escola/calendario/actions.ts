'use server';

import {
  createCalendarEvent,
  deleteCalendarEvent,
  setSchoolYear,
} from '@on-education/module-nucleo';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

async function requireCtx() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  return ctx;
}

export async function createCalendarEventAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const date = String(formData.get('date') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const type = String(formData.get('type') ?? 'holiday').trim();
  const recurring = formData.get('recurring') === 'on';
  if (!date || !name) return;
  await createCalendarEvent(db(), ctx, { date, name, type, recurring });
  revalidatePath('/app/escola/calendario', 'page');
}

export async function deleteCalendarEventAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  await deleteCalendarEvent(db(), ctx, id);
  revalidatePath('/app/escola/calendario', 'page');
}

export async function setSchoolYearAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const start = (formData.get('schoolYearStart') as string) || null;
  const end = (formData.get('schoolYearEnd') as string) || null;
  await setSchoolYear(db(), ctx, start, end);
  revalidatePath('/app/escola/calendario', 'page');
}
