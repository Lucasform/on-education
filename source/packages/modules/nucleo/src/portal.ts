import { assertCan, type AuthContext } from '@on-education/auth';
import {
  attendance,
  communications,
  type DbClient,
  grades,
  guardianAccessTokens,
  guardians,
  lessons,
  studentGuardians,
  students,
  subjects,
  terms,
} from '@on-education/db';
import { and, desc, eq, gt, isNull, lte } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';

/** Duração padrão do token de acesso do responsável: 90 dias. */
const TOKEN_DAYS = 90;

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Gera um token de acesso para o responsável e persiste o hash.
 * Retorna o token BRUTO (mostrar uma vez e guardar na mensagem/WhatsApp).
 */
export async function generateGuardianToken(
  client: DbClient,
  ctx: AuthContext,
  guardianId: string,
): Promise<string> {
  assertCan(ctx, 'create', 'member');
  const raw = randomBytes(32).toString('hex');
  const hash = hashToken(raw);
  const expiresAt = new Date(Date.now() + TOKEN_DAYS * 24 * 3600 * 1000);

  await client.withTenant(ctx.tenantId, (tx) =>
    tx.insert(guardianAccessTokens).values({
      tenantId: ctx.tenantId,
      guardianId,
      tokenHash: hash,
      expiresAt,
    }),
  );
  return raw;
}

/** Dados completos do portal para um responsável validado pelo token. */
export interface PortalData {
  guardian: { id: string; fullName: string };
  students: {
    id: string;
    fullName: string;
    className?: string;
    grades: { label: string; subjectName: string | null; termName: string | null; value: number | null; kind: string }[];
    absences: number;
    /** Faltas recentes com data (para notificar o responsável). Mais recentes primeiro. */
    recentAbsences: { date: string; subjectName: string | null }[];
    recentLessons: { date: string; topic: string; subjectName: string | null }[];
  }[];
  communications: { id: string; title: string; body: string; createdAt: Date }[];
}

/**
 * Valida um token de portal e devolve os dados do responsável.
 * Usa conexão sem tenant (tabela global) para ler o hash.
 * Retorna null se o token for inválido ou expirado.
 */
