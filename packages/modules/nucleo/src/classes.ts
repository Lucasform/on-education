import { assertCan, type AuthContext } from '@on-education/auth';
import { classes, type DbClient, students } from '@on-education/db';
import { limitFor } from '@on-education/entitlements';
import type { CreateClassInput, CreateStudentInput } from '@on-education/validation';
import { count } from 'drizzle-orm';

import { assertEntitled } from './entitlement';

/**
 * Serviços de turmas/alunos (Fase 1B.1). Toda operação passa pela checagem tripla:
 * RBAC (assertCan) + entitlement (assertEntitled) + RLS (withTenant injeta app.tenant_id).
 * O tenant_id vem SEMPRE do AuthContext da sessão, nunca de parâmetro do client.
 */

export async function createClass(client: DbClient, ctx: AuthContext, input: CreateClassInput) {
  assertCan(ctx, 'create', 'class');
  await assertEntitled(client, ctx.tenantId, 'classes.manage');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(classes)
      .values({
        tenantId: ctx.tenantId,
        name: input.name,
        description: input.description ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listClasses(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'class');
  return client.withTenant(ctx.tenantId, (tx) => tx.select().from(classes));
}

export async function createStudent(client: DbClient, ctx: AuthContext, input: CreateStudentInput) {
  assertCan(ctx, 'create', 'student');
  const planId = await assertEntitled(client, ctx.tenantId, 'classes.manage');
  const cap = limitFor(planId, 'students');

  return client.withTenant(ctx.tenantId, async (tx) => {
    // Cota por plano (essencial no freemium): -1 e undefined = sem limite.
    if (cap !== undefined && cap !== -1) {
      const rows = await tx.select({ total: count() }).from(students);
      const total = rows[0]?.total ?? 0;
      if (total >= cap) {
        throw new Error(`Limite de alunos do plano atingido (${cap}). Faça upgrade do plano.`);
      }
    }
    const inserted = await tx
      .insert(students)
      .values({
        tenantId: ctx.tenantId,
        fullName: input.fullName,
        classId: input.classId ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return inserted[0]!;
  });
}

export async function listStudents(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'student');
  return client.withTenant(ctx.tenantId, (tx) => tx.select().from(students));
}
