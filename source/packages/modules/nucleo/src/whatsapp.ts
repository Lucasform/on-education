import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, usageMeters, whatsappConnections } from '@on-education/db';
import { and, eq, sql } from 'drizzle-orm';

/**
 * Conexão WhatsApp (Evolution API) por tenant (ADR 0006). Uma linha por tenant. Gerenciar a
 * conexão é ato de gestão da escola/professor → RBAC `tenant_settings`. Os segredos do servidor
 * Evolution NÃO ficam aqui (vêm de env, server-only); aqui só o estado da instância do tenant.
 */
export async function getWhatsappConnection(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'tenant_settings');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(whatsappConnections)
      .where(eq(whatsappConnections.tenantId, ctx.tenantId));
    return rows[0] ?? null;
  });
}

export async function upsertWhatsappConnection(
  client: DbClient,
  ctx: AuthContext,
  input: { instanceId: string; webhookSecret?: string },
) {
  assertCan(ctx, 'update', 'tenant_settings');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const existing = await tx
      .select({ id: whatsappConnections.id })
      .from(whatsappConnections)
      .where(eq(whatsappConnections.tenantId, ctx.tenantId));
    if (existing.length > 0) {
      const rows = await tx
        .update(whatsappConnections)
        .set({
          instanceId: input.instanceId,
          webhookSecret: input.webhookSecret,
          updatedAt: new Date(),
        })
        .where(eq(whatsappConnections.tenantId, ctx.tenantId))
        .returning();
      return rows[0]!;
    }
    const rows = await tx
      .insert(whatsappConnections)
      .values({
        tenantId: ctx.tenantId,
        provider: 'evolution',
        instanceId: input.instanceId,
        webhookSecret: input.webhookSecret ?? null,
        active: false,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

// --- Anti-ban: throttle de envio em LOTE (broadcast) ------------------------
// A Meta bane números que disparam muitas mensagens de uma vez. Além do delay
// entre mensagens (na action), limitamos a frequência de broadcasts por tenant.
// Reusa usage_meters (sem migration): metric fixo + período 'rolling'; o
// timestamp do último envio é o updated_at da linha.

const BROADCAST_METRIC = 'wa_broadcast';
const BROADCAST_PERIOD = 'rolling';

/** Janela mínima entre dois envios em lote do mesmo tenant. */
export const BROADCAST_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h

/** Quantos destinatários no máximo por broadcast (proteção extra contra ban). */
export const BROADCAST_MAX_RECIPIENTS = 200;

/** Quando foi o último broadcast deste tenant (null se nunca). */
export async function getLastBroadcastAt(client: DbClient, ctx: AuthContext): Promise<Date | null> {
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .select({ at: usageMeters.updatedAt })
      .from(usageMeters)
      .where(
        and(eq(usageMeters.metric, BROADCAST_METRIC), eq(usageMeters.period, BROADCAST_PERIOD)),
      );
    return rows[0]?.at ?? null;
  });
}

/**
 * Verifica se o tenant pode enviar um broadcast agora. Retorna o tempo restante
 * (ms) de cooldown quando ainda não pode. `now` é injetável para teste.
 */
export async function canBroadcast(
  client: DbClient,
  ctx: AuthContext,
  now: Date = new Date(),
): Promise<{ ok: boolean; retryAfterMs: number; lastAt: Date | null }> {
  const lastAt = await getLastBroadcastAt(client, ctx);
  if (!lastAt) return { ok: true, retryAfterMs: 0, lastAt: null };
  const elapsed = now.getTime() - lastAt.getTime();
  const retryAfterMs = Math.max(0, BROADCAST_COOLDOWN_MS - elapsed);
  return { ok: retryAfterMs === 0, retryAfterMs, lastAt };
}

/** Marca que um broadcast acabou de acontecer (atualiza o timestamp/contador). */
export async function recordBroadcast(client: DbClient, ctx: AuthContext): Promise<void> {
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .insert(usageMeters)
      .values({
        tenantId: ctx.tenantId,
        metric: BROADCAST_METRIC,
        period: BROADCAST_PERIOD,
        used: 1,
      })
      .onConflictDoUpdate({
        target: [usageMeters.tenantId, usageMeters.metric, usageMeters.period],
        set: { used: sql`${usageMeters.used} + 1`, updatedAt: new Date() },
      }),
  );
}

/** Atualiza o estado conectado/desconectado (e o telefone, quando conhecido). */
export async function setWhatsappState(
  client: DbClient,
  ctx: AuthContext,
  input: { active: boolean; phone?: string | null },
) {
  assertCan(ctx, 'update', 'tenant_settings');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(whatsappConnections)
      .set({ active: input.active, phone: input.phone ?? undefined, updatedAt: new Date() })
      .where(eq(whatsappConnections.tenantId, ctx.tenantId)),
  );
}
