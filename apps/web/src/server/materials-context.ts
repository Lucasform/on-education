import 'server-only';

import type { AuthContext } from '@on-education/auth';
import type { DbClient } from '@on-education/db';
import { listMaterials } from '@on-education/module-pedagogico';

/**
 * RAG-lite: junta o texto extraído dos materiais de uma turma para servir de contexto ao WayOn.
 * Retorna undefined se não houver turma ou texto. Limite de caracteres protege os tokens.
 */
export async function buildClassMaterialsContext(
  client: DbClient,
  ctx: AuthContext,
  classId: string | null | undefined,
  limit = 55_000,
): Promise<string | undefined> {
  if (!classId) return undefined;
  const textos = (await listMaterials(client, ctx, classId).catch(() => []))
    .map((m) => m.extractedText)
    .filter((t): t is string => Boolean(t));
  const juntos = textos.join('\n\n').slice(0, limit);
  return juntos || undefined;
}
