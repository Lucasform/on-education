import { assertCan, type AuthContext } from '@on-education/auth';
import { classes, type DbClient, students } from '@on-education/db';
import { limitFor } from '@on-education/entitlements';
import type {
  CreateClassInput,
  CreateStudentInput,
  UpdateClassInput,
} from '@on-education/validation';
import { and, count, eq, isNotNull, isNull } from 'drizzle-orm';

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
        gradeLevel: input.gradeLevel ?? null,
        ageRange: input.ageRange ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listClasses(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'class');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.select().from(classes).where(isNull(classes.deletedAt)),
  );
}

/** Uma turma pelo id (ou null). Para a tela de detalhe da turma. */
export async function getClass(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'read', 'class');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(classes)
      .where(and(eq(classes.id, id), isNull(classes.deletedAt)));
    return rows[0] ?? null;
  });
}

/** Atualiza série/faixa etária/descrição da turma (item 3). */
export async function updateClassDetails(
  client: DbClient,
  ctx: AuthContext,
  input: UpdateClassInput,
) {
  assertCan(ctx, 'update', 'class');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(classes)
      .set({
        description: input.description ?? null,
        gradeLevel: input.gradeLevel ?? null,
        ageRange: input.ageRange ?? null,
        updatedAt: new Date(),
      })
      .where(eq(classes.id, input.classId)),
  );
}

export async function createStudent(client: DbClient, ctx: AuthContext, input: CreateStudentInput) {
  assertCan(ctx, 'create', 'student');
  const planId = await assertEntitled(client, ctx.tenantId, 'classes.manage');
  const cap = limitFor(planId, 'students');

  return client.withTenant(ctx.tenantId, async (tx) => {
    // Cota por plano (essencial no freemium): -1 e undefined = sem limite.
    if (cap !== undefined && cap !== -1) {
      const rows = await tx
        .select({ total: count() })
        .from(students)
        .where(isNull(students.deletedAt));
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
        birthDate: input.birthDate ?? null,
        cpf: input.cpf ?? null,
        rg: input.rg ?? null,
        gender: input.gender ?? null,
        nationality: input.nationality ?? null,
        shift: input.shift ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return inserted[0]!;
  });
}

export async function listStudents(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'student');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.select().from(students).where(isNull(students.deletedAt)),
  );
}

/** Um aluno pelo id (evita listar todos só para achar um na ficha/relatório). */
export async function getStudent(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'read', 'student');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(students)
      .where(and(eq(students.id, id), isNull(students.deletedAt)));
    return rows[0] ?? null;
  });
}

// Soft delete (poder voltar): marca deletedAt. Exclusão física só via Lixeira (gestor).
export async function deleteClass(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'class');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(classes).set({ deletedAt: new Date() }).where(eq(classes.id, id)),
  );
}

export async function restoreClass(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'class');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(classes).set({ deletedAt: null }).where(eq(classes.id, id)),
  );
}

export async function deleteStudent(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'student');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(students).set({ deletedAt: new Date() }).where(eq(students.id, id)),
  );
}

export async function restoreStudent(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'student');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(students).set({ deletedAt: null }).where(eq(students.id, id)),
  );
}

/** Itens na lixeira (soft-deleted) para restaurar. */
export async function listDeletedClasses(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'class');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.select().from(classes).where(isNotNull(classes.deletedAt)),
  );
}

export async function listDeletedStudents(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'student');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.select().from(students).where(isNotNull(students.deletedAt)),
  );
}

/** Importa turmas em lote (uma por nome). Ignora linhas vazias. Retorna quantas criou. */
export async function createClassesBulk(client: DbClient, ctx: AuthContext, names: string[]) {
  assertCan(ctx, 'create', 'class');
  await assertEntitled(client, ctx.tenantId, 'classes.manage');
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return 0;
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .insert(classes)
      .values(clean.map((name) => ({ tenantId: ctx.tenantId, name, createdBy: ctx.userId }))),
  );
  return clean.length;
}

/** Atualiza campos opcionais do perfil do aluno (endereço, informações médicas, emergência, foto). */
export async function updateStudentProfile(
  client: DbClient,
  ctx: AuthContext,
  id: string,
  input: {
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    bloodType?: string | null;
    allergies?: string | null;
    medicalNotes?: string | null;
    emergencyName?: string | null;
    emergencyPhone?: string | null;
    emergencyRelation?: string | null;
    photoUrl?: string | null;
    cpf?: string | null;
    rg?: string | null;
    gender?: string | null;
    nationality?: string | null;
    shift?: string | null;
  },
) {
  assertCan(ctx, 'update', 'student');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(students)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(students.id, id), isNull(students.deletedAt))),
  );
}

/** Move um aluno para outra turma (ou remove de turma com null). */
export async function transferStudentClass(
  client: DbClient,
  ctx: AuthContext,
  studentId: string,
  classId: string | null,
) {
  assertCan(ctx, 'update', 'student');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(students)
      .set({ classId, updatedAt: new Date() })
      .where(and(eq(students.id, studentId), isNull(students.deletedAt))),
  );
}

/**
 * Importa alunos em lote. Cada item tem nome e, opcionalmente, o nome da turma (resolvido
 * para uma turma existente). Respeita a cota de alunos do plano.
 */
export async function createStudentsBulk(
  client: DbClient,
  ctx: AuthContext,
  items: { fullName: string; className?: string; birthDate?: string }[],
) {
  assertCan(ctx, 'create', 'student');
  const planId = await assertEntitled(client, ctx.tenantId, 'classes.manage');
  const cap = limitFor(planId, 'students');
  const valid = items
    .map((i) => ({
      fullName: i.fullName.trim(),
      className: i.className?.trim(),
      birthDate: i.birthDate?.trim() || null,
    }))
    .filter((i) => i.fullName);
  if (valid.length === 0) return 0;

  return client.withTenant(ctx.tenantId, async (tx) => {
    if (cap !== undefined && cap !== -1) {
      const rows = await tx
        .select({ total: count() })
        .from(students)
        .where(isNull(students.deletedAt));
      const total = rows[0]?.total ?? 0;
      if (total + valid.length > cap) {
        throw new Error(`Limite de alunos do plano (${cap}) seria excedido. Faça upgrade.`);
      }
    }
    const turmas = await tx.select({ id: classes.id, name: classes.name }).from(classes);
    const byName = new Map(turmas.map((t) => [t.name.toLowerCase(), t.id]));
    await tx.insert(students).values(
      valid.map((i) => ({
        tenantId: ctx.tenantId,
        fullName: i.fullName,
        classId: i.className ? (byName.get(i.className.toLowerCase()) ?? null) : null,
        birthDate: i.birthDate,
        createdBy: ctx.userId,
      })),
    );
    return valid.length;
  });
}
