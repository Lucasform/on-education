import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, whatsappConnections } from '@on-education/db';
import { eq } from 'drizzle-orm';

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