export async function resolvePortalToken(
  client: DbClient,
  rawToken: string,
): Promise<PortalData | null> {
  const hash = hashToken(rawToken);
  const now = new Date();

  const tokenRows = await client.db
    .select()
    .from(guardianAccessTokens)
    .where(
      and(
        eq(guardianAccessTokens.tokenHash, hash),
        gt(guardianAccessTokens.expiresAt, now),
      ),
    )
    .limit(1);

  const tokenRow = tokenRows[0];
  if (!tokenRow) return null;

  const tenantId = tokenRow.tenantId;
  const guardianId = tokenRow.guardianId;

  // Atualiza last_used_at
  await client.db
    .update(guardianAccessTokens)
    .set({ lastUsedAt: now })
    .where(eq(guardianAccessTokens.id, tokenRow.id));

  // Busca dados dentro do tenant
  const [guardianRows, vinculosRows, allTerms] = await Promise.all([
    client.withTenant(tenantId, (tx) =>
      tx.select().from(guardians).where(eq(guardians.id, guardianId)).limit(1),
    ),
    client.withTenant(tenantId, (tx) =>
      tx.select().from(studentGuardians).where(eq(studentGuardians.guardianId, guardianId)),
    ),
    client.withTenant(tenantId, (tx) => tx.select().from(terms)),
  ]);

  const guardian = guardianRows[0];
  if (!guardian) return null;

  const termMap = new Map(allTerms.map((t) => [t.id, t.name]));
  const studentIds = vinculosRows.map((v) => v.studentId);

  if (studentIds.length === 0) {
    return {
      guardian: { id: guardian.id, fullName: guardian.fullName },
      students: [],
      communications: [],
    };
  }

  const [allStudents, allGrades, allAttendance, allLessons, allComms] = await Promise.all([
    client.withTenant(tenantId, (tx) =>
      tx.select().from(students).where(isNull(students.deletedAt)),
    ),
    client.withTenant(tenantId, (tx) =>
      tx
        .select({
          studentId: grades.studentId,
          label: grades.label,
          subjectId: grades.subjectId,
          subjectName: subjects.name,
          termId: grades.termId,
          value: grades.value,
          kind: grades.kind,
        })
        .from(grades)
        .leftJoin(subjects, eq(subjects.id, grades.subjectId))
        .where(isNull(grades.deletedAt))
        .orderBy(desc(grades.createdAt)),
    ),
    client.withTenant(tenantId, (tx) =>
      tx
        .select({
          studentId: attendance.studentId,
          present: attendance.present,
          date: attendance.date,
          subjectName: subjects.name,
        })
        .from(attendance)
        .leftJoin(subjects, eq(subjects.id, attendance.subjectId))
        .orderBy(desc(attendance.date)),
    ),
    client.withTenant(tenantId, (tx) =>
      tx
        .select({
          classId: lessons.classId,
          date: lessons.date,
          topic: lessons.topic,
          subjectName: subjects.name,
        })
        .from(lessons)
        .leftJoin(subjects, eq(subjects.id, lessons.subjectId))
        .where(and(isNull(lessons.deletedAt), lte(lessons.date, new Date().toISOString().slice(0, 10))))
        .orderBy(desc(lessons.date))
        .limit(30),
    ),
    client.withTenant(tenantId, (tx) =>
      tx
        .select({ id: communications.id, title: communications.title, body: communications.body, createdAt: communications.createdAt })
        .from(communications)
        .where(eq(communications.status, 'published'))
        .orderBy(desc(communications.createdAt))
        .limit(5),
    ),
  ]);

  const studentMap = new Map(allStudents.map((s) => [s.id, s]));

  const studentsData = studentIds
    .map((sid) => {
      const s = studentMap.get(sid);
      if (!s) return null;
      const myGrades = allGrades
        .filter((g) => g.studentId === sid)
        .map((g) => ({
          label: g.label,
          subjectName: g.subjectName ?? null,
          termName: g.termId ? (termMap.get(g.termId) ?? null) : null,
          value: g.value,
          kind: g.kind,
        }));
      const myAbsenceRows = allAttendance.filter((a) => a.studentId === sid && !a.present);
      const absences = myAbsenceRows.length;
      const recentAbsences = myAbsenceRows
        .slice(0, 8)
        .map((a) => ({ date: a.date, subjectName: a.subjectName ?? null }));
      const myLessons = allLessons
        .filter((l) => l.classId === s.classId)
        .slice(0, 10)
        .map((l) => ({ date: l.date, topic: l.topic, subjectName: l.subjectName ?? null }));
      return {
        id: s.id,
        fullName: s.fullName,
        className: undefined as string | undefined,
        grades: myGrades,
        absences,
        recentAbsences,
        recentLessons: myLessons,
      };
    })
    .filter(Boolean) as PortalData['students'];

  return {
    guardian: { id: guardian.id, fullName: guardian.fullName },
    students: studentsData,
    communications: allComms,
  };
}

/**
 * Resolve dados do portal para um responsável autenticado por senha (sem token de URL).
 * Retorna null se o guardianId não existir no tenant.
 */
