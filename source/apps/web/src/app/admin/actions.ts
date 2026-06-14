'use server';

import {
  purgeTenant,
  restoreTenant,
  setTenantClient,
  softDeleteTenant,
} from '@on-education/module-nucleo';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { db } from '@/server/db';
import { IMPERSONATION_COOKIE } from '@/server/session';

/**
 * Super-admin "entra como" um tenant (view-as). Guarda `tenantId|tenantType` no cookie para
 * que a sessão de impersonação seja montada sem consultar o banco a cada navegação.
 */
export async function enterTenantAction(formData: FormData): Promise<void> {
  const tenantId = String(formData.get('tenantId') ?? '');
  const tenantType = String(formData.get('tenantType') ?? '');
  if (!tenantId) return;
  const value =
    tenantType === 'organization' || tenantType === 'individual'
      ? `${tenantId}|${tenantType}`
      : tenantId;
  (await cookies()).set(IMPERSONATION_COOKIE, value, {
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

/** Marca/desmarca o tenant como cliente pagante (CRM do super-admin). */
export async function toggleTenantClientAction(formData: FormData): Promise<void> {
  const tenantId = String(formData.get('tenantId') ?? '');
  if (!tenantId) return;
  const next = String(formData.get('isClient') ?? '') === 'true';
  await setTenantClient(db(), tenantId, next);
  revalidatePath('/admin/contas');
  revalidatePath(`/admin/contas/${tenantId}`);
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
