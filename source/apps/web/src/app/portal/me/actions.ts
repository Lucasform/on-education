'use server';

import {
  assertGuardianOwnsInvoice,
  getGuardianContact,
  guardianBookMeeting,
  guardianMarkChatRead,
  guardianRequestExit,
  guardianRequestReenrollment,
  guardianSendMessage,
  guardianSubmitJustification,
  guardianUpdateContact,
  setInvoiceCharge,
  updateGuardianPortalPassword,
} from '@on-education/module-nucleo';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { uploadGuardianDocument } from '@/server/storage';
import { db } from '@/server/db';
import { getGuardianSession } from '@/server/guardian-session';
import {
  isPaymentsConfigured,
  resolvePaymentProvider,
  type PaymentMethod,
} from '@/server/payments';

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

  // Anexo opcional (atestado): sobe ao storage e guarda a URL.
  let documentUrl: string | null = null;
  const file = fd.get('document');
  if (file instanceof File && file.size > 0) {
    try {
      documentUrl = await uploadGuardianDocument(s.tenantId, file);
    } catch {
      redirect('/portal/me?erro=anexo#justificativa');
    }
  }

  await guardianSubmitJustification(db(), s.guardianId, s.tenantId, {
    studentId,
    date,
    reason,
    documentUrl,
    submittedByName: str(fd, 'submittedByName') || null,
  }).catch(() => redirect('/portal/me?erro=falha'));
  revalidatePath('/portal/me');
  redirect('/portal/me?ok=justificativa#justificativa');
}

export async function markChatReadAction(): Promise<void> {
  const s = await session();
  await guardianMarkChatRead(db(), s.guardianId, s.tenantId).catch(() => {});
  revalidatePath('/portal/me');
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

/**
 * Gera uma cobrança online (Pix/boleto) para uma fatura aberta do responsável.
 * Orquestra: valida posse (nucleo) -> chama o PSP (camada de app) -> persiste (nucleo).
 * Gateado por isPaymentsConfigured(): sem PSP, redireciona com aviso e nada muda.
 */
export async function payInvoiceAction(fd: FormData): Promise<void> {
  const s = await session();
  if (!isPaymentsConfigured()) redirect('/portal/me?erro=falha#financeiro');

  const invoiceId = str(fd, 'invoiceId');
  const method = (str(fd, 'method') || 'pix') as PaymentMethod;
  if (!invoiceId) redirect('/portal/me?erro=campos#financeiro');

  // Trabalho de IO num bloco isolado: qualquer falha do PSP/DB cai para `falha`.
  // Os redirects de fluxo (sucesso/erro) ficam FORA do try (redirect() lança por design).
  const ok = await (async () => {
    // 1) Posse + dados mínimos da fatura (lança se não pertencer ao responsável).
    const inv = await assertGuardianOwnsInvoice(db(), s.tenantId, s.guardianId, invoiceId);
    if (inv.status !== 'aberto') return false;
    const payer = await getGuardianContact(db(), s.tenantId, s.guardianId);
    const provider = resolvePaymentProvider();

    // 2) PSP gera a cobrança (camada de app; packages não importam de apps).
    const charge = await provider.createCharge({
      invoiceId: inv.id,
      amountCents: inv.amountCents,
      description: inv.description,
      dueDate: inv.dueDate,
      method,
      payer: { name: payer?.fullName ?? 'Responsável', email: payer?.email ?? null },
    });

    // 3) Persiste os dados da cobrança na fatura.
    await setInvoiceCharge(db(), s.tenantId, invoiceId, {
      provider: provider.name,
      externalChargeId: charge.externalChargeId,
      paymentMethod: charge.method,
      paymentUrl: charge.paymentUrl ?? null,
      pixCode: charge.pixCode ?? null,
      boletoLine: charge.boletoLine ?? null,
    });
    return true;
  })().catch(() => false);

  if (!ok) redirect('/portal/me?erro=falha#financeiro');
  revalidatePath('/portal/me');
  redirect('/portal/me?ok=cobranca#financeiro');
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
