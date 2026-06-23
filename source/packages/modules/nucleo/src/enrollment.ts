import { assertCan, type AuthContext } from '@on-education/auth';
import {
  contractSignatures,
  enrollmentRequests,
  guardians,
  studentGuardians,
  students,
  type DbClient,
} from '@on-education/db';
import { and, desc, eq, isNull } from 'drizzle-orm';

// --- Assinatura eletrônica do contrato (click-to-sign) ---

export async function signContract(
  client: DbClient,
  ctx: AuthContext,
  input: { studentId: string; signerName: string; signerKind: 'responsavel' | 'escola'; termsSnapshot?: string | null },
) {
  const name = (input.signerName ?? '').trim();
  if (!name) throw new Error('Informe o nome de quem está assinando.');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .insert(contractSignatures)
      .values({
        tenantId: ctx.tenantId,
        studentId: input.studentId,
        signerName: name,
        signerKind: input.signerKind === 'escola' ? 'escola' : 'responsavel',
        termsSnapshot: input.termsSnapshot ?? null,
        createdBy: ctx.userId,
      })
      .returning({ id: contractSignatures.id });
    return row;
  });
}

export async function listContractSignatures(client: DbClient, ctx: AuthContext, studentId: string) {
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(contractSignatures)
      .where(and(eq(contractSignatures.studentId, studentId), isNull(contractSignatures.deletedAt)))
      .orderBy(desc(contractSignatures.signedAt)),
  );
}

export interface PublicEnrollmentInput {
  studentName: string;
  birthDate?: string | null;
  shift?: string | null;
  guardianName: string;
  guardianEmail?: string | null;
  guardianPhone?: string | null;
  guardianCpf?: string | null;
  relation?: string | null;
  notes?: string | null;
}

/**
 * Cria uma solicitação de matrícula vinda do formulário PÚBLICO (sem sessão).
 * Usa `client.db` (bypass de RLS, como o mural público) com tenantId explícito vindo da URL.
 * Fica como `pending` até a secretaria aprovar/rejeitar.
 */
export async function createEnrollmentRequest(
  client: DbClient,
  tenantId: string,
  input: PublicEnrollmentInput,
) {
  const studentName = input.studentName.trim();
  const guardianName = input.guardianName.trim();
  if (!studentName || !guardianName) throw new Error('Nome do aluno e do responsável são obrigatórios.');
  const rows = await client.db
    .insert(enrollmentRequests)
    .values({
      tenantId,
      studentName,
      birthDate: input.birthDate || null,
      shift: input.shift || null,
      guardianName,
      guardianEmail: input.guardianEmail?.trim() || null,
      guardianPhone: input.guardianPhone?.trim() || null,
      guardianCpf: input.guardianCpf?.trim() || null,
      relation: input.relation?.trim() || null,
      notes: input.notes?.trim() || null,
      status: 'pending',
    })
    .returning();
  return rows[0]!;
}

/** Lista as solicitações de matrícula (secretaria). Opcionalmente filtra por status. */
export async function listEnrollmentRequests(
  client: DbClient,
  ctx: AuthContext,
  status?: 'pending' | 'approved' | 'rejected',
) {
  assertCan(ctx, 'read', 'student');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(enrollmentRequests)
      .where(
        status
          ? and(isNull(enrollmentRequests.deletedAt), eq(enrollmentRequests.status, status))
          : isNull(enrollmentRequests.deletedAt),
      )
      .orderBy(desc(enrollmentRequests.createdAt)),
  );
}

/**
 * Aprova a solicitação: cria o aluno + responsável + vínculo numa transação e marca a
 * solicitação como `approved`. Idempotência simples: se já estiver aprovada, não duplica.
 */
export async function approveEnrollmentRequest(
  client: DbClient,
  ctx: AuthContext,
  requestId: string,
  classId?: string | null,
) {
  assertCan(ctx, 'create', 'student');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const reqRows = await tx
      .select()
      .from(enrollmentRequests)
      .where(eq(enrollmentRequests.id, requestId))
      .limit(1);
    const req = reqRows[0];
    if (!req || req.status === 'approved') return null;

    const studentRows = await tx
      .insert(students)
      .values({
        tenantId: ctx.tenantId,
        fullName: req.studentName,
        birthDate: req.birthDate ?? null,
        shift: req.shift ?? null,
        classId: classId || null,
        createdBy: ctx.userId,
      })
      .returning();
    const student = studentRows[0]!;

    const guardianRows = await tx
      .insert(guardians)
      .values({
        tenantId: ctx.tenantId,
        fullName: req.guardianName,
        email: req.guardianEmail ?? null,
        phone: req.guardianPhone ?? null,
        cpf: req.guardianCpf ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    const guardian = guardianRows[0]!;

    await tx.insert(studentGuardians).values({
      tenantId: ctx.tenantId,
      studentId: student.id,
      guardianId: guardian.id,
      relation: req.relation ?? null,
      isFinancial: true,
      canPickup: true,
      isEmergency: true,
    });

    await tx
      .update(enrollmentRequests)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(enrollmentRequests.id, requestId));

    return { studentId: student.id, guardianId: guardian.id };
  });
}

/** Rejeita a solicitação (não cria nada). */
export async function rejectEnrollmentRequest(client: DbClient, ctx: AuthContext, requestId: string) {
  assertCan(ctx, 'update', 'student');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(enrollmentRequests)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(enrollmentRequests.id, requestId)),
  );
}

/** Conta solicitações pendentes (badge no menu). */
export async function countPendingEnrollments(client: DbClient, ctx: AuthContext): Promise<number> {
  assertCan(ctx, 'read', 'student');
  const rows = await listEnrollmentRequests(client, ctx, 'pending').catch(() => []);
  return rows.length;
}
