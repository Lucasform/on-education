import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, guardians, studentGuardians, students } from '@on-education/db';
import type { CreateGuardianInput, LinkGuardianInput } from '@on-education/validation';
import { and, eq, isNull } from 'drizzle-orm';
import { promisify } from 'node:util';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

export async function hashPortalPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPortalPassword(stored: string, input: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) return false;
  const hash = Buffer.from(hashHex, 'hex');
  const inputHash = await scryptAsync(input, salt, 64);
  return timingSafeEqual(hash, inputHash);
}

/**
 * Responsáveis (Fase 1A.1b). `full_name`/contato são PII (Master Spec §7.4): nunca logar.
 * Vínculo N:N aluno↔responsável com atributos (financeiro, busca, emergência).
 */
export async function createGuardian(
  client: DbClient,
  ctx: AuthContext,
  input: CreateGuardianInput,
) {
  assertCan(ctx, 'create', 'guardian');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(guardians)
      .values({
        tenantId: ctx.tenantId,
        fullName: input.fullName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        cpf: input.cpf ?? null,
        rg: input.rg ?? null,
        address: input.address ?? null,
        profession: input.profession ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

/**
 * Importa responsáveis em lote. Cada item tem nome e, opcionalmente, e-mail e telefone
 * (PII — nunca logar). Retorna quantos foram criados.
 */
export async function createGuardiansBulk(
  client: DbClient,
  ctx: AuthContext,
  items: { fullName: string; email?: string; phone?: string }[],
) {
  assertCan(ctx, 'create', 'guardian');
  const valid = items
    .map((i) => ({
      fullName: i.fullName.trim(),
      email: i.email?.trim() || null,
      phone: i.phone?.trim() || null,
    }))
    .filter((i) => i.fullName);
  if (valid.length === 0) return 0;
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.insert(guardians).values(
      valid.map((i) => ({
        tenantId: ctx.tenantId,
        fullName: i.fullName,
        email: i.email,
        phone: i.phone,
        createdBy: ctx.userId,
      })),
    ),
  );
  return valid.length;
}

export async function listGuardians(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'guardian');
  return client.withTenant(ctx.tenantId, (tx) => tx.select().from(guardians));
}

/**
 * Todos os vínculos responsável↔aluno com nome do aluno e turma (classId). Usado para
 * exibir os responsáveis agrupados POR TURMA e detectar quem está sem vínculo.
 */
export async function listGuardianLinks(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'student_guardian');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select({
        linkId: studentGuardians.id,
        guardianId: studentGuardians.guardianId,
        guardianName: guardians.fullName,
        guardianPhone: guardians.phone,
        studentId: studentGuardians.studentId,
        studentName: students.fullName,
        classId: students.classId,
        relation: studentGuardians.relation,
        isFinancial: studentGuardians.isFinancial,
      })
      .from(studentGuardians)
      .leftJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .leftJoin(students, eq(students.id, studentGuardians.studentId))
      .where(isNull(students.deletedAt)),
  );
}

/** Vincula um responsável a um aluno com os atributos do relacionamento. */
export async function linkGuardian(client: DbClient, ctx: AuthContext, input: LinkGuardianInput) {
  assertCan(ctx, 'create', 'student_guardian');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(studentGuardians)
      .values({
        tenantId: ctx.tenantId,
        studentId: input.studentId,
        guardianId: input.guardianId,
        relation: input.relation ?? null,
        isFinancial: input.isFinancial,
        canPickup: input.canPickup,
        isEmergency: input.isEmergency,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listStudentGuardians(client: DbClient, ctx: AuthContext, studentId: string) {
  assertCan(ctx, 'read', 'student_guardian');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select({
        id: studentGuardians.id,
        guardianId: studentGuardians.guardianId,
        relation: studentGuardians.relation,
        isFinancial: studentGuardians.isFinancial,
        canPickup: studentGuardians.canPickup,
        isEmergency: studentGuardians.isEmergency,
        guardianName: guardians.fullName,
        guardianPhone: guardians.phone,
        guardianEmail: guardians.email,
      })
      .from(studentGuardians)
      .leftJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(eq(studentGuardians.studentId, studentId)),
  );
}

/** Desfaz o vínculo aluno↔responsável (item 5). */
export async function unlinkGuardian(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'student_guardian');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.delete(studentGuardians).where(eq(studentGuardians.id, id)),
  );
}

/** Remove o responsável e todos os seus vínculos com alunos. */
export async function deleteGuardian(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'guardian');
  await client.withTenant(ctx.tenantId, async (tx) => {
    await tx.delete(studentGuardians).where(eq(studentGuardians.guardianId, id));
    await tx.delete(guardians).where(eq(guardians.id, id));
  });
}

/** Define (ou redefine) a senha do portal de um responsável. */
export async function setGuardianPortalPassword(
  client: DbClient,
  ctx: AuthContext,
  guardianId: string,
  rawPassword: string,
) {
  assertCan(ctx, 'update', 'guardian');
  const hash = await hashPortalPassword(rawPassword);
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(guardians)
      .set({ portalPasswordHash: hash, mustChangePassword: true })
      .where(and(eq(guardians.id, guardianId), eq(guardians.tenantId, ctx.tenantId))),
  );
}

/**
 * Busca responsável por e-mail sem contexto de tenant (usado no login do portal).
 * Usa `client.db` diretamente, sem GUC de tenant — a senha é verificada antes de qualquer acesso.
 */
export async function findGuardianForPortalLogin(
  client: DbClient,
  email: string,
): Promise<{
  id: string;
  tenantId: string;
  fullName: string;
  portalPasswordHash: string | null;
  mustChangePassword: boolean;
} | null> {
  const rows = await client.db
    .select({
      id: guardians.id,
      tenantId: guardians.tenantId,
      fullName: guardians.fullName,
      portalPasswordHash: guardians.portalPasswordHash,
      mustChangePassword: guardians.mustChangePassword,
    })
    .from(guardians)
    .where(eq(guardians.email, email))
    .limit(1);
  return rows[0] ?? null;
}

/** Atualiza a senha do portal após o responsável trocar no primeiro acesso. */
export async function updateGuardianPortalPassword(
  client: DbClient,
  guardianId: string,
  rawPassword: string,
) {
  const hash = await hashPortalPassword(rawPassword);
  await client.db
    .update(guardians)
    .set({ portalPasswordHash: hash, mustChangePassword: false })
    .where(eq(guardians.id, guardianId));
}
