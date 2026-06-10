import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, lessonPlans, subjects } from '@on-education/db';
import {
  type AiProvider,
  assertWithinQuota,
  createAnthropicProvider,
  recordUsage,
} from '@on-education/module-ia';
import { applyAiStandard, assertEntitled, getAiStandard } from '@on-education/module-nucleo';
import type { CreateLessonPlanInput, GenerateLessonPlanInput } from '@on-education/validation';
import { and, desc, eq, isNull } from 'drizzle-orm';

/**
 * Planejamento (itens 7.1/7.3): plano de aula, avaliação ou trabalho por turma/matéria.
 * Checagem tripla (RBAC `lesson` + entitlement `classes.manage` + RLS). Soft delete.
 */
const FEATURE = 'classes.manage';

export async function createLessonPlan(
  client: DbClient,
  ctx: AuthContext,
  input: CreateLessonPlanInput,
) {
  assertCan(ctx, 'create', 'lesson');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(lessonPlans)
      .values({
        tenantId: ctx.tenantId,
        classId: input.classId,
        subjectId: input.subjectId ?? null,
        kind: input.kind,
        title: input.title,
        content: input.content ?? null,
        date: input.date ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

/**
 * Gera um plano (de aula/avaliação/trabalho) completo com o WayOn e já salva no
 * planejamento da turma. BNCC é OPCIONAL: quando `useBncc`, pede o alinhamento e
 * cita os códigos como SUGESTÃO a confirmar (o professor revisa). Consome cota.
 */
export async function generateLessonPlanWithWayOn(
  client: DbClient,
  ctx: AuthContext,
  input: GenerateLessonPlanInput,
  provider?: AiProvider,
) {
  assertCan(ctx, 'create', 'lesson');
  const planId = await assertEntitled(client, ctx.tenantId, 'ai.activities');
  await assertWithinQuota(client, ctx.tenantId, planId);

  const ai = provider ?? createAnthropicProvider('sonnet');
  const standard = await getAiStandard(client, ctx);

  const ESTRUTURA: Record<GenerateLessonPlanInput['kind'], string> = {
    aula:
      'Estruture um PLANO DE AULA com estas seções, nesta ordem: Tema; Objetivos de ' +
      'aprendizagem; Conteúdos; Recursos/materiais; Desenvolvimento passo a passo (com tempo ' +
      'estimado por etapa); Avaliação da aprendizagem; Tarefa de casa (se fizer sentido).',
    avaliacao:
      'Estruture uma AVALIAÇÃO com: Objetivos avaliados; Instruções ao aluno; Questões ' +
      '(variadas, com pontuação por questão); Gabarito/critérios de correção ao final.',
    trabalho:
      'Estruture um TRABALHO/projeto com: Objetivo; Orientações; Etapas; Formato de entrega; ' +
      'Critérios de avaliação (rubrica).',
  };

  const bnccLine = input.useBncc
    ? ' Alinhe à BNCC: indique competências/habilidades pertinentes e cite os CÓDIGOS ' +
      '(ex.: EF05MA01) como SUGESTÃO para o professor confirmar. Não invente código que não ' +
      'exista; se não tiver certeza, descreva a habilidade sem o código.' +
      (input.bncc
        ? ` Considere especialmente esta habilidade indicada pelo professor: ${input.bncc}.`
        : '')
    : '';

  const system = applyAiStandard(
    `Você é o WayOn, um assistente pedagógico brasileiro. ${ESTRUTURA[input.kind]} Escreva em ` +
      'português do Brasil, pronto para uso, com títulos de seção em markdown. Sem comentários ' +
      `fora do plano.${bnccLine}`,
    standard,
  );
  const prompt =
    `Gere sobre o tema: ${input.topic}.` +
    (input.gradeLevel ? ` Série/ano: ${input.gradeLevel}.` : '') +
    (input.durationMin ? ` Duração da aula: ${input.durationMin} minutos.` : '') +
    (input.notes ? ` Observações do professor: ${input.notes}.` : '');

  const result = await ai.generate({ prompt, system });

  const plano = await client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(lessonPlans)
      .values({
        tenantId: ctx.tenantId,
        classId: input.classId,
        subjectId: input.subjectId ?? null,
        kind: input.kind,
        title: input.topic.slice(0, 300),
        content: result.text.slice(0, 20_000),
        date: null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });

  await recordUsage(client, ctx.tenantId, result.tokensIn + result.tokensOut);
  return plano;
}

/** Planos (com nome da matéria), opcionalmente filtrados por turma. Mais recentes primeiro. */
export async function listLessonPlans(client: DbClient, ctx: AuthContext, classId?: string) {
  assertCan(ctx, 'read', 'lesson');
  return client.withTenant(ctx.tenantId, (tx) => {
    const q = tx
      .select({
        id: lessonPlans.id,
        classId: lessonPlans.classId,
        subjectId: lessonPlans.subjectId,
        subjectName: subjects.name,
        kind: lessonPlans.kind,
        title: lessonPlans.title,
        content: lessonPlans.content,
        date: lessonPlans.date,
      })
      .from(lessonPlans)
      .leftJoin(subjects, eq(subjects.id, lessonPlans.subjectId))
      .where(
        classId
          ? and(eq(lessonPlans.classId, classId), isNull(lessonPlans.deletedAt))
          : isNull(lessonPlans.deletedAt),
      )
      .orderBy(desc(lessonPlans.createdAt));
    return q;
  });
}

export async function deleteLessonPlan(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'lesson');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(lessonPlans).set({ deletedAt: new Date() }).where(eq(lessonPlans.id, id)),
  );
}
