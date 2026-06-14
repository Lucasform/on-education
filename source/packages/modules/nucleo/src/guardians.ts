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
        cpf: input.cpf ?? null,
        rg: input.rg ?? null,
        address: input.address ?? null,
        profession: input.profession ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

/**
 * Importa responsáveis em lote. Cada item tem nome e, opcionalmente, e-mail e telefone
 * (PII — nunca logar). Retorna quantos foram criados.
 */
export async function createGuardiansBulk(
  client: DbClient,
  ctx: AuthContext,
  items: { fullName: string; email?: string; phone?: string }[],
) {
  assertCan(ctx, 'create', 'guardian');
  const valid = items
    .map((i) => ({
      fullName: i.fullName.trim(),
      email: i.email?.trim() || null,
      phone: i.phone?.trim() || null,
    }))
    .filter((i) => i.fullName);
  if (valid.length === 0) return 0;
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.insert(guardians).values(
      valid.map((i) => ({
        tenantId: ctx.tenantId,
        fullName: i.fullName,
        email: i.email,
        phone: i.phone,
        createdBy: ctx.userId,
      })),
    ),
  );
  return valid.length;
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
    tx
      .select({
        id: studentGuardians.id,
        guardianId: studentGuardians.guardianId,
        relation: studentGuardians.relation,
        isFinancial: studentGuardians.isFinancial,
        canPickup: studentGuardians.canPickup,
        isEmergency: studentGuardians.isEmergency,
        guardianName: guardians.fullName,
        guardianPhone: guardians.phone,
        guardianEmail: guardians.email,
      })
      .from(studentGuardians)
      .leftJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(eq(studentGuardians.studentId, studentId)),
  );
}

/** Desfaz o vínculo aluno↔responsável (item 5). */
export async function unlinkGuardian(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'student_guardian');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.delete(studentGuardians).where(eq(studentGuardians.id, id)),
  );
}

/** Remove o responsável e todos os seus vínculos com alunos. */
export async function deleteGuardian(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'guardian');
  await client.withTenant(ctx.tenantId, async (tx) => {
    await tx.delete(studentGuardians).where(eq(studentGuardians.guardianId, id));
    await tx.delete(guardians).where(eq(guardians.id, id));
  });
}
