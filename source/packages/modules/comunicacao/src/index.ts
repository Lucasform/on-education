export * from './messages';
export * from './feed';

import { assertCan, type AuthContext } from '@on-education/auth';
import { communicationReads, communications, type DbClient } from '@on-education/db';
import { assertEntitled } from '@on-education/module-nucleo';
import {
  type AiProvider,
  assertWithinQuota,
  recordUsage,
  resolveTenantProvider,
} from '@on-education/module-ia';
import type {
  CreateCommunicationInput,
  GenerateCommunicationInput,
} from '@on-education/validation';
import { and, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';

/**
 * Mural PÚBLICO dos pais (item 12): comunicados publicados de um tenant, lidos pela conexão
 * dona (sem sessão de usuário, fora do RLS). Só `published` e não deletados; nenhum rascunho.
 * Acesso por link com o id do tenant (UUID não enumerável). Portal autenticado virá depois.
 */
export async function listPublicMural(client: DbClient, tenantId: string) {
  return client.db
    .select({
      id: communications.id,
      title: communications.title,
      body: communications.body,
      createdAt: communications.createdAt,
    })
    .from(communications)
    .where(
      and(
        eq(communications.tenantId, tenantId),
        eq(communications.status, 'published'),
        isNull(communications.deletedAt),
      ),
    )
    .orderBy(desc(communications.createdAt));
}

/**
 * Comunicados (Comunicação). Checagem tripla (RBAC + entitlement + RLS). Gate em
 * `communication.light` (todos os planos têm). A geração por IA usa o provider do módulo de
 * IA com cota por tenant e human-in-the-loop (sai como rascunho para revisão).
 */
const FEATURE = 'communication.light';

const SYSTEM =
  'Você é assistente de comunicação de uma instituição de ensino. Escreva um comunicado ' +
  'oficial claro, cordial e objetivo em português do Brasil. Retorne apenas o corpo do texto.';

export async function createCommunication(
  client: DbClient,
  ctx: AuthContext,
  input: CreateCommunicationInput,
  aiGenerated = false,
) {
  assertCan(ctx, 'create', 'communication');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(communications)
      .values({
        tenantId: ctx.tenantId,
        title: input.title,
        body: input.body,
        status: 'draft',
        aiGenerated,
        classId: input.classId ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listCommunications(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'communication');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(communications)
      .where(isNull(communications.deletedAt))
      .orderBy(desc(communications.createdAt)),
  );
}

/**
 * Registra que um responsável leu um comunicado (chamado quando ele abre o portal).
 * Idempotente: unique (tenant, comunicado, responsável) com ON CONFLICT DO NOTHING.
 * Usa `client.db` (sessão do portal não tem ctx autenticado de tenant via RBAC).
 */
export async function markCommunicationsRead(
  client: DbClient,
  tenantId: string,
  guardianId: string,
  communicationIds: string[],
) {
  if (communicationIds.length === 0) return;
  await client.db
    .insert(communicationReads)
    .values(
      communicationIds.map((communicationId) => ({ tenantId, communicationId, guardianId })),
    )
    .onConflictDoNothing();
}

/** Contagem de leituras por comunicado (para o painel da escola). Retorna Map<commId, total>. */
export async function countCommunicationReads(
  client: DbClient,
  ctx: AuthContext,
): Promise<Record<string, number>> {
  assertCan(ctx, 'read', 'communication');
  const rows = await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select({ communicationId: communicationReads.communicationId, total: sql<number>`count(*)::int` })
      .from(communicationReads)
      .groupBy(communicationReads.communicationId),
  );
  const out: Record<string, number> = {};
  for (const r of rows) out[r.communicationId] = Number(r.total);
  return out;
}

/** IDs de comunicados já lidos por um responsável (evita recontar no portal). */
export async function listReadCommunicationIds(
  client: DbClient,
  tenantId: string,
  guardianId: string,
  communicationIds: string[],
): Promise<Set<string>> {
  if (communicationIds.length === 0) return new Set();
  const rows = await client.db
    .select({ communicationId: communicationReads.communicationId })
    .from(communicationReads)
    .where(
      and(
        eq(communicationReads.tenantId, tenantId),
        eq(communicationReads.guardianId, guardianId),
        inArray(communicationReads.communicationId, communicationIds),
      ),
    );
  return new Set(rows.map((r) => r.communicationId));
}

export async function listDeletedCommunications(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'communication');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.select().from(communications).where(isNotNull(communications.deletedAt)),
  );
}

export async function restoreCommunication(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'communication');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(communications).set({ deletedAt: null }).where(eq(communications.id, id)),
  );
}

export async function setCommunicationStatus(
  client: DbClient,
  ctx: AuthContext,
  id: string,
  status: 'draft' | 'published',
) {
  assertCan(ctx, 'update', 'communication');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .update(communications)
      .set({ status, updatedAt: new Date() })
      .where(eq(communications.id, id))
      .returning();
    return rows[0] ?? null;
  });
}

export async function deleteCommunication(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'communication');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(communications).set({ deletedAt: new Date() }).where(eq(communications.id, id)),
  );
}

/**
 * Gera um comunicado por IA a partir de um pedido curto e salva como rascunho (o humano
 * revisa e publica). Mede tokens na cota do tenant. `provider` injetável (testes).
 */
export async function generateCommunication(
  client: DbClient,
  ctx: AuthContext,
  input: GenerateCommunicationInput,
  provider?: AiProvider,
) {
  assertCan(ctx, 'create', 'communication');
  const planId = await assertEntitled(client, ctx.tenantId, 'ai.activities');
  await assertWithinQuota(client, ctx.tenantId, planId);

  const p = provider ?? (await resolveTenantProvider(client, ctx));
  const result = await p.generate({ prompt: input.prompt, system: SYSTEM });
  await recordUsage(client, ctx.tenantId, result.tokensIn + result.tokensOut);

  const title = input.prompt.length > 80 ? `${input.prompt.slice(0, 77)}...` : input.prompt;
  return createCommunication(client, ctx, { title, body: result.text }, true);
}
