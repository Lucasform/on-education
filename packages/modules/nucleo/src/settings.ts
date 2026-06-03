import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, tenantSettings } from '@on-education/db';
import type { UpdateTenantSettingsInput } from '@on-education/validation';
import { eq } from 'drizzle-orm';

/**
 * Personalização da escola (identidade visual + documentos). Uma linha por tenant.
 * Leitura liberada (compõe o tema); escrita exige gestão da escola (RBAC `tenant`).
 */
export async function getTenantSettings(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'tenant_settings');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, ctx.tenantId));
    return rows[0] ?? null;
  });
}

export async function upsertTenantSettings(
  client: DbClient,
  ctx: AuthContext,
  input: UpdateTenantSettingsInput,
) {
  assertCan(ctx, 'update', 'tenant_settings');
  const values = {
    logoUrl: input.logoUrl ? input.logoUrl : null,
    themeColor: input.themeColor ?? null,
    regimento: input.regimento ?? null,
    docTemplates: input.docTemplates ?? null,
    updatedAt: new Date(),
  };
  return client.withTenant(ctx.tenantId, async (tx) => {
    const existing = await tx
      .select({ id: tenantSettings.id })
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, ctx.tenantId));
    if (existing.length > 0) {
      const rows = await tx
        .update(tenantSettings)
        .set(values)
        .where(eq(tenantSettings.tenantId, ctx.tenantId))
        .returning();
      return rows[0]!;
    }
    const rows = await tx
      .insert(tenantSettings)
      .values({ tenantId: ctx.tenantId, createdBy: ctx.userId, ...values })
      .returning();
    return rows[0]!;
  });
}