export async function resolvePortalForGuardian(
  client: DbClient,
  guardianId: string,
  tenantId: string,
): Promise<PortalData | null> {
  const [guardianRows, vinculosRows, allTerms] = await Promise.all([
    client.withTenant(tenantId, (tx) =>
      tx.select().from(guardians).where(eq(guardians.id, guardianId)).limit(1),
    ),
    client.withTenant(tenantId, (tx) =>
      tx.select().from(studentGuardians).where(eq(studentGuardians.guardianId, guardianId)),
    ),
    client.withTenant(tenantId, (tx) => tx.select().from(terms)),
  ]);

  const guardian = guardianRows[0];
  if (!guardian) return null;

  const termMap = new Map(allTerms.map((t) => [t.id, t.name]));
  const studentIds = vinculosRows.map((v) => v.studentId);

  if (studentIds.length === 0) {
    return {
      guardian: { id: guardian.id, fullName: guardian.fullName },
      students: [],
      communications: [],
    };
  }

  const [allStudents, allGrades, allAttendance, allLessons, allComms] = await Promise.all([
    client.withTenant(tenantId, (tx) =>
      tx.select().from(students).where(isNull(students.deletedAt)),
    ),
    client.withTenant(tenantId, (tx) =>
      tx
        .select({
          studentId: grades.studentId,
          label: grades.label,
          subjectId: grades.subjectId,
          subjectName: subjects.name,
          termId: grades.termId,
          value: grades.value,
          kind: grades.kind,
        })
        .from(grades)
        .leftJoin(subjects, eq(subjects.id, grades.subjectId))
        .where(isNull(grades.deletedAt))
        .orderBy(desc(grades.createdAt)),
    ),
    client.withTenant(tenantId, (tx) =>
      tx
        .select({
          studentId: attendance.studentId,
          present: attendance.present,
          date: attendance.date,
          subjectName: subjects.name,
        })
        .from(attendance)
        .leftJoin(subjects, eq(subjects.id, attendance.subjectId))
        .orderBy(desc(attendance.date)),
    ),
    client.withTenant(tenantId, (tx) =>
      tx
        .select({
          classId: lessons.classId,
          date: lessons.date,
          topic: lessons.topic,
          subjectName: subjects.name,
        })
        .from(lessons)
        .leftJoin(subjects, eq(subjects.id, lessons.subjectId))
        .where(and(isNull(lessons.deletedAt), lte(lessons.date, new Date().toISOString().slice(0, 10))))
        .orderBy(desc(lessons.date))
        .limit(30),
    ),
    client.withTenant(tenantId, (tx) =>
      tx
        .select({ id: communications.id, title: communications.title, body: communications.body, createdAt: communications.createdAt })
        .from(communications)
        .where(eq(communications.status, 'published'))
        .orderBy(desc(communications.createdAt))
        .limit(5),
    ),
  ]);

  const studentMap = new Map(allStudents.map((s) => [s.id, s]));

  const studentsData = studentIds
    .map((sid) => {
      const s = studentMap.get(sid);
      if (!s) return null;
      const myGrades = allGrades
        .filter((g) => g.studentId === sid)
        .map((g) => ({
          label: g.label,
          subjectName: g.subjectName ?? null,
          termName: g.termId ? (termMap.get(g.termId) ?? null) : null,
          value: g.value,
          kind: g.kind,
        }));
      const myAbsenceRows = allAttendance.filter((a) => a.studentId === sid && !a.present);
      const absences = myAbsenceRows.length;
      const recentAbsences = myAbsenceRows
        .slice(0, 8)
        .map((a) => ({ date: a.date, subjectName: a.subjectName ?? null }));
      const myLessons = allLessons
        .filter((l) => l.classId === s.classId)
        .slice(0, 10)
        .map((l) => ({ date: l.date, topic: l.topic, subjectName: l.subjectName ?? null }));
      return {
        id: s.id,
        fullName: s.fullName,
        className: undefined as string | undefined,
        grades: myGrades,
        absences,
        recentAbsences,
        recentLessons: myLessons,
      };
    })
    .filter(Boolean) as PortalData['students'];

  return {
    guardian: { id: guardian.id, fullName: guardian.fullName },
    students: studentsData,
    communications: allComms,
  };
}

/** Lista os tokens ativos de um responsável. */
export async function listGuardianTokens(
  client: DbClient,
  ctx: AuthContext,
  guardianId: string,
) {
  assertCan(ctx, 'read', 'member');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(guardianAccessTokens)
      .where(
        and(
          eq(guardianAccessTokens.guardianId, guardianId),
          gt(guardianAccessTokens.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(guardianAccessTokens.createdAt)),
  );
}

/** Revoga (soft-expire) todos os tokens de um responsável. */
export async function revokeGuardianTokens(
  client: DbClient,
  ctx: AuthContext,
  guardianId: string,
) {
  assertCan(ctx, 'delete', 'member');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(guardianAccessTokens)
      .set({ expiresAt: new Date() })
      .where(eq(guardianAccessTokens.guardianId, guardianId)),
  );
}
