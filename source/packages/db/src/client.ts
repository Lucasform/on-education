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
  // Best practice serverless + Supabase: usar o TRANSACTION pooler (porta 6543), que devolve a
  // conexão a cada transação e suporta várias conexões em paralelo. O session pooler (5432)
  // segura a conexão a sessão inteira e, com pool pequeno, enfileira as consultas (páginas
  // lentas / "às vezes nem carrega"). Reescreve SÓ o pooler do Supabase, sem tocar na senha.
  // Escape hatch: `DB_DISABLE_POOLER_REWRITE=1` mantém a porta original.
  const conn =
    process.env.DB_DISABLE_POOLER_REWRITE === '1'
      ? connectionString
      : connectionString.replace(/(\.pooler\.supabase\.com):5432\b/, '$1:6543');
  const usingTxnPooler = /\.pooler\.supabase\.com:6543\b/.test(conn);

  const sqlClient = postgres(conn, {
    connection: { search_path: 'on_education, public' },
    // `prepare:false` é EXIGIDO no transaction pooler (prepared statements quebram lá) e seguro
    // no session pooler. Mantemos sempre.
    prepare: false,
    // Pool por instância serverless. No transaction pooler dá para abrir várias (conexão volta
    // ao pool a cada transação) → as consultas de uma página rodam EM PARALELO. Override por
    // `DB_POOL_MAX`. Default: 5 no transaction pooler, 1 no session pooler (evita EMAXCONNSESSION).
    max: Math.max(1, Number(process.env.DB_POOL_MAX) || (usingTxnPooler ? 5 : 1)),
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
