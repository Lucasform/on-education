import { assertCan, type AuthContext } from '@on-education/auth';
import { aiDrafts, type DbClient } from '@on-education/db';
import type { Feature } from '@on-education/entitlements';
import { applyAiStandard, assertEntitled, getAiStandard } from '@on-education/module-nucleo';
import type { AiDraftKind, GenerateDraftInput } from '@on-education/validation';
import { eq } from 'drizzle-orm';

import { type AiProvider, createAnthropicProvider } from './provider';
import { assertWithinQuota, recordUsage } from './quota';

/**
 * Geração de rascunhos com human-in-the-loop (Fase 1B.2, Master Spec §9.3):
 * a saída da IA nasce como `draft`; o professor revisa e aprova (ou descarta).
 * Checagem tripla + cota antes de gerar; consumo medido por tenant após gerar.
 * O `provider` é injetável (testes usam um fake; produção usa Anthropic).
 */
const FEATURE_BY_KIND: Record<AiDraftKind, Feature> = {
  lesson_plan: 'ai.lessonPlan',
  activity: 'ai.activities',
  essay: 'ai.activities',
  tutor: 'ai.activities',
};

const SYSTEM_BY_KIND: Record<AiDraftKind, string> = {
  lesson_plan:
    'Você é um assistente pedagógico. Gere um plano de aula claro e prático em português. ' +
    'É um RASCUNHO para o professor revisar e ajustar.',
  activity:
    'Você é um assistente pedagógico. Gere uma atividade pedagógica em português. ' +
    'É um RASCUNHO para o professor revisar e ajustar.',
  essay:
    'Você é um corretor de redações. Avalie o texto a seguir por competências (tema, coesão, ' +
    'coerência, gramática, proposta), aponte pontos fortes e o que melhorar, e sugira uma nota. ' +
    'É um RASCUNHO de correção para o professor revisar; não é a nota final.',
  tutor:
    'Você é um tutor paciente para estudantes. Responda de forma clara e adequada à idade, ' +
    'explicando o raciocínio passo a passo. Não faça a tarefa pelo aluno: oriente para ele ' +
    'chegar à resposta. Conteúdo seguro e apropriado.',
};

export async function generateDraft(
  client: DbClient,
  ctx: AuthContext,
  input: GenerateDraftInput,
  provider?: AiProvider,
) {
  assertCan(ctx, 'create', 'ai_draft');
  const planId = await assertEntitled(client, ctx.tenantId, FEATURE_BY_KIND[input.kind]);
  await assertWithinQuota(client, ctx.tenantId, planId);

  const ai = provider ?? createAnthropicProvider('sonnet');
  const standard = await getAiStandard(client, ctx);
  const result = await ai.generate({
    prompt: input.prompt,
    system: applyAiStandard(SYSTEM_BY_KIND[input.kind], standard),
  });

  const draft = await client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(aiDrafts)
      .values({
        tenantId: ctx.tenantId,
        kind: input.kind,
        prompt: input.prompt,
        output: result.text,
        status: 'draft',
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });

  await recordUsage(client, ctx.tenantId, result.tokensIn + result.tokensOut);
  return draft;
}

export async function listDrafts(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'ai_draft');
  return client.withTenant(ctx.tenantId, (tx) => tx.select().from(aiDrafts));
}

async function setStatus(client: DbClient, ctx: AuthContext, id: string, status: string) {
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .update(aiDrafts)
      .set({ status, updatedAt: new Date() })
      .where(eq(aiDrafts.id, id))
      .returning();
    return rows[0] ?? null;
  });
}

/** Aprovação humana do rascunho (human-in-the-loop). */
export async function approveDraft(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'update', 'ai_draft');
  return setStatus(client, ctx, id, 'approved');
}

export async function discardDraft(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'update', 'ai_draft');
  return setStatus(client, ctx, id, 'discarded');
}
