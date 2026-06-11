import { requireEnv } from '@on-education/config';
import { sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { schema } from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

export interface DbClient {
  /** Conexão "crua" (pode bypassar RLS se o papel do banco tiver privilégio). Use com cuidado. */
  db: Database;
  sql: postgres.Sql;
  /**
   * Executa `fn` dentro de uma transação com `app.tenant_id` setado para `tenantId`.
   * É AQUI que o isolamento acontece: o RLS do banco filtra por esse GUC.
   * O `tenantId` SEMPRE vem da sessão autenticada, NUNCA de parâmetro do client (Master Spec §7.4).
   */
  withTenant: <T>(tenantId: string, fn: (tx: Database) => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
}

export function createDbClient(
  connectionString: string,
  options: postgres.Options<Record<string, never>> = {},
): DbClient {
  // search_path em on_education: o Drizzle já qualifica as tabelas, mas isto garante que
  // SQL não-qualificado (scripts/limpeza de teste) resolva no nosso schema, nunca no public.
  const sqlClient = postgres(connectionString, {
    connection: { search_path: 'on_education, public' },
    // Pooler do Supabase + serverless (Vercel): prepared statements quebram transações no
    // modo transaction do pgbouncer. `prepare: false` usa o protocolo simples e é seguro.
    prepare: false,
    // Tamanho do pool por instância serverless. Configurável por `DB_POOL_MAX` (default 1).
    // - SESSION pooler (porta 5432): mantenha 1 para não estourar o limite (EMAXCONNSESSION).
    // - TRANSACTION pooler (porta 6543): pode subir (ex.: 5). O pgbouncer devolve a conexão a
    //   cada transação, então as consultas de uma página (Promise.all) rodam EM PARALELO,
    //   eliminando o enfileiramento que deixava as páginas lentas. `prepare:false` já é exigido
    //   e está setado. Recomendado p/ Vercel: DATABASE_URL no 6543 + DB_POOL_MAX=5.
    max: Math.max(1, Number(process.env.DB_POOL_MAX) || 1),
    // Tuning serverless: fecha conexões ociosas e não pendura em conexão lenta.
    idle_timeout: 20,
    connect_timeout: 15,
    ...options,
  });
  const db = drizzle(sqlClient, { schema });

  // tenantId vem SEMPRE da sessão (UUID). Validamos o formato porque ele é interpolado
  // no SET abaixo (combina os dois SETs num round-trip só, reduzindo latência por query).
  const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  const withTenant = async <T>(tenantId: string, fn: (tx: Database) => Promise<T>): Promise<T> => {
    if (!UUID_RE.test(tenantId)) throw new Error('tenantId inválido (esperado UUID).');
    return db.transaction(async (tx) => {
      // `authenticated` (papel SEM bypass de RLS) + tenant da sessão, ambos LOCAIS à transação,
      // num único statement (protocolo simples) → metade dos round-trips de antes.
      await tx.execute(
        sql.raw(`set local role authenticated; set local app.tenant_id = '${tenantId}'`),
      );
      return fn(tx as unknown as Database);
    });
  };

  return { db, sql: sqlClient, withTenant, close: () => sqlClient.end({ timeout: 5 }) };
}

let cached: DbClient | null = null;

/** Client default (lazy). Exige DATABASE_URL; não conecta na importação. */
export function getDbClient(): DbClient {
  if (!cached) cached = createDbClient(requireEnv('DATABASE_URL'));
  return cached;
}
