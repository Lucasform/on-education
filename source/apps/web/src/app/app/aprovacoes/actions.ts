'use server';

import { createApproval } from '@on-education/module-nucleo';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export async function criarAprovacaoAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx || ctx.tenantType !== 'organization') redirect('/app');

  const title = String(formData.get('title') ?? '').trim();
  if (!title) redirect('/app/aprovacoes');

  const valor = String(formData.get('amount') ?? '').trim();
  const amountCents = valor ? Math.round(Number(valor) * 100) : null;

  await createApproval(db(), ctx, {
    kind: String(formData.get('kind') ?? 'despesa'),
    title,
    detail: (formData.get('detail') as string)?.trim() || null,
    amountCents: amountCents != null && Number.isFinite(amountCents) ? amountCents : null,
  });

  revalidatePath('/app/aprovacoes');
}
