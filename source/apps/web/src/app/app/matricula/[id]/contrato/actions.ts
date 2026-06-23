'use server';

import { signContract } from '@on-education/module-nucleo';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export async function signContractAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const studentId = String(formData.get('studentId') ?? '');
  const signerName = String(formData.get('signerName') ?? '');
  const signerKind = formData.get('signerKind') === 'escola' ? 'escola' : 'responsavel';
  const termsSnapshot = (formData.get('termsSnapshot') as string) || null;
  if (studentId && signerName.trim()) {
    await signContract(db(), ctx, { studentId, signerName, signerKind, termsSnapshot });
  }
  revalidatePath(`/app/matricula/${studentId}/contrato`);
}
