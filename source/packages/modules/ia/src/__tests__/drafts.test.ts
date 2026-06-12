import type { AuthContext } from '@on-education/auth';
import { createDbClient, type DbClient } from '@on-education/db';
import { runMigrations } from '@on-education/db/migrate';
import { provisionIndividualTenant } from '@on-education/module-nucleo';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { approveDraft, generateDraft, listDrafts } from '../drafts';
import type { AiProvider } from '../provider';
import { getUsedTokens } from '../quota';

/**
 * Integração do fluxo de IA (1B.2) SEM precisar de ANTHROPIC_API_KEY: injeta um provider
 * fake. Prova cota medida + rascunho persistido + aprovação (human-in-the-loop).
 * Requer DATABASE_URL; pulado sem ele.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const OWNER_ID = '00000000-0000-0000-0000-0000000000c3';

const fakeProvider: AiProvider = {
  async generate() {
    return { text: 'Plano de aula (rascunho)', tokensIn: 12, tokensOut: 34, model: 'fake-model' };
  },
};

describe.skipIf(!DATABASE_URL)('IA — rascunho + cota (1B.2)', () => {
  let client: DbClient;
  let tenantId: string;
  let ctx: AuthContext;

  beforeAll(async () => {
    client = createDbClient(DATABASE_URL!);
    await runMigrations(client.db);
    const r = await provisionIndividualTenant(client, OWNER_ID, {
      ownerEmail: 'ia@teste.dev',
      ownerName: 'Prof IA',
      workspaceName: 'Aulas do Prof IA',
    });
    tenantId = r.tenantId;
    ctx = { userId: OWNER_ID, tenantId, tenantType: 'individual', roles: ['owner', 'teacher'] };
  });

  afterAll(async () => {
    if (!client) return;
    for (const t of ['ai_drafts', 'usage_meters', 'entitlements', 'subscriptions', 'memberships']) {
      await client.sql.unsafe(`delete from ${t} where tenant_id = '${tenantId}'`);
    }
    await client.sql`delete from tenants where id = ${tenantId}`;
    await client.close();
  });

  it('gera rascunho, mede tokens e aprova', async () => {
    const draft = await generateDraft(
      client,
      ctx,
      { kind: 'lesson_plan', prompt: 'frações para o 6º ano' },
      fakeProvider,
    );
    expect(draft.status).toBe('draft');
    expect(draft.output).toContain('rascunho');

    const used = await getUsedTokens(client, tenantId);
    expect(used).toBeGreaterThanOrEqual(46);

    const approved = await approveDraft(client, ctx, draft.id);
    expect(approved?.status).toBe('approved');

    const all = await listDrafts(client, ctx);
    expect(all).toHaveLength(1);
  });
});
