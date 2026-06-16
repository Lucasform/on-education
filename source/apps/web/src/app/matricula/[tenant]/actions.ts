'use server';

import { createEnrollmentRequest } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function submitEnrollmentAction(formData: FormData): Promise<void> {
  const tenantId = String(formData.get('tenantId') ?? '').trim();
  if (!UUID_RE.test(tenantId)) redirect('/matricula/invalido');

  const studentName = String(formData.get('studentName') ?? '').trim();
  const guardianName = String(formData.get('guardianName') ?? '').trim();
  if (!studentName || !guardianName) redirect(`/matricula/${tenantId}?erro=campos`);

  try {
    await createEnrollmentRequest(db(), tenantId, {
      studentName,
      birthDate: (formData.get('birthDate') as string) || null,
      shift: (formData.get('shift') as string) || null,
      guardianName,
      guardianEmail: (formData.get('guardianEmail') as string) || null,
      guardianPhone: (formData.get('guardianPhone') as string) || null,
      guardianCpf: (formData.get('guardianCpf') as string) || null,
      relation: (formData.get('relation') as string) || null,
      notes: (formData.get('notes') as string) || null,
    });
  } catch {
    redirect(`/matricula/${tenantId}?erro=falha`);
  }
  redirect(`/matricula/${tenantId}?ok=1`);
}
