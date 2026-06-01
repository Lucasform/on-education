import type { AuthContext } from '@on-education/auth';
import { createDbClient, type DbClient, runMigrations } from '@on-education/db';
import { canUse } from '@on-education/entitlements';
import { provisionIndividualTenant } from '@on-education/module-nucleo';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createActivity, deleteActivity, listActivities } from '../activities';

describe('banco de atividades — gating', () => {
  it('teacher_free habilita o banco de atividades', () => {
    expect(canUse('teacher_free', 'activities.bank')).toBe(true);
  });
});

const DATABASE_URL = process.env.DATABASE_URL;
const OWNER_ID = '00000000-0000-0000-0000-0000000000b2';

describe.skipIf(!DATABASE_URL)('banco de atividades — integração (1B.3)', () => {
  let client: DbClient;
  let tenantId: string;
  let ctx: AuthContext;

  beforeAll(async () => {
    client = createDbClient(DATABASE_URL!);
    await runMigrations(client.db);
    const r = await provisionIndividualTenant(client, OWNER_ID, {
      ownerEmail: 'ped@teste.dev',
      ownerName: 'Prof Pedagógico',
    });
    tenantId = r.tenantId;
    ctx = { userId: OWNER_ID, tenantId, tenantType: 'individual', roles: ['owner', 'teacher'] };
  });

  afterAll(async () => {
    if (!client) return;
    for (const t of [
      'activities',
      'usage_meters',
      'entitlements',
      'subscriptions',
      'memberships',
    ]) {
      await client.sql.unsafe(`delete from ${t} where tenant_id = '${tenantId}'`);
    }
    await client.sql`delete from tenants where id = ${tenantId}`;
    await client.close();
  });

  it('cria, busca por tag e faz soft delete', async () => {
    const a = await createActivity(client, ctx, {
      title: 'Frações para 6º ano',
      content: 'conteúdo',
      tags: ['matematica', 'fracoes'],
      aiGenerated: false,
    });
    const porTag = await listActivities(client, ctx, { tag: 'fracoes' });
    expect(porTag.some((x) => x.id === a.id)).toBe(true);

    await deleteActivity(client, ctx, a.id);
    const depois = await listActivities(client, ctx, {});
    expect(depois.some((x) => x.id === a.id)).toBe(false);
  });
});
