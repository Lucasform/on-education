import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDbClient, type DbClient } from '../client';
import { runMigrations } from '../migrate';

/**
 * Teste anti-vazamento de tenant (Master Spec §4.3, §7.3; CLAUDE.md §4).
 *
 * Prova que o RLS impede uma sessão de enxergar dados de outro tenant — inclusive
 * cross-segmento (organization vs individual). Requer:
 *   1) DATABASE_URL apontando para um Postgres (Supabase ou local).
 *   2) Migrations já geradas (`pnpm db:generate`) — aplicadas aqui programaticamente.
 *   3) O papel de conexão poder `SET ROLE` para um papel restrito (superuser/local OK).
 *
 * Sem DATABASE_URL o suite é PULADO (não falha o CI), mas a ausência é sinalizada no
 * checkpoint como pendência.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const RESTRICTED_ROLE = 'rls_test_role';

describe.skipIf(!DATABASE_URL)('isolamento de tenant via RLS', () => {
  let client: DbClient;
  let tenantOrg: string;
  let tenantIndividual: string;

  beforeAll(async () => {
    client = createDbClient(DATABASE_URL!);
    const sql = client.sql;

    // Schema + políticas RLS.
    await runMigrations(client.db);

    // Papel restrito (NÃO é dono das tabelas, NÃO é superuser => sujeito ao RLS).
    await sql.unsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${RESTRICTED_ROLE}') THEN
          CREATE ROLE ${RESTRICTED_ROLE} NOLOGIN;
        END IF;
      END $$;
    `);
    await sql.unsafe(`GRANT USAGE ON SCHEMA public TO ${RESTRICTED_ROLE};`);
    await sql.unsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${RESTRICTED_ROLE};`,
    );

    // Seed via conexão admin (bypassa RLS): um tenant de cada segmento.
    const [org] = await sql<{ id: string }[]>`
      insert into tenants (tenant_type, name) values ('organization', 'Escola Teste')
      returning id`;
    const [ind] = await sql<{ id: string }[]>`
      insert into tenants (tenant_type, name) values ('individual', 'Professor Teste')
      returning id`;
    tenantOrg = org!.id;
    tenantIndividual = ind!.id;

    await sql`insert into memberships (tenant_id, user_id, role)
      values (${tenantOrg}, gen_random_uuid(), 'owner')`;
    await sql`insert into memberships (tenant_id, user_id, role)
      values (${tenantIndividual}, gen_random_uuid(), 'owner')`;
  });

  afterAll(async () => {
    if (!client) return;
    const sql = client.sql;
    await sql`delete from memberships where tenant_id in (${tenantOrg}, ${tenantIndividual})`;
    await sql`delete from tenants where id in (${tenantOrg}, ${tenantIndividual})`;
    await client.close();
  });

  /** Roda uma query sob o papel restrito + app.tenant_id setado (simula a sessão real). */
  async function asTenant<T>(tenantId: string, query: string): Promise<T[]> {
    const sql = client.sql;
    return sql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL ROLE ${RESTRICTED_ROLE}`);
      await tx`select set_config('app.tenant_id', ${tenantId}, true)`;
      return tx.unsafe(query);
    }) as unknown as Promise<T[]>;
  }

  it('uma sessão só enxerga memberships do próprio tenant', async () => {
    const rowsOrg = await asTenant<{ tenant_id: string }>(tenantOrg, 'select * from memberships');
    expect(rowsOrg.length).toBe(1);
    expect(rowsOrg.every((r) => r.tenant_id === tenantOrg)).toBe(true);
  });

  it('não vaza dados cross-segmento (organization não vê individual)', async () => {
    const rows = await asTenant<{ id: string }>(
      tenantOrg,
      `select * from memberships where tenant_id = '${tenantIndividual}'`,
    );
    expect(rows.length).toBe(0);
  });

  it('sessão sem app.tenant_id setado enxerga ZERO linhas (default seguro)', async () => {
    const sql = client.sql;
    const rows = (await sql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL ROLE ${RESTRICTED_ROLE}`);
      return tx.unsafe('select * from memberships');
    })) as unknown as unknown[];
    expect(rows.length).toBe(0);
  });
});
