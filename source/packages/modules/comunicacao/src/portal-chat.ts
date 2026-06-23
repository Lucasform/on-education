import type { AuthContext } from '@on-education/auth';
import { type DbClient, guardians, portalMessages, tenantSettings } from '@on-education/db';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';

/** A escola permite que o responsável mande mensagem direcionada ao professor? */
export async function guardianCanMessageTeacher(client: DbClient, tenantId: string) {
  const r = await client.db
    .select({ on: tenantSettings.allowGuardianMessageTeacher })
    .from(tenantSettings)
    .where(eq(tenantSettings.tenantId, tenantId))
    .limit(1);
  return r[0]?.on === true;
}

// --- Lado do RESPONSÁVEL (portal por token, sem sessão): conexão dona. ---

/** Responsável envia mensagem para a escola (coordenação ou professor, se permitido). */
export async function sendGuardianMessage(
  client: DbClient,
  input: {
    tenantId: string;
    guardianId: string;
    body: string;
    target?: 'coordenacao' | 'professor';
    authorName?: string | null;
  },
) {
  const body = (input.body ?? '').trim();
  if (!body) throw new Error('Mensagem vazia.');
  await client.db.insert(portalMessages).values({
    tenantId: input.tenantId,
    guardianId: input.guardianId,
    body,
    fromGuardian: true,
    target: input.target === 'professor' ? 'professor' : 'coordenacao',
    authorName: input.authorName ?? null,
  });
}

/** Thread do responsável (para o portal): todas as mensagens dele, em ordem. */
export async function listMessagesForGuardian(
  client: DbClient,
  tenantId: string,
  guardianId: string,
) {
  return client.db
    .select()
    .from(portalMessages)
    .where(
      and(
        eq(portalMessages.tenantId, tenantId),
        eq(portalMessages.guardianId, guardianId),
        isNull(portalMessages.deletedAt),
      ),
    )
    .orderBy(asc(portalMessages.createdAt));
}

// --- Lado da ESCOLA (coordenação, autenticada): withTenant. ---

/** Todas as mensagens dos pais (app), com o nome do responsável. A coordenação agrupa por pai. */
export async function listPortalMessages(client: DbClient, ctx: AuthContext) {
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select({
        id: portalMessages.id,
        guardianId: portalMessages.guardianId,
        guardianName: guardians.fullName,
        body: portalMessages.body,
        fromGuardian: portalMessages.fromGuardian,
        authorName: portalMessages.authorName,
        target: portalMessages.target,
        createdAt: portalMessages.createdAt,
      })
      .from(portalMessages)
      .leftJoin(guardians, eq(guardians.id, portalMessages.guardianId))
      .where(isNull(portalMessages.deletedAt))
      .orderBy(desc(portalMessages.createdAt))
      .limit(500),
  );
}

/** Coordenação responde ao responsável. */
export async function replyToGuardian(
  client: DbClient,
  ctx: AuthContext,
  guardianId: string,
  body: string,
  authorName?: string | null,
) {
  const text = (body ?? '').trim();
  if (!text) throw new Error('Mensagem vazia.');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.insert(portalMessages).values({
      tenantId: ctx.tenantId,
      guardianId,
      body: text,
      fromGuardian: false,
      target: 'coordenacao',
      authorName: authorName ?? 'Coordenação',
      createdBy: ctx.userId,
    }),
  );
}
