import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, quizQuestions, quizzes, quizAttempts } from '@on-education/db';
import {
  type AiProvider,
  assertWithinQuota,
  createAnthropicProvider,
  recordUsage,
} from '@on-education/module-ia';
import { applyAiStandard, assertEntitled, getAiStandard } from '@on-education/module-nucleo';
import type {
  AddQuizQuestionInput,
  CreateQuizInput,
  GenerateQuizInput,
  SubmitQuizAttemptInput,
} from '@on-education/validation';
import { asc, desc, eq, isNull } from 'drizzle-orm';

/**
 * Simulados/Quizzes (Fase 1B.3). Disponível a 🏫 e 👤 via entitlement `activities.bank`.
 * Checagem tripla em toda operação; correção automática no envio da tentativa.
 */
const FEATURE = 'activities.bank' as const;

export async function createQuiz(client: DbClient, ctx: AuthContext, input: CreateQuizInput) {
  assertCan(ctx, 'create', 'quiz');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(quizzes)
      .values({
        tenantId: ctx.tenantId,
        title: input.title,
        description: input.description ?? null,
        subject: input.subject ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

type GeradaQuestao = { prompt: string; options: string[]; correctIndex: number };

/** Extrai e valida o JSON de questões vindo do modelo (tolerante a cercas ```json). */
function parseQuestoes(text: string): GeradaQuestao[] {
  const limpo = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const ini = limpo.indexOf('{');
  const fim = limpo.lastIndexOf('}');
  if (ini === -1 || fim === -1) throw new Error('O EduON não retornou um simulado válido.');
  let dados: unknown;
  try {
    dados = JSON.parse(limpo.slice(ini, fim + 1));
  } catch {
    throw new Error('O EduON não retornou um simulado válido. Tente de novo.');
  }
  const lista = (dados as { questions?: unknown }).questions;
  if (!Array.isArray(lista)) throw new Error('O EduON não retornou questões. Tente de novo.');
  const questoes: GeradaQuestao[] = [];
  for (const q of lista) {
    const prompt = String((q as GeradaQuestao)?.prompt ?? '').trim();
    const options = (q as GeradaQuestao)?.options;
    const correctIndex = Number((q as GeradaQuestao)?.correctIndex);
    if (
      prompt &&
      Array.isArray(options) &&
      options.length >= 2 &&
      Number.isInteger(correctIndex) &&
      correctIndex >= 0 &&
      correctIndex < options.length
    ) {
      questoes.push({
        prompt,
        options: options.map((o) => String(o).trim()).filter(Boolean),
        correctIndex,
      });
    }
  }
  if (questoes.length === 0)
    throw new Error('O EduON não conseguiu gerar questões. Tente de novo.');
  return questoes;
}

/**
 * Gera um simulado completo com o EduON (IA): cria o quiz e as questões de múltipla escolha
 * já corrigíveis. Checagem tripla + cota; consumo medido por tenant. Provider injetável.
 */
export async function generateQuizWithEduON(
  client: DbClient,
  ctx: AuthContext,
  input: GenerateQuizInput,
  provider?: AiProvider,
) {
  assertCan(ctx, 'create', 'quiz');
  const planId = await assertEntitled(client, ctx.tenantId, 'ai.activities');
  await assertWithinQuota(client, ctx.tenantId, planId);

  const ai = provider ?? createAnthropicProvider('sonnet');
  const standard = await getAiStandard(client, ctx);
  const system = applyAiStandard(
    'Você é o EduON, um assistente pedagógico. Gere questões de múltipla escolha em português ' +
      'do Brasil. Responda APENAS com JSON válido, sem nenhum texto fora do JSON, no formato: ' +
      '{"questions":[{"prompt":"enunciado","options":["a","b","c","d"],"correctIndex":0}]}. ' +
      'Use 4 alternativas por questão e correctIndex é o índice (0-based) da correta.',
    standard,
  );
  const prompt =
    `Gere ${input.count} questões de múltipla escolha sobre: ${input.topic}.` +
    (input.subject ? ` Disciplina: ${input.subject}.` : '') +
    (input.level ? ` Dificuldade/nível: ${input.level}.` : '');

  const result = await ai.generate({ prompt, system });
  const questoes = parseQuestoes(result.text);

  const quiz = await client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(quizzes)
      .values({
        tenantId: ctx.tenantId,
        title: input.topic.slice(0, 120),
        description: 'Gerado pelo EduON',
        subject: input.subject ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    const novo = rows[0]!;
    await tx.insert(quizQuestions).values(
      questoes.map((q, i) => ({
        tenantId: ctx.tenantId,
        quizId: novo.id,
        prompt: q.prompt,
        options: q.options,
        correctIndex: Math.min(q.correctIndex, q.options.length - 1),
        position: i,
        createdBy: ctx.userId,
      })),
    );
    return novo;
  });

  await recordUsage(client, ctx.tenantId, result.tokensIn + result.tokensOut);
  return quiz;
}

export async function listQuizzes(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'quiz');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.select().from(quizzes).where(isNull(quizzes.deletedAt)).orderBy(desc(quizzes.createdAt)),
  );
}

export async function getQuiz(client: DbClient, ctx: AuthContext, quizId: string) {
  assertCan(ctx, 'read', 'quiz');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const quiz = (await tx.select().from(quizzes).where(eq(quizzes.id, quizId)))[0] ?? null;
    if (!quiz) return null;
    const questions = await tx
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(asc(quizQuestions.position), asc(quizQuestions.createdAt));
    return { quiz, questions };
  });
}

export async function addQuizQuestion(
  client: DbClient,
  ctx: AuthContext,
  input: AddQuizQuestionInput,
) {
  assertCan(ctx, 'update', 'quiz');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  // O índice correto precisa apontar para uma opção existente.
  const correctIndex = Math.min(input.correctIndex, input.options.length - 1);
  return client.withTenant(ctx.tenantId, async (tx) => {
    const existing = await tx
      .select({ id: quizQuestions.id })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, input.quizId));
    const rows = await tx
      .insert(quizQuestions)
      .values({
        tenantId: ctx.tenantId,
        quizId: input.quizId,
        prompt: input.prompt,
        options: input.options,
        correctIndex,
        position: existing.length,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function deleteQuiz(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'quiz');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(quizzes).set({ deletedAt: new Date() }).where(eq(quizzes.id, id)),
  );
}

/**
 * Registra a tentativa de um aluno e corrige automaticamente: compara cada resposta
 * com o `correctIndex` da questão. Guarda nota e total de questões.
 */
export async function submitQuizAttempt(
  client: DbClient,
  ctx: AuthContext,
  input: SubmitQuizAttemptInput,
) {
  assertCan(ctx, 'create', 'quiz');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const questions = await tx
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, input.quizId))
      .orderBy(asc(quizQuestions.position), asc(quizQuestions.createdAt));
    const score = questions.reduce(
      (acc, q, i) => acc + (input.answers[i] === q.correctIndex ? 1 : 0),
      0,
    );
    const rows = await tx
      .insert(quizAttempts)
      .values({
        tenantId: ctx.tenantId,
        quizId: input.quizId,
        studentName: input.studentName ?? null,
        answers: input.answers,
        score,
        total: questions.length,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listQuizAttempts(client: DbClient, ctx: AuthContext, quizId: string) {
  assertCan(ctx, 'read', 'quiz');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.quizId, quizId))
      .orderBy(desc(quizAttempts.createdAt)),
  );
}
