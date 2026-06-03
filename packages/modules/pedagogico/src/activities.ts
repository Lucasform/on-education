import { assertCan, type AuthContext } from '@on-education/auth';
import { activities, type DbClient } from '@on-education/db';
import {
  type AiProvider,
  assertWithinQuota,
  createAnthropicProvider,
  recordUsage,
} from '@on-education/module-ia';
import { applyAiStandard, assertEntitled, getAiStandard } from '@on-education/module-nucleo';
import type {
  CreateActivityInput,
  GenerateActivityInput,
  SearchActivitiesInput,
  UpdateActivityInput,
} from '@on-education/validation';
import { and, arrayContains, desc, eq, ilike, isNotNull, isNull } from 'drizzle-orm';

/**
 * Banco de atividades pessoal (Fase 1B.3). Disponível a 🏫 e 👤 via entitlement
 * `activities.bank`. Checagem tripla em toda operação; soft delete (Master Spec §5).
 */
const FEATURE = 'activities.bank' as const;

export async function createActivity(
  client: DbClient,
  ctx: AuthContext,
  input: CreateActivityInput,
) {
  assertCan(ctx, 'create', 'activity');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(activities)
      .values({
        tenantId: ctx.tenantId,
        title: input.title,
        subject: input.subject ?? null,
        content: input.content,
        tags: input.tags,
        aiGenerated: input.aiGenerated,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

/**
 * Gera uma atividade pelo EduON (IA) e já salva no banco. Checagem tripla + cota;
 * consumo medido por tenant. Provider injetável (testes).
 */
export async function generateActivityWithEduON(
  client: DbClient,
  ctx: AuthContext,
  input: GenerateActivityInput,
  provider?: AiProvider,
) {
  assertCan(ctx, 'create', 'activity');
  const planId = await assertEntitled(client, ctx.tenantId, 'ai.activities');
  await assertWithinQuota(client, ctx.tenantId, planId);

  const ai = provider ?? createAnthropicProvider('sonnet');
  const standard = await getAiStandard(client, ctx);
  const system = applyAiStandard(
    'Você é o EduON, um assistente pedagógico. Gere uma atividade pedagógica completa e pronta ' +
      'para uso em português do Brasil (enunciado, questões/exercícios e, quando fizer sentido, ' +
      'gabarito ao final). Responda apenas com o conteúdo da atividade, sem comentários.',
    standard,
  );
  const prompt =
    `Crie uma atividade sobre: ${input.topic}.` +
    (input.subject ? ` Disciplina: ${input.subject}.` : '') +
    (input.level ? ` Nível/ano: ${input.level}.` : '');

  const result = await ai.generate({ prompt, system });

  const atividade = await client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(activities)
      .values({
        tenantId: ctx.tenantId,
        title: input.topic.slice(0, 200),
        subject: input.subject ?? null,
        content: result.text,
        tags: ['eduon'],
        aiGenerated: true,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });

  await recordUsage(client, ctx.tenantId, result.tokensIn + result.tokensOut);
  return atividade;
}

export async function updateActivity(
  client: DbClient,
  ctx: AuthContext,
  id: string,
  input: UpdateActivityInput,
) {
  assertCan(ctx, 'update', 'activity');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .update(activities)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(activities.id, id))
      .returning();
    return rows[0] ?? null;
  });
}

export async function deleteActivity(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'activity');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(activities).set({ deletedAt: new Date() }).where(eq(activities.id, id)),
  );
}

export async function restoreActivity(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'activity');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(activities).set({ deletedAt: null }).where(eq(activities.id, id)),
  );
}

export async function listDeletedActivities(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'activity');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.select().from(activities).where(isNotNull(activities.deletedAt)),
  );
}

export async function listActivities(
  client: DbClient,
  ctx: AuthContext,
  search: SearchActivitiesInput = {},
) {
  assertCan(ctx, 'read', 'activity');
  return client.withTenant(ctx.tenantId, (tx) => {
    const filters = [isNull(activities.deletedAt)];
    if (search.tag) filters.push(arrayContains(activities.tags, [search.tag]));
    if (search.q) filters.push(ilike(activities.title, `%${search.q}%`));
    return tx
      .select()
      .from(activities)
      .where(and(...filters))
      .orderBy(desc(activities.updatedAt));
  });
}
