import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, tenants } from '@on-education/db';
import { and, eq, ne, sql } from 'drizzle-orm';

import { getPublicTenantBrand } from './settings';

/**
 * Slug público do tenant (link de marca): eduonway.com/c/<slug>. Resolve a identidade
 * visual ANTES do login. Unicidade case-insensitive garantida por índice no banco.
 */

/** Caminhos do app que não podem virar slug de tenant (evita ambiguidade de rota/URL). */
export const RESERVED_SLUGS = new Set<string>([
  'app', 'api', 'c', 'login', 'signup', 'admin', 'admin-login', 'mural', 'matricula',
  'portal', 'esqueci-senha', 'nova-senha', 'mfa-challenge', 'brand', 'escola', 'conta',
  'planos', 'sobre', 'precos', 'termos', 'privacidade', 'contato', 'suporte', 'www',
]);

/** Normaliza um texto livre para um slug válido (minúsculo, sem acento, só [a-z0-9-]). */
export function normalizeSlug(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // tira acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // qualquer coisa não-alfanumérica vira hífen
    .replace(/^-+|-+$/g, '') // sem hífen nas pontas
    .slice(0, 40);
}

/** Mensagem de erro se o slug for inválido; null se estiver ok (formato + reservados). */
export function slugFormatError(slug: string): string | null {
  if (slug.length < 3) return 'O link precisa ter ao menos 3 caracteres.';
  if (slug.length > 40) return 'O link pode ter no máximo 40 caracteres.';
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug))
    return 'Use só letras minúsculas, números e hífen (sem hífen nas pontas).';
  if (RESERVED_SLUGS.has(slug)) return 'Esse link é reservado. Escolha outro.';
  return null;
}

/** ID do tenant dono de um slug (case-insensitive), ou null. Leitura pela conexão dona. */
export async function getTenantIdBySlug(client: DbClient, slug: string): Promise<string | null> {
  const norm = normalizeSlug(slug);
  if (!norm) return null;
  const row = (
    await client.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(sql`lower(${tenants.slug}) = ${norm}`)
      .limit(1)
  )[0];
  return row?.id ?? null;
}

/** Identidade pública (nome+logo+cor) a partir do slug — para a tela de login da marca. */
export async function getTenantBrandBySlug(client: DbClient, slug: string) {
  const tenantId = await getTenantIdBySlug(client, slug);
  if (!tenantId) return null;
  const brand = await getPublicTenantBrand(client, tenantId);
  return brand ? { tenantId, ...brand } : null;
}

/** Slug atual do tenant logado (para preencher o campo na personalização). */
export async function getTenantSlug(client: DbClient, tenantId: string): Promise<string | null> {
  const row = (
    await client.db.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.id, tenantId))
  )[0];
  return row?.slug ?? null;
}

/** O slug está livre (não usado por OUTRO tenant)? Case-insensitive. */
export async function isSlugAvailable(
  client: DbClient,
  slug: string,
  exceptTenantId: string,
): Promise<boolean> {
  const norm = normalizeSlug(slug);
  const row = (
    await client.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(sql`lower(${tenants.slug}) = ${norm}`, ne(tenants.id, exceptTenantId)))
      .limit(1)
  )[0];
  return !row;
}

/**
 * Define o slug público do tenant. Valida formato + reservados + unicidade. Lança Error
 * com mensagem amigável se inválido/indisponível. Escrita tenant-scoped (RLS via withTenant).
 */
export async function setTenantSlug(
  client: DbClient,
  ctx: AuthContext,
  rawSlug: string,
): Promise<string> {
  assertCan(ctx, 'update', 'tenant_settings');
  const slug = normalizeSlug(rawSlug);
  const fmtErr = slugFormatError(slug);
  if (fmtErr) throw new Error(fmtErr);
  if (!(await isSlugAvailable(client, slug, ctx.tenantId)))
    throw new Error('Esse link já está em uso. Escolha outro.');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(tenants).set({ slug, updatedAt: new Date() }).where(eq(tenants.id, ctx.tenantId)),
  );
  return slug;
}
