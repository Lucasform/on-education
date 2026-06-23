import 'server-only';

import type { AuthContext } from '@on-education/auth';
import { attendance, type DbClient, grades, students } from '@on-education/db';
import { isNotNull, isNull, sql } from 'drizzle-orm';

export interface AtRiskStudent {
  id: string;
  name: string;
  classId: string | null;
  avg: number | null;
  attendance: number | null;
  reasons: string[];
}

/**
 * Alunos em risco: média abaixo de 60% da escala OU frequência abaixo de 75%.
 * Agregado em 3 queries (sem N+1). Ordena pelos piores primeiro.
 */
export async function listAtRiskStudents(
  client: DbClient,
  ctx: AuthContext,
  scale = 10,
): Promise<AtRiskStudent[]> {
  return client.withTenant(ctx.tenantId, async (tx) => {
    const [alunos, notas, freq] = await Promise.all([
      tx
        .select({ id: students.id, name: students.fullName, classId: students.classId })
        .from(students)
        .where(isNull(students.deletedAt)),
      tx
        .select({ sid: grades.studentId, avg: sql<number>`avg(${grades.value})` })
        .from(grades)
        .where(isNotNull(grades.value))
        .groupBy(grades.studentId),
      tx
        .select({
          sid: attendance.studentId,
          pres: sql<number>`sum(case when ${attendance.present} then 1 else 0 end)`,
          tot: sql<number>`count(*)`,
        })
        .from(attendance)
        .groupBy(attendance.studentId),
    ]);

    const avgMap = new Map(notas.map((n) => [n.sid, Number(n.avg)]));
    const freqMap = new Map(freq.map((f) => [f.sid, { pres: Number(f.pres), tot: Number(f.tot) }]));
    const minAvg = scale * 0.6;

    const out: AtRiskStudent[] = [];
    for (const a of alunos) {
      const avg = avgMap.has(a.id) ? avgMap.get(a.id)! : null;
      const fr = freqMap.get(a.id);
      const attPct = fr && fr.tot > 0 ? (fr.pres / fr.tot) * 100 : null;
      const reasons: string[] = [];
      if (avg !== null && avg < minAvg) reasons.push(`Média ${avg.toFixed(1)} (abaixo de ${minAvg.toFixed(1)})`);
      if (attPct !== null && attPct < 75) reasons.push(`Frequência ${Math.round(attPct)}% (abaixo de 75%)`);
      if (reasons.length > 0)
        out.push({ id: a.id, name: a.name, classId: a.classId, avg, attendance: attPct, reasons });
    }
    return out.sort((x, y) => (x.avg ?? 99) - (y.avg ?? 99));
  });
}
