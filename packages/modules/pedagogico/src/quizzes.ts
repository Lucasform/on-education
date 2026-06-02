import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, quizAttempts, quizQuestions, quizzes } from '@on-education/db';
import { assertEntitled } from '@on-education/module-nucleo';
import type {
  AddQuizQuestionInput,
  CreateQuizInput,
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
