import { assertCan, type AuthContext } from '@on-education/auth';
import { activities, type DbClient, sharedActivities } from '@on-education/db';
import type { ShareCollectiveInput } from '@on-education/validation';
import { desc, eq, inArray } from 'drizzle-orm';

import { createActivity } from './activities';

/**
 * Banco de atividades coletivas (item 13): biblioteca GLOBAL por faixa etária (ADR 0004).
 * Conteúdo pedagógico não sensível; sem vínculo com a escola. Acesso pela conexão dona
 * (`client.db`, fora do RLS de tenant), já que a tabela é compartilhada por todos.
 */
export async function listCollective(client: DbClient, ageRange?: string) {
  const base = client.db.select().from(sharedActivities);
  const rows = await (
    ageRange ? base.where(eq(sharedActivities.ageRange, ageRange)) : base
  ).orderBy(desc(sharedActivities.createdAt));
  return rows;
}

/** Remove itens do banco coletivo (admin). Tabela global, fora do RLS de tenant. */
export async function removeCollectiveItems(client: DbClient, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await client.db.delete(sharedActivities).where(inArray(sharedActivities.id, ids));
}

/** Uma atividade do banco coletivo, para visualização antes de copiar. */
export async function getCollective(client: DbClient, id: string) {
  const rows = await client.db.select().from(sharedActivities).where(eq(sharedActivities.id, id));
  return rows[0] ?? null;
}

/** Publica uma atividade do professor no banco coletivo (sem identificar a escola). */
export async function shareToCollective(
  client: DbClient,
  ctx: AuthContext,
  input: ShareCollectiveInput,
) {
  assertCan(ctx, 'read', 'activity');
  const atividade = await client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx.select().from(activities).where(eq(activities.id, input.activityId));
    return rows[0] ?? null;
  });
  if (!atividade) throw new Error('Atividade não encontrada.');

  const rows = await client.db
    .insert(sharedActivities)
    .values({
      title: atividade.title,
      subject: atividade.subject,
      content: atividade.content,
      ageRange: input.ageRange,
      tags: atividade.tags,
      createdBy: ctx.userId,
    })
    .returning();
  return rows[0]!;
}

/** Copia uma atividade do banco coletivo para o banco da escola/professor. */
export async function copyFromCollective(client: DbClient, ctx: AuthContext, sharedId: string) {
  const shared = (
    await client.db.select().from(sharedActivities).where(eq(sharedActivities.id, sharedId))
  )[0];
  if (!shared) throw new Error('Atividade coletiva não encontrada.');
  return createActivity(client, ctx, {
    title: shared.title,
    kind: 'atividade',
    subject: shared.subject ?? undefined,
    content: shared.content,
    tags: [...new Set([...(shared.tags ?? []), 'coletivo'])],
    aiGenerated: false,
    approved: true,
  });
}
