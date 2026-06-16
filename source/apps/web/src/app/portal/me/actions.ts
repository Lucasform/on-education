'use server';

import {
  guardianBookMeeting,
  guardianRequestExit,
  guardianRequestReenrollment,
  guardianSendMessage,
  guardianSubmitJustification,
  guardianUpdateContact,
  updateGuardianPortalPassword,
} from '@on-education/module-nucleo';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getGuardianSession } from '@/server/guardian-session';

async function session() {
  const s = await getGuardianSession();
  if (!s) redirect('/portal/login');
  return s;
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

export async function requestExitAction(fd: FormData): Promise<void> {
  const s = await session();
  const studentId = str(fd, 'studentId');
  const date = str(fd, 'date');
  const reason = str(fd, 'reason');
  if (!studentId || !date || !reason) redirect('/portal/me?erro=campos');
  await guardianRequestExit(db(), s.guardianId, s.tenantId, {
    studentId,
    date,
    time: str(fd, 'time') || null,
    reason,
    authorizedByName: str(fd, 'authorizedByName') || null,
  }).catch(() => redirect('/portal/me?erro=falha'));
  revalidatePath('/portal/me');
  redirect('/portal/me?ok=saida#saida');
}

export async function submitJustificationAction(fd: FormData): Promise<void> {
  const s = await session();
  const studentId = str(fd, 'studentId');
  const date = str(fd, 'date');
  const reason = str(fd, 'reason');
  if (!studentId || !date || !reason) redirect('/portal/me?erro=campos');
  await guardianSubmitJustification(db(), s.guardianId, s.tenantId, {
    studentId,
    date,
    reason,
    submittedByName: str(fd, 'submittedByName') || null,
  }).catch(() => redirect('/portal/me?erro=falha'));
  revalidatePath('/portal/me');
  redirect('/portal/me?ok=justificativa#justificativa');
}

export async function bookMeetingAction(fd: FormData): Promise<void> {
  const s = await session();
  const slotId = str(fd, 'slotId');
  const guardianName = str(fd, 'guardianName');
  if (!slotId || !guardianName) redirect('/portal/me?erro=campos');
  await guardianBookMeeting(db(), s.guardianId, s.tenantId, {
    slotId,
    studentId: str(fd, 'studentId') || null,
    guardianName,
    guardianPhone: str(fd, 'guardianPhone') || null,
    notes: str(fd, 'notes') || null,
  }).catch(() => redirect('/portal/me?erro=reuniao'));
  revalidatePath('/portal/me');
  redirect('/portal/me?ok=reuniao#reuniao');
}

export async function sendMessageAction(fd: FormData): Promise<void> {
  const s = await session();
  const body = str(fd, 'body');
  if (!body) redirect('/portal/me?erro=campos#chat');
  await guardianSendMessage(db(), s.guardianId, s.tenantId, {
    subject: str(fd, 'subject') || 'Mensagem do responsável',
    body,
    studentId: str(fd, 'studentId') || null,
  }).catch(() => redirect('/portal/me?erro=falha#chat'));
  revalidatePath('/portal/me');
  redirect('/portal/me#chat');
}

export async function requestReenrollmentAction(fd: FormData): Promise<void> {
  const s = await session();
  const studentId = str(fd, 'studentId');
  if (!studentId) redirect('/portal/me?erro=campos');
  await guardianRequestReenrollment(db(), s.guardianId, s.tenantId, {
    studentId,
    notes: str(fd, 'notes') || null,
  }).catch(() => redirect('/portal/me?erro=falha'));
  revalidatePath('/portal/me');
  redirect('/portal/me?ok=rematricula#matricula');
}

export async function updateContactAction(fd: FormData): Promise<void> {
  const s = await session();
  await guardianUpdateContact(db(), s.guardianId, s.tenantId, {
    phone: str(fd, 'phone') || null,
    email: str(fd, 'email') || null,
    address: str(fd, 'address') || null,
  }).catch(() => redirect('/portal/me?erro=falha#conta'));
  revalidatePath('/portal/me');
  redirect('/portal/me?ok=contato#conta');
}

export async function changePasswordAction(fd: FormData): Promise<void> {
  const s = await session();
  const pw = str(fd, 'password');
  const pw2 = str(fd, 'password2');
  if (pw.length < 6 || pw !== pw2) redirect('/portal/me?erro=senha#conta');
  await updateGuardianPortalPassword(db(), s.guardianId, pw).catch(() =>
    redirect('/portal/me?erro=falha#conta'),
  );
  redirect('/portal/me?ok=senha#conta');
}
