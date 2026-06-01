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
    ...options,
  });
  const db = drizzle(sqlClient, { schema });

  const withTenant = async <T>(tenantId: string, fn: (tx: Database) => Promise<T>): Promise<T> =>
    db.transaction(async (tx) => {
      // Rodamos como `authenticated` (papel SEM bypass de RLS) para que o RLS realmente
      // isole por tenant — o usuário de conexão (`postgres`/service role) bypassaria o RLS.
      // O caminho administrativo (provisionamento) usa `db` direto e permanece como postgres.
      await tx.execute(sql`set local role authenticated`);
      // set_config(_, _, true) => escopo local à transação.
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      return fn(tx as unknown as Database);
    });

  return { db, sql: sqlClient, withTenant, close: () => sqlClient.end({ timeout: 5 }) };
}

let cached: DbClient | null = null;

/** Client default (lazy). Exige DATABASE_URL; não conecta na importação. */
export function getDbClient(): DbClient {
  if (!cached) cached = createDbClient(requireEnv('DATABASE_URL'));
  return cached;
}
