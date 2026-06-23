import type { AuthContext } from '@on-education/auth';
import { type DbClient, contentRatings } from '@on-education/db';
import { and, desc, eq, gte, isNotNull, isNull, lte } from 'drizzle-orm';

const MAX_EXEMPLAR = 3000; // limita o tamanho de cada exemplar no prompt (custo/escala)
const trim = (s: string | null) => (s ? s.slice(0, MAX_EXEMPLAR) : '');

export interface RateContentInput {
  kind: string;
  contentId?: string | null;
  rating: number;
  comment?: string | null;
  subject?: string | null;
  gradeLevel?: string | null;
  ageBand?: string | null;
  /** Texto do conteúdo avaliado (vira exemplar quando a nota é alta). */
  snapshot?: string | null;
}

/** Salva/atualiza a nota (1-5) do usuário para um conteúdo. Upsert por (usuário, tipo, conteúdo). */
export async function rateContent(
  client: DbClient,
  ctx: AuthContext,
  input: RateContentInput,
): Promise<void> {
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  const comment = input.comment?.slice(0, 500) || null;
  const snapshot = input.snapshot ? input.snapshot.slice(0, 6000) : null;
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .insert(contentRatings)
      .values({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        kind: input.kind,
        contentId: input.contentId ?? null,
        rating,
        comment,
        subject: input.subject ?? null,
        gradeLevel: input.gradeLevel ?? null,
        ageBand: input.ageBand ?? null,
        snapshot,
        createdBy: ctx.userId,
      })
      .onConflictDoUpdate({
        target: [contentRatings.userId, contentRatings.kind, contentRatings.contentId],
        set: { rating, comment, snapshot, updatedAt: new Date() },
      }),
  );
}

/**
 * Mente DIRECIONAL: melhor exemplo do PRÓPRIO usuário para esse tipo (nota >= 4).
 * Retorna o texto do conteúdo, para servir de referência de estilo nas próximas gerações.
 */
export async function getUserExemplar(
  client: DbClient,
  ctx: AuthContext,
  kind: string,
): Promise<string | null> {
  const rows = await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select({ snapshot: contentRatings.snapshot })
      .from(contentRatings)
      .where(
        and(
          eq(contentRatings.userId, ctx.userId),
          eq(contentRatings.kind, kind),
          gte(contentRatings.rating, 4),
          isNull(contentRatings.deletedAt),
        ),
      )
      .orderBy(desc(contentRatings.rating), desc(contentRatings.updatedAt))
      .limit(1),
  );
  return rows[0]?.snapshot ?? null;
}

/**
 * Mente CENTRAL: melhor exemplo GLOBAL (de toda a base, anonimizado) para esse tipo (nota 5).
 * Usa a conexão crua (cross-tenant) e devolve só o texto — sem nada que identifique a escola.
 */
export async function getGlobalExemplar(
  client: DbClient,
  kind: string,
  ageBand?: string | null,
): Promise<string | null> {
  const pick = async (withAge: boolean) => {
    const where = withAge && ageBand
      ? and(
          eq(contentRatings.kind, kind),
          eq(contentRatings.ageBand, ageBand),
          gte(contentRatings.rating, 5),
          isNull(contentRatings.deletedAt),
        )
      : and(
          eq(contentRatings.kind, kind),
          gte(contentRatings.rating, 5),
          isNull(contentRatings.deletedAt),
        );
    const rows = await client.db
      .select({ snapshot: contentRatings.snapshot })
      .from(contentRatings)
      .where(where)
      .orderBy(desc(contentRatings.updatedAt))
      .limit(1);
    return rows[0]?.snapshot ?? null;
  };
  // Prefere o melhor da MESMA faixa; se não houver, usa o melhor global do tipo.
  return (ageBand ? await pick(true) : null) ?? (await pick(false));
}

/**
 * MOTOR DE TREINO (central): monta o bloco de referência injetado em CADA geração.
 * Prioridade ABSOLUTA pro que o professor aprovou (mente direcional) + comentários dele +
 * o que ele rejeitou ("evite") + a melhor referência global (mente central). Reutilizável por
 * qualquer gerador (atividades, flashcards, planos, etc.). É isto que faz a IA aprender sempre.
 */
export async function buildTrainingContext(
  client: DbClient,
  ctx: AuthContext,
  kind: string,
  ageBand?: string | null,
): Promise<string> {
  const [mine, dislikes] = await Promise.all([
    // Top 2 do PRÓPRIO professor (nota >= 4), com o comentário dele.
    client
      .withTenant(ctx.tenantId, (tx) =>
        tx
          .select({
            snapshot: contentRatings.snapshot,
            comment: contentRatings.comment,
          })
          .from(contentRatings)
          .where(
            and(
              eq(contentRatings.userId, ctx.userId),
              eq(contentRatings.kind, kind),
              gte(contentRatings.rating, 4),
              isNotNull(contentRatings.snapshot),
              isNull(contentRatings.deletedAt),
            ),
          )
          .orderBy(desc(contentRatings.rating), desc(contentRatings.updatedAt))
          .limit(2),
      )
      .catch(() => [] as { snapshot: string | null; comment: string | null }[]),
    // O que ele NÃO gostou (nota <= 2) com comentário — vira "evite".
    client
      .withTenant(ctx.tenantId, (tx) =>
        tx
          .select({ comment: contentRatings.comment })
          .from(contentRatings)
          .where(
            and(
              eq(contentRatings.userId, ctx.userId),
              eq(contentRatings.kind, kind),
              lte(contentRatings.rating, 2),
              isNotNull(contentRatings.comment),
              isNull(contentRatings.deletedAt),
            ),
          )
          .orderBy(desc(contentRatings.updatedAt))
          .limit(3),
      )
      .catch(() => [] as { comment: string | null }[]),
  ]);

  const global = await getGlobalExemplar(client, kind, ageBand).catch(() => null);

  let out = '';
  if (mine.length > 0) {
    out +=
      '\n\nESTILO DESTE PROFESSOR (PRIORIDADE MÁXIMA — siga este padrão, é o que ele aprovou; ' +
      'não copie literalmente, gere conteúdo novo no mesmo nível e formato):';
    mine.forEach((m, i) => {
      out += `\n\n[Exemplo ${i + 1}${m.comment ? ` — ele observou: "${m.comment}"` : ''}]\n${trim(m.snapshot)}`;
    });
  }
  if (global) {
    out +=
      '\n\nREFERÊNCIA DE QUALIDADE DA COMUNIDADE (bem avaliada por outros professores; use só como ' +
      `inspiração de qualidade, o estilo acima do professor tem prioridade):\n${trim(global)}`;
  }
  const avoid = dislikes.map((d) => d.comment).filter(Boolean) as string[];
  if (avoid.length > 0) {
    out += `\n\nEVITE (este professor já reprovou isto antes): ${avoid.join(' | ')}`;
  }
  return out;
}
