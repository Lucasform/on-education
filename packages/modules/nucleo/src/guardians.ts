import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, guardians, studentGuardians } from '@on-education/db';
import type { CreateGuardianInput, LinkGuardianInput } from '@on-education/validation';
import { eq } from 'drizzle-orm';

/**
 * Responsáveis (Fase 1A.1b). `full_name`/contato são PII (Master Spec §7.4): nunca logar.
 * Vínculo N:N aluno↔responsável com atributos (financeiro, busca, emergência).
 */
export async function createGuardian(
  client: DbClient,
  ctx: AuthContext,
  input: CreateGuardianInput,
) {
  assertCan(ctx, 'create', 'guardian');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(guardians)
      .values({
        tenantId: ctx.tenantId,
        fullName: input.fullName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listGuardians(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'guardian');
  return client.withTenant(ctx.tenantId, (tx) => tx.select().from(guardians));
}

/** Vincula um responsável a um aluno com os atributos do relacionamento. */
export async function linkGuardian(client: DbClient, ctx: AuthContext, input: LinkGuardianInput) {
  assertCan(ctx, 'create', 'student_guardian');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(studentGuardians)
      .values({
        tenantId: ctx.tenantId,
        studentId: input.studentId,
        guardianId: input.guardianId,
        relation: input.relation ?? null,
        isFinancial: input.isFinancial,
        canPickup: input.canPickup,
        isEmergency: input.isEmergency,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listStudentGuardians(client: DbClient, ctx: AuthContext, studentId: string) {
  assertCan(ctx, 'read', 'student_guardian');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.select().from(studentGuardians).where(eq(studentGuardians.studentId, studentId)),
  );
}
