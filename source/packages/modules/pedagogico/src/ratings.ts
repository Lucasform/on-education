import type { AuthContext } from '@on-education/auth';
import { type DbClient, contentRatings } from '@on-education/db';
import { and, desc, eq, gte, isNull } from 'drizzle-orm';

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
