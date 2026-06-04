import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, tenants, tenantSettings } from '@on-education/db';
import type { UpdateTenantSettingsInput } from '@on-education/validation';
import { eq } from 'drizzle-orm';

/**
 * Identidade pública de um tenant (nome + logo + cor), lida pela conexão dona — para páginas
 * SEM sessão (ex.: mural público dos pais, item 12). Retorna null se o tenant não existir.
 */
export async function getPublicTenantBrand(client: DbClient, tenantId: string) {
  const t = (
    await client.db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId))
  )[0];
  if (!t) return null;
  const s = (
    await client.db
      .select({ logoUrl: tenantSettings.logoUrl, themeColor: tenantSettings.themeColor })
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId))
  )[0];
  return { name: t.name, logoUrl: s?.logoUrl ?? null, themeColor: s?.themeColor ?? null };
}

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
  // Merge parcial: só toca nos campos enviados (undefined preserva o valor atual).
  // Assim a tela "Meu padrão" não apaga logo/cor, e a personalização não apaga o padrão.
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.logoUrl !== undefined) patch.logoUrl = input.logoUrl || null;
  if (input.themeColor !== undefined) patch.themeColor = input.themeColor || null;
  if (input.regimento !== undefined) patch.regimento = input.regimento || null;
  if (input.docTemplates !== undefined) patch.docTemplates = input.docTemplates || null;
  if (input.aiStandard !== undefined) patch.aiStandard = input.aiStandard || null;
  if (input.gradeScale !== undefined) patch.gradeScale = input.gradeScale;

  return client.withTenant(ctx.tenantId, async (tx) => {
    const existing = await tx
      .select({ id: tenantSettings.id })
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, ctx.tenantId));
    if (existing.length > 0) {
      const rows = await tx
        .update(tenantSettings)
        .set(patch)
        .where(eq(tenantSettings.tenantId, ctx.tenantId))
        .returning();
      return rows[0]!;
    }
    const rows = await tx
      .insert(tenantSettings)
      .values({ tenantId: ctx.tenantId, createdBy: ctx.userId, ...patch })
      .returning();
    return rows[0]!;
  });
}

/**
 * Padrão do WayOn do tenant ("Meu padrão"/padrão da escola), ou null. Usado pelos
 * geradores de IA para padronizar o estilo/formato do conteúdo (itens 18.3 / 11.5).
 */
export async function getAiStandard(client: DbClient, ctx: AuthContext): Promise<string | null> {
  const settings = await getTenantSettings(client, ctx);
  return settings?.aiStandard ?? null;
}

/** Acrescenta o padrão do educador ao prompt de sistema do WayOn (no-op se vazio). */
export function applyAiStandard(system: string, standard?: string | null): string {
  const s = standard?.trim();
  if (!s) return system;
  return (
    `${system}\n\nSiga RIGOROSAMENTE este padrão definido pelo educador ` +
    `(estilo, formato, cabeçalho/rodapé, nível de dificuldade):\n${s}`
  );
}
