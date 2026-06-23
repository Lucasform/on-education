import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, flashcardDecks } from '@on-education/db';
import {
  type AiProvider,
  assertWithinQuota,
  recordUsage,
  resolveTenantProvider,
} from '@on-education/module-ia';
import { applyAiStandard, assertEntitled, getAiStandard } from '@on-education/module-nucleo';
import type { GenerateFlashcardsInput } from '@on-education/validation';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { buildTrainingContext } from './ratings';

type Card = { front: string; back: string; image?: string };

/** Extrai os cards do JSON da IA (tolerante a cercas ```json e texto ao redor). */
function parseCards(raw: string): Card[] {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1]!.trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  try {
    const obj = JSON.parse(s) as { cards?: { front?: unknown; back?: unknown }[] };
    return (obj.cards ?? [])
      .map((c) => ({ front: String(c?.front ?? '').trim(), back: String(c?.back ?? '').trim() }))
      .filter((c) => c.front && c.back)
      .slice(0, 30);
  } catch {
    return [];
  }
}

/** Gera um baralho de flashcards (frente/verso) pelo WayOn e salva. Segue o "Meu padrão". */
export async function generateFlashcardsWithWayOn(
  client: DbClient,
  ctx: AuthContext,
  input: GenerateFlashcardsInput,
  provider?: AiProvider,
) {
  assertCan(ctx, 'create', 'activity');
  const planId = await assertEntitled(client, ctx.tenantId, 'ai.activities');
  await assertWithinQuota(client, ctx.tenantId, planId);

  const ai = provider ?? (await resolveTenantProvider(client, ctx));
  const standard = await getAiStandard(client, ctx);
  const system = applyAiStandard(
    'Você é o WayOn, um assistente pedagógico. Gere flashcards de estudo (frente e verso) em ' +
      'português do Brasil. A frente é uma pergunta/termo curto; o verso é a resposta/explicação ' +
      'objetiva. Responda APENAS com JSON válido, sem texto fora dele, no formato: ' +
      '{"cards":[{"front":"pergunta","back":"resposta"}]}.',
    standard,
  );
  const prompt =
    `Gere ${input.count} flashcards sobre: ${input.topic}.` +
    (input.subject ? ` Disciplina: ${input.subject}.` : '') +
    (input.gradeLevel ? ` Série/ano: ${input.gradeLevel}.` : '') +
    (input.ageBand ? ` Faixa etária: ${input.ageBand} anos.` : '');

  const treino = await buildTrainingContext(client, ctx, 'flashcards', input.ageBand ?? null).catch(
    () => '',
  );
  const result = await ai.generate({
    prompt,
    system: treino ? system + treino : system,
    maxTokens: 3000,
  });
  const cards = parseCards(result.text);
  if (cards.length === 0)
    throw new Error('O WayOn não conseguiu gerar os flashcards. Tente de novo.');

  const deck = await client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(flashcardDecks)
      .values({
        tenantId: ctx.tenantId,
        title: input.topic.slice(0, 120),
        subject: input.subject ?? null,
        gradeLevel: input.gradeLevel ?? null,
        ageBand: input.ageBand ?? null,
        cards,
        aiGenerated: true,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });

  await recordUsage(client, ctx.tenantId, result.tokensIn + result.tokensOut);
  return deck;
}

export async function listFlashcardDecks(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'activity');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(flashcardDecks)
      .where(isNull(flashcardDecks.deletedAt))
      .orderBy(desc(flashcardDecks.createdAt)),
  );
}

export async function getFlashcardDeck(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'read', 'activity');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(flashcardDecks)
      .where(and(eq(flashcardDecks.id, id), isNull(flashcardDecks.deletedAt)));
    return rows[0] ?? null;
  });
}

/** Define a URL da imagem de um card específico do baralho (após gerar/subir a imagem). */
export async function setFlashcardCardImage(
  client: DbClient,
  ctx: AuthContext,
  deckId: string,
  index: number,
  url: string,
) {
  assertCan(ctx, 'update', 'activity');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx.select().from(flashcardDecks).where(eq(flashcardDecks.id, deckId));
    const deck = rows[0];
    if (!deck) return;
    const cards = deck.cards.map((c, i) => (i === index ? { ...c, image: url } : c));
    await tx
      .update(flashcardDecks)
      .set({ cards, updatedAt: new Date() })
      .where(eq(flashcardDecks.id, deckId));
  });
}

export async function deleteFlashcardDeck(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'activity');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(flashcardDecks).set({ deletedAt: new Date() }).where(eq(flashcardDecks.id, id)),
  );
}
