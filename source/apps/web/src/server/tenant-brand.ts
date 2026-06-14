import 'server-only';

import { getTenantSettings } from '@on-education/module-nucleo';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export interface TenantBrand {
  /** Nome exibido (PWA): nome da escola/professor, ou o padrão do produto. */
  name: string;
  /** Logo do tenant (bucket público) ou null para cair no ícone "ON" padrão. */
  logoUrl: string | null;
}

/**
 * Marca do tenant LOGADO, para o PWA dinâmico (manifest + ícones de instalação).
 * Se a escola tem logo, a instalação usa a identidade dela; senão, o "ON" do produto.
 * Degradação total para o padrão se não houver sessão ou em qualquer erro.
 */
export async function resolveTenantBrand(): Promise<TenantBrand> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { name: 'Edu On Way', logoUrl: null };
    const settings = await getTenantSettings(db(), ctx).catch(() => null);
    const name = settings?.profileName?.trim() || 'Edu On Way';
    return { name, logoUrl: settings?.logoUrl?.trim() || null };
  } catch {
    return { name: 'Edu On Way', logoUrl: null };
  }
}
