'use server';

import { purgeTenant, restoreTenant, softDeleteTenant } from '@on-education/module-nucleo';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { db } from '@/server/db';
import { IMPERSONATION_COOKIE } from '@/server/session';

/** Super-admin "entra como" um tenant (view-as). TEMPORÁRIO: admin ainda sem auth. */
export async function enterTenantAction(formData: FormData): Promise<void> {
  const tenantId = String(formData.get('tenantId') ?? '');
  if (!tenantId) return;
  (await cookies()).set(IMPERSONATION_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  redirect('/app');
}

export async function exitImpersonationAction(): Promise<void> {
  (await cookies()).delete(IMPERSONATION_COOKIE);
  redirect('/admin');
}

// --- Exclusão de escola (super-admin) ----------------------------------------

export async function softDeleteTenantAction(formData: FormData): Promise<void> {
  await softDeleteTenant(db(), String(formData.get('tenantId')));
  revalidatePath('/admin');
}

export async function restoreTenantAction(formData: FormData): Promise<void> {
  await restoreTenant(db(), String(formData.get('tenantId')));
  revalidatePath('/admin');
}

/** Exclusão DEFINITIVA: exige o nome digitado bater com o nome da escola. */
export async function purgeTenantAction(formData: FormData): Promise<void> {
  const tenantId = String(formData.get('tenantId'));
  const confirmName = String(formData.get('confirmName') ?? '').trim();
  const realName = String(formData.get('tenantName') ?? '').trim();
  if (!confirmName || confirmName !== realName) {
    throw new Error('Confirmação não confere: digite o nome exato da escola para excluir.');
  }
  await purgeTenant(db(), tenantId);
  revalidatePath('/admin');
}
