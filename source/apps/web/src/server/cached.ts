import 'server-only';

import type { Feature } from '@on-education/entitlements';
import { getTenantFeatures } from '@on-education/module-nucleo';
import { unstable_cache } from 'next/cache';

import { db } from './db';

/** Tag de cache das features de um tenant (use com revalidateTag ao mudar plano/entitlements). */
export const featuresTag = (tenantId: string) => `features:${tenantId}`;

/**
 * Features do tenant CACHEADAS (TTL curto + invalidação por tag). Usada no layout do app, que
 * relê isso em toda navegação — cachear corta 1-2 queries por página. Seguro: a checagem de
 * ACESSO de cada página continua autoritativa via `isEntitled` (consulta direta); aqui é só o
 * cadeado do menu. Invalidada na hora quando o plano muda (revalidateTag).
 */
export function cachedTenantFeatures(tenantId: string): Promise<Feature[] | null> {
  return unstable_cache(
    async () => {
      const f = await getTenantFeatures(db(), tenantId);
      return f ? ([...f] as Feature[]) : null;
    },
    ['tenant-features', tenantId],
    { tags: [featuresTag(tenantId)], revalidate: 120 },
  )();
}
