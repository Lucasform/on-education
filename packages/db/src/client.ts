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
    // Serverless + projeto Supabase COMPARTILHADO com o On Way Financial: cada instância da
    // lambda mantém o pool mínimo para não estourar o limite do pooler (EMAXCONNSESSION /
    // "max clients reached"). 1 conexão por instância; o paralelismo de uma request é
    // serializado nessa conexão (barato e seguro). Combine com o transaction pooler (6543).
    max: 1,
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
