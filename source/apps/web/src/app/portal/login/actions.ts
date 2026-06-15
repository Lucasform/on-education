'use server';

import {
  findGuardianForPortalLogin,
  updateGuardianPortalPassword,
  verifyPortalPassword,
} from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { clearGuardianSession, getGuardianSession, setGuardianSession } from '@/server/guardian-session';

export async function loginGuardianAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) redirect('/portal/login?error=campos');

  const guardian = await findGuardianForPortalLogin(db(), email);
  if (!guardian || !guardian.portalPasswordHash) redirect('/portal/login?error=invalido');

  const valid = await verifyPortalPassword(guardian.portalPasswordHash, password);
  if (!valid) redirect('/portal/login?error=invalido');

  await setGuardianSession(guardian.id, guardian.tenantId);

  if (guardian.mustChangePassword) {
    redirect('/portal/alterar-senha');
  }
  redirect('/portal/me');
}

export async function changeGuardianPasswordAction(formData: FormData): Promise<void> {
  const session = await getGuardianSession();
  if (!session) redirect('/portal/login');

  const newPassword = String(formData.get('newPassword') ?? '').trim();
  const confirm = String(formData.get('confirm') ?? '').trim();
  if (!newPassword || newPassword.length < 6) redirect('/portal/alterar-senha?error=curta');
  if (newPassword !== confirm) redirect('/portal/alterar-senha?error=diferente');

  await updateGuardianPortalPassword(db(), session.guardianId, newPassword);
  redirect('/portal/me');
}

export async function logoutGuardianAction(): Promise<void> {
  await clearGuardianSession();
  redirect('/portal/login');
}
