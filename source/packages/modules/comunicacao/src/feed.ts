import { assertCan, type AuthContext } from '@on-education/auth';
import {
  type DbClient,
  feedPostComments,
  feedPostReactions,
  feedPosts,
  feedStories,
  tenantSettings,
} from '@on-education/db';
import { and, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';

export interface CreatePostInput {
  body: string;
  imageUrl?: string | null;
  classId?: string | null;
  authorName?: string | null;
}

/** Cria um post no feed da escola. */
export async function createPost(client: DbClient, ctx: AuthContext, input: CreatePostInput) {
  assertCan(ctx, 'create', 'communication');
  const body = (input.body ?? '').trim();
  if (!body && !input.imageUrl) throw new Error('Escreva algo ou anexe uma imagem.');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .insert(feedPosts)
      .values({
        tenantId: ctx.tenantId,
        body,
        imageUrl: input.imageUrl ?? null,
        classId: input.classId || null,
        authorName: input.authorName ?? null,
        createdBy: ctx.userId,
      })
      .returning({ id: feedPosts.id });
    return row;
  });
}

export async function deletePost(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'communication');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(feedPosts).set({ deletedAt: new Date() }).where(eq(feedPosts.id, id)),
  );
}

/** Lista o feed com contagem de curtidas/comentários e se o usuário atual curtiu. */
export async function listFeed(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'communication');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const posts = await tx
      .select()
      .from(feedPosts)
      .where(and(eq(feedPosts.status, 'published'), isNull(feedPosts.deletedAt)))
      .orderBy(desc(feedPosts.createdAt))
      .limit(100);
    if (posts.length === 0) return [];
    const ids = posts.map((p) => p.id);

    const likes = await tx
      .select({ postId: feedPostReactions.postId, n: sql<number>`count(*)::int` })
      .from(feedPostReactions)
      .where(inArray(feedPostReactions.postId, ids))
      .groupBy(feedPostReactions.postId);
    const comments = await tx
      .select({ postId: feedPostComments.postId, n: sql<number>`count(*)::int` })
      .from(feedPostComments)
      .where(and(inArray(feedPostComments.postId, ids), isNull(feedPostComments.deletedAt)))
      .groupBy(feedPostComments.postId);
    const mine = await tx
      .select({ postId: feedPostReactions.postId })
      .from(feedPostReactions)
      .where(
        and(inArray(feedPostReactions.postId, ids), eq(feedPostReactions.userId, ctx.userId)),
      );

    const likeMap = new Map(likes.map((l) => [l.postId, l.n]));
    const commentMap = new Map(comments.map((c) => [c.postId, c.n]));
    const mineSet = new Set(mine.map((m) => m.postId));
    return posts.map((p) => ({
      ...p,
      likes: likeMap.get(p.id) ?? 0,
      comments: commentMap.get(p.id) ?? 0,
      likedByMe: mineSet.has(p.id),
    }));
  });
}

/** Curte ou descurte um post (toggle). Retorna o novo estado. */
export async function toggleReaction(client: DbClient, ctx: AuthContext, postId: string) {
  assertCan(ctx, 'read', 'communication');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const existing = await tx
      .select({ id: feedPostReactions.id })
      .from(feedPostReactions)
      .where(and(eq(feedPostReactions.postId, postId), eq(feedPostReactions.userId, ctx.userId)))
      .limit(1);
    if (existing.length) {
      await tx.delete(feedPostReactions).where(eq(feedPostReactions.id, existing[0]!.id));
      return { liked: false };
    }
    await tx
      .insert(feedPostReactions)
      .values({ tenantId: ctx.tenantId, postId, userId: ctx.userId, createdBy: ctx.userId });
    return { liked: true };
  });
}

export async function addComment(
  client: DbClient,
  ctx: AuthContext,
  postId: string,
  body: string,
  authorName?: string | null,
) {
  assertCan(ctx, 'read', 'communication');
  const text = (body ?? '').trim();
  if (!text) throw new Error('Comentário vazio.');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.insert(feedPostComments).values({
      tenantId: ctx.tenantId,
      postId,
      body: text,
      authorName: authorName ?? null,
      createdBy: ctx.userId,
    }),
  );
}

export async function listComments(client: DbClient, ctx: AuthContext, postId: string) {
  assertCan(ctx, 'read', 'communication');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(feedPostComments)
      .where(and(eq(feedPostComments.postId, postId), isNull(feedPostComments.deletedAt)))
      .orderBy(feedPostComments.createdAt),
  );
}

/** Comentários de vários posts de uma vez (evita N+1 ao montar o feed). */
export async function listCommentsFor(client: DbClient, ctx: AuthContext, postIds: string[]) {
  assertCan(ctx, 'read', 'communication');
  if (postIds.length === 0) return [];
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(feedPostComments)
      .where(and(inArray(feedPostComments.postId, postIds), isNull(feedPostComments.deletedAt)))
      .orderBy(feedPostComments.createdAt),
  );
}

export async function createStory(
  client: DbClient,
  ctx: AuthContext,
  input: { imageUrl: string; caption?: string | null; hours?: number },
) {
  assertCan(ctx, 'create', 'communication');
  if (!input.imageUrl) throw new Error('Story precisa de uma imagem.');
  const hours = input.hours && input.hours > 0 ? input.hours : 24;
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000);
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.insert(feedStories).values({
      tenantId: ctx.tenantId,
      imageUrl: input.imageUrl,
      caption: input.caption ?? null,
      expiresAt,
      createdBy: ctx.userId,
    }),
  );
}

export async function deleteStory(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'communication');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(feedStories).set({ deletedAt: new Date() }).where(eq(feedStories.id, id)),
  );
}

/** Stories ativos (não expirados). */
export async function listActiveStories(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'communication');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(feedStories)
      .where(and(gt(feedStories.expiresAt, new Date()), isNull(feedStories.deletedAt)))
      .orderBy(desc(feedStories.createdAt)),
  );
}

// --- Versões públicas (mural dos pais): conexão dona, sem sessão. Só leitura. ---

export async function listPublicFeed(client: DbClient, tenantId: string) {
  const posts = await client.db
    .select()
    .from(feedPosts)
    .where(
      and(
        eq(feedPosts.tenantId, tenantId),
        eq(feedPosts.status, 'published'),
        isNull(feedPosts.deletedAt),
      ),
    )
    .orderBy(desc(feedPosts.createdAt))
    .limit(50);
  if (posts.length === 0) return [];
  const ids = posts.map((p) => p.id);
  const likes = await client.db
    .select({ postId: feedPostReactions.postId, n: sql<number>`count(*)::int` })
    .from(feedPostReactions)
    .where(inArray(feedPostReactions.postId, ids))
    .groupBy(feedPostReactions.postId);
  const likeMap = new Map(likes.map((l) => [l.postId, l.n]));
  return posts.map((p) => ({ ...p, likes: likeMap.get(p.id) ?? 0 }));
}

export async function listPublicStories(client: DbClient, tenantId: string) {
  // Respeita o toggle da escola: se stories estiver desligado, não mostra no mural público.
  const cfg = await client.db
    .select({ on: tenantSettings.feedStoriesEnabled })
    .from(tenantSettings)
    .where(eq(tenantSettings.tenantId, tenantId))
    .limit(1);
  if (cfg[0] && cfg[0].on === false) return [];
  return client.db
    .select()
    .from(feedStories)
    .where(
      and(
        eq(feedStories.tenantId, tenantId),
        gt(feedStories.expiresAt, new Date()),
        isNull(feedStories.deletedAt),
      ),
    )
    .orderBy(desc(feedStories.createdAt));
}
