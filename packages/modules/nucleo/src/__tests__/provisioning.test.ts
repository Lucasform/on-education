import type { AuthContext } from '@on-education/auth';
import {
  createDbClient,
  type DbClient,
  entitlements,
  subscriptions,
  usageMeters,
} from '@on-education/db';
import { runMigrations } from '@on-education/db/migrate';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createClass, createStudent, listClasses, listStudents } from '../classes';
import { provisionIndividualTenant } from '../provisioning';

/**
 * Integração ponta-a-ponta do Núcleo individual (1B.1). Requer DATABASE_URL; pulado sem ele.
 * Prova o caminho feliz: signup provisiona o tenant e o professor gerencia turmas/alunos.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const OWNER_ID = '00000000-0000-0000-0000-0000000000a1';

describe.skipIf(!DATABASE_URL)('provisionamento + turmas (Fase 1B.1)', () => {
  let client: DbClient;
  let tenantId: string;

  beforeAll(async () => {
    client = createDbClient(DATABASE_URL!);
    await runMigrations(client.db);
    const result = await provisionIndividualTenant(client, OWNER_ID, {
      ownerEmail: 'professor@teste.dev',
      ownerName: 'Professor Teste',
    });
    tenantId = result.tenantId;
  });

  afterAll(async () => {
    if (!client) return;
    // Limpeza (admin): remove o tenant de teste e seus dados.
    for (const table of [
      'students',
      'classes',
      'usage_meters',
      'entitlements',
      'subscriptions',
      'memberships',
    ]) {
      await client.sql.unsafe(`delete from ${table} where tenant_id = '${tenantId}'`);
    }
    await client.sql`delete from tenants where id = ${tenantId}`;
    await client.close();
  });

  it('semeia assinatura, entitlements e medidor de IA', async () => {
    const [subs, ents, meters] = await Promise.all([
      client.withTenant(tenantId, (tx) => tx.select().from(subscriptions)),
      client.withTenant(tenantId, (tx) => tx.select().from(entitlements)),
      client.withTenant(tenantId, (tx) => tx.select().from(usageMeters)),
    ]);
    expect(subs).toHaveLength(1);
    expect(subs[0]?.planId).toBe('teacher_free');
    expect(ents.length).toBeGreaterThan(0);
    expect(meters.some((m) => m.metric === 'ai_tokens')).toBe(true);
  });

  it('professor cria e lista turma e aluno', async () => {
    const ctx: AuthContext = {
      userId: OWNER_ID,
      tenantId,
      tenantType: 'individual',
      roles: ['owner', 'teacher'],
    };
    const turma = await createClass(client, ctx, { name: 'Reforço de Matemática' });
    await createStudent(client, ctx, { fullName: 'Aluno Um', classId: turma.id });

    const [turmas, alunos] = await Promise.all([
      listClasses(client, ctx),
      listStudents(client, ctx),
    ]);
    expect(turmas.some((c) => c.name === 'Reforço de Matemática')).toBe(true);
    expect(alunos.some((s) => s.fullName === 'Aluno Um')).toBe(true);
  });
});
