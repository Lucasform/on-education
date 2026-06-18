import type { AuthContext } from '@on-education/auth';
import { createDbClient, type DbClient, memberships } from '@on-education/db';
import { runMigrations } from '@on-education/db/migrate';
import { canUse, PLANS } from '@on-education/entitlements';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  acceptInvitation,
  DEFAULT_ORG_PLAN,
  inviteMember,
  listUnits,
  provisionOrganizationTenant,
} from '../organization';

describe('plano default da escola', () => {
  it('é organization; starter tem matrícula e comunicação leve, mas não WhatsApp em massa nem financeiro', () => {
    expect(PLANS[DEFAULT_ORG_PLAN]?.tenantType).toBe('organization');
    expect(canUse(DEFAULT_ORG_PLAN, 'enrollment.official')).toBe(true);
    expect(canUse(DEFAULT_ORG_PLAN, 'communication.light')).toBe(true);
    expect(canUse(DEFAULT_ORG_PLAN, 'communication.mass')).toBe(false);
    expect(canUse(DEFAULT_ORG_PLAN, 'finance.institutional')).toBe(false);
  });
});

const DATABASE_URL = process.env.DATABASE_URL;
const OWNER_ID = '00000000-0000-0000-0000-0000000000d4';
const INVITEE_ID = '00000000-0000-0000-0000-0000000000d5';

describe.skipIf(!DATABASE_URL)('escola — provisionamento + convites (1A.1)', () => {
  let client: DbClient;
  let tenantId: string;
  let ctx: AuthContext;

  beforeAll(async () => {
    client = createDbClient(DATABASE_URL!);
    await runMigrations(client.db);
    const r = await provisionOrganizationTenant(client, OWNER_ID, {
      ownerEmail: 'diretor@escola.dev',
      ownerName: 'Diretora Teste',
      schoolName: 'Escola Teste',
    });
    tenantId = r.tenantId;
    ctx = { userId: OWNER_ID, tenantId, tenantType: 'organization', roles: ['owner', 'director'] };
  });

  afterAll(async () => {
    if (!client) return;
    for (const t of [
      'invitations',
      'units',
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

  it('cria a unidade Sede no provisionamento', async () => {
    const unidades = await listUnits(client, ctx);
    expect(unidades.some((u) => u.name === 'Sede')).toBe(true);
  });

  it('convida e o aceite cria a membership do convidado', async () => {
    const invite = await inviteMember(client, ctx, { email: 'prof@escola.dev', role: 'teacher' });
    const result = await acceptInvitation(client, invite.token, INVITEE_ID);
    expect(result.role).toBe('teacher');

    const mine = await client.withTenant(tenantId, (tx) =>
      tx.select().from(memberships).where(eq(memberships.userId, INVITEE_ID)),
    );
    expect(mine.some((m) => m.role === 'teacher')).toBe(true);
  });
});
