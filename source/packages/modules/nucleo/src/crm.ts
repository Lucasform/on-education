import type { AuthContext } from '@on-education/auth';
import { type DbClient, leads } from '@on-education/db';
import { desc, eq, isNull } from 'drizzle-orm';

export interface CreateLeadInput {
  name: string;
  guardianName?: string | null;
  contact?: string | null;
  source?: string;
  interestGrade?: string | null;
  notes?: string | null;
}

const STAGES = new Set(['novo', 'contato', 'visita', 'matriculado', 'perdido']);

export async function createLead(client: DbClient, ctx: AuthContext, input: CreateLeadInput) {
  const name = (input.name ?? '').trim();
  if (!name) throw new Error('Informe o nome do interessado.');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.insert(leads).values({
      tenantId: ctx.tenantId,
      name,
      guardianName: input.guardianName || null,
      contact: input.contact || null,
      source: input.source || 'outro',
      interestGrade: input.interestGrade || null,
      notes: input.notes || null,
      createdBy: ctx.userId,
    }),
  );
}

export async function listLeads(client: DbClient, ctx: AuthContext) {
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(leads)
      .where(isNull(leads.deletedAt))
      .orderBy(desc(leads.createdAt))
      .limit(500),
  );
}

export async function setLeadStage(client: DbClient, ctx: AuthContext, id: string, stage: string) {
  const s = STAGES.has(stage) ? stage : 'novo';
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(leads).set({ stage: s, updatedAt: new Date() }).where(eq(leads.id, id)),
  );
}

export async function deleteLead(client: DbClient, ctx: AuthContext, id: string) {
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(leads).set({ deletedAt: new Date() }).where(eq(leads.id, id)),
  );
}
