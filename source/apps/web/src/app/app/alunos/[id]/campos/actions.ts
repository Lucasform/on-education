'use server';

import {
  listCustomFieldDefs,
  setCustomFieldValues,
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

/** Grava os valores dos campos personalizados do aluno. */
export async function saveCamposAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const studentId = String(formData.get('studentId') ?? '');
  if (!studentId) return;

  const defs = await listCustomFieldDefs(db(), ctx.tenantId, 'student').catch(() => []);
  if (defs.length === 0) return;

  const values: Record<string, string> = {};
  for (const d of defs) {
    const key = `cf_${d.id}`;
    if (d.fieldType === 'checkbox') {
      values[d.id] = formData.get(key) === 'on' ? 'true' : '';
    } else if (formData.has(key)) {
      values[d.id] = String(formData.get(key) ?? '').trim();
    }
  }

  await setCustomFieldValues(db(), ctx.tenantId, studentId, values, ctx.userId);
  revalidatePath(`/app/alunos/${studentId}/campos`);
}
