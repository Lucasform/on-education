import { assertCan, type AuthContext } from '@on-education/auth';
import { academicYears, type DbClient, subjects, terms } from '@on-education/db';
import type {
  CreateAcademicYearInput,
  CreateSubjectInput,
  CreateTermInput,
} from '@on-education/validation';
import { eq } from 'drizzle-orm';

/**
 * Estrutura acadêmica da escola (Fase 1A.1b). Parte do núcleo institucional (organization):
 * RBAC + RLS por tenant. Sem feature-gate específico (faz parte do plano de escola).
 */
export async function createAcademicYear(
  client: DbClient,
  ctx: AuthContext,
  input: CreateAcademicYearInput,
) {
  assertCan(ctx, 'create', 'academic_year');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(academicYears)
      .values({
        tenantId: ctx.tenantId,
        name: input.name,
        startsOn: input.startsOn ?? null,
        endsOn: input.endsOn ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listAcademicYears(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'academic_year');
  return client.withTenant(ctx.tenantId, (tx) => tx.select().from(academicYears));
}

export async function createTerm(client: DbClient, ctx: AuthContext, input: CreateTermInput) {
  assertCan(ctx, 'create', 'term');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(terms)
      .values({
        tenantId: ctx.tenantId,
        academicYearId: input.academicYearId,
        name: input.name,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listTerms(client: DbClient, ctx: AuthContext, academicYearId?: string) {
  assertCan(ctx, 'read', 'term');
  return client.withTenant(ctx.tenantId, (tx) => {
    const q = tx.select().from(terms);
    return academicYearId ? q.where(eq(terms.academicYearId, academicYearId)) : q;
  });
}

export async function createSubject(client: DbClient, ctx: AuthContext, input: CreateSubjectInput) {
  assertCan(ctx, 'create', 'subject');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(subjects)
      .values({ tenantId: ctx.tenantId, name: input.name, createdBy: ctx.userId })
      .returning();
    return rows[0]!;
  });
}

export async function listSubjects(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'subject');
  return client.withTenant(ctx.tenantId, (tx) => tx.select().from(subjects));
}
