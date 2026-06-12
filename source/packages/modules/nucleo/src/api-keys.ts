import { createHash, randomBytes } from 'node:crypto';

import { assertCan, type AuthContext } from '@on-education/auth';
import { apiKeys, type DbClient, tenants } from '@on-education/db';
import { desc, eq } from 'drizzle-orm';

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/**
 * Cria uma chave de API. Boa prática: guardamos só o HASH (sha256); o valor em claro é
 * devolvido UMA vez (aqui) e nunca mais. RBAC de gestão (`tenant_settings`).
 */
export async function createApiKey(
  client: DbClient,
  ctx: AuthContext,
  name: string,
): Promise<{ key: string }> {
  assertCan(ctx, 'update', 'tenant_settings');
  const key = `eduon_${randomBytes(24).toString('hex')}`;
  const tokenHash = sha256(key);
  const tokenPrefix = key.slice(0, 14);
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.insert(apiKeys).values({
      tenantId: ctx.tenantId,
      name: name || 'Chave',
      tokenPrefix,
      tokenHash,
      createdBy: ctx.userId,
    }),
  );
  return { key };
}

export async function listApiKeys(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'tenant_settings');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        tokenPrefix: apiKeys.tokenPrefix,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .orderBy(desc(apiKeys.createdAt)),
  );
}

export async function revokeApiKey(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'update', 'tenant_settings');
  return client.withTenant(ctx.tenantId, (tx) => tx.delete(apiKeys).where(eq(apiKeys.id, id)));
}

/**
 * Resolve o tenant (e tipo) a partir de uma chave de API (Bearer) — para os endpoints públicos.
 * Conexão admin (sem RLS); lookup pelo hash. Atualiza `last_used_at`. Retorna null se inválida.
 */
export async function resolveTenantByApiKey(client: DbClient, key: string) {
  const tokenHash = sha256(key);
  const rows = await client.db
    .select({ tenantId: apiKeys.tenantId, tenantType: tenants.tenantType })
    .from(apiKeys)
    .innerJoin(tenants, eq(tenants.id, apiKeys.tenantId))
    .where(eq(apiKeys.tokenHash, tokenHash));
  const r = rows[0];
  if (!r) return null;
  await client.db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.tokenHash, tokenHash));
  return r;
}
