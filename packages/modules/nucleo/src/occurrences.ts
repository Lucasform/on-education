import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, occurrenceStudents, occurrences } from '@on-education/db';
import type { CreateOccurrenceInput } from '@on-education/validation';
import { desc, eq, isNull } from 'drizzle-orm';

/**
 * Ocorrências do aluno (Fase 1A). Dado sensível de menores: nunca logar.
 * Vinculável a 1 ou vários alunos. Checagem tripla; soft delete.
 */
export async function createOccurrence(
  client: DbClient,
  ctx: AuthContext,
  input: CreateOccurrenceInput,
) {
  assertCan(ctx, 'create', 'occurrence');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(occurrences)
      .values({
        tenantId: ctx.tenantId,
        title: input.title,
        description: input.description ?? null,
        date: input.date,
        severity: input.severity,
        createdBy: ctx.userId,
      })
      .returning();
    const oc = rows[0]!;
    await tx.insert(occurrenceStudents).values(
      input.studentIds.map((studentId) => ({
        tenantId: ctx.tenantId,
        occurrenceId: oc.id,
        studentId,
        createdBy: ctx.userId,
      })),
    );
    return oc;
  });
}

export async function listOccurrences(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'occurrence');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(occurrences)
      .where(isNull(occurrences.deletedAt))
      .orderBy(desc(occurrences.date), desc(occurrences.createdAt)),
  );
}

/** Vínculos ocorrência↔aluno do tenant (para montar os nomes na UI). */
export async function listOccurrenceLinks(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'occurrence');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select({
        occurrenceId: occurrenceStudents.occurrenceId,
        studentId: occurrenceStudents.studentId,
      })
      .from(occurrenceStudents),
  );
}

export async function deleteOccurrence(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'occurrence');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(occurrences).set({ deletedAt: new Date() }).where(eq(occurrences.id, id)),
  );
}
