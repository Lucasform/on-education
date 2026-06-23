import 'server-only';

import type { AuthContext } from '@on-education/auth';
import { loadEnv } from '@on-education/config';
import { type DbClient, pushSubscriptions } from '@on-education/db';
import { and, eq, isNull } from 'drizzle-orm';
import webpush from 'web-push';

/** Chave pública VAPID (segura para expor). Default = par gerado; override por env. */
export const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BOaNOwkFsNh0YvkOf2fbo9ZLQdTlcB1W-PDe8gFZMMS_A_Jn2zA3-Q9xA0CPMOwODuFZs0V7cGAdtGpi4r_dNWY';

let configured = false;
/** Liga o web-push só quando a chave PRIVADA existir (env). Sem ela, push não envia (no-op). */
function ensureConfigured(): boolean {
  const priv = loadEnv().VAPID_PRIVATE_KEY;
  if (!priv) return false;
  if (!configured) {
    webpush.setVapidDetails(
      loadEnv().VAPID_SUBJECT || 'mailto:contato@onwaytech.com.br',
      VAPID_PUBLIC_KEY,
      priv,
    );
    configured = true;
  }
  return true;
}

export interface WebPushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Salva (upsert por endpoint) a inscrição de push do usuário logado. */
export async function savePushSubscription(
  client: DbClient,
  ctx: AuthContext,
  sub: WebPushSub,
  userAgent?: string,
): Promise<void> {
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .insert(pushSubscriptions)
      .values({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent: userAgent ?? null,
        createdBy: ctx.userId,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          deletedAt: null,
          updatedAt: new Date(),
        },
      }),
  );
}

/** Remove a inscrição (ao desativar as notificações no aparelho). */
export async function deletePushSubscription(
  client: DbClient,
  ctx: AuthContext,
  endpoint: string,
): Promise<void> {
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)),
  );
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/** Envia uma notificação para todos os aparelhos de um usuário. Retorna quantas saíram. */
export async function sendPushToUser(
  client: DbClient,
  tenantId: string,
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!ensureConfigured()) return 0;
  const subs = await client.withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), isNull(pushSubscriptions.deletedAt))),
  );
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (e) {
      // 404/410 = inscrição morta (app desinstalado/expirado): limpa.
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) {
        await client
          .withTenant(tenantId, (tx) =>
            tx.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, s.endpoint)),
          )
          .catch(() => {});
      }
    }
  }
  return sent;
}

/** Há chave privada configurada? (controla a exibição do recurso). */
export function isPushConfigured(): boolean {
  return Boolean(loadEnv().VAPID_PRIVATE_KEY);
}
