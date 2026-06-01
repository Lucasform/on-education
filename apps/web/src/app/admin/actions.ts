'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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
