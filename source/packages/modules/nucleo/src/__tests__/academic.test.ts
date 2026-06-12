import type { AuthContext } from '@on-education/auth';
import { createDbClient, type DbClient } from '@on-education/db';
import { runMigrations } from '@on-education/db/migrate';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAcademicYear, createSubject, createTerm, listTerms } from '../academic';
import { createStudent } from '../classes';
import { createGuardian, linkGuardian, listStudentGuardians } from '../guardians';
import { provisionOrganizationTenant } from '../organization';

const DATABASE_URL = process.env.DATABASE_URL;
const OWNER_ID = '00000000-0000-0000-0000-0000000000e6';

describe.skipIf(!DATABASE_URL)('escola — estrutura acadêmica + responsáveis (1A.1b)', () => {
  let client: DbClient;
  let tenantId: string;
  let ctx: AuthContext;

  beforeAll(async () => {
    client = createDbClient(DATABASE_URL!);
    await runMigrations(client.db);
    const r = await provisionOrganizationTenant(client, OWNER_ID, {
      ownerEmail: 'sec@escola.dev',
      ownerName: 'Secretaria',
      schoolName: 'Escola Acadêmica',
    });
    tenantId = r.tenantId;
    ctx = { userId: OWNER_ID, tenantId, tenantType: 'organization', roles: ['owner', 'director'] };
  });

  afterAll(async () => {
    if (!client) return;
    for (const t of [
      'student_guardians',
      'guardians',
      'students',
      'terms',
      'academic_years',
      'subjects',
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

  it('cria ano letivo com período e disciplina', async () => {
    const year = await createAcademicYear(client, ctx, { name: '2026' });
    const term = await createTerm(client, ctx, { academicYearId: year.id, name: '1º bimestre' });
    await createSubject(client, ctx, { name: 'Matemática' });

    const terms = await listTerms(client, ctx, year.id);
    expect(terms.some((t) => t.id === term.id)).toBe(true);
  });

  it('vincula responsável a aluno com atributos', async () => {
    const aluno = await createStudent(client, ctx, { fullName: 'Aluno Escola' });
    const resp = await createGuardian(client, ctx, {
      fullName: 'Mãe Teste',
      phone: '+5511999999999',
    });
    await linkGuardian(client, ctx, {
      studentId: aluno.id,
      guardianId: resp.id,
      relation: 'mãe',
      isFinancial: true,
      canPickup: true,
      isEmergency: true,
    });

    const vinculos = await listStudentGuardians(client, ctx, aluno.id);
    expect(vinculos).toHaveLength(1);
    expect(vinculos[0]?.isFinancial).toBe(true);
  });
});
