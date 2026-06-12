import 'server-only';

import type { AuthContext } from '@on-education/auth';
import type { DbClient } from '@on-education/db';
import { getStudent, listGradeComponents, weightedAverage } from '@on-education/module-nucleo';
import { listAttendanceForStudent, listGradesForStudent } from '@on-education/module-sala-de-aula';

export interface StudentSummary {
  studentId: string;
  studentName: string;
  average: string;
  attendance: string;
  gradeLines: string[];
  gradeCount: number;
}

/** Resumo do aluno (média ponderada, frequência, notas) a partir dos dados reais do tenant. */
export async function buildStudentSummary(
  client: DbClient,
  ctx: AuthContext,
  studentId: string,
): Promise<StudentSummary | null> {
  const isSchool = ctx.tenantType === 'organization';
  const [aluno, minhasNotas, minhasPresencas, componentes] = await Promise.all([
    getStudent(client, ctx, studentId),
    listGradesForStudent(client, ctx, studentId),
    listAttendanceForStudent(client, ctx, studentId),
    isSchool ? listGradeComponents(client, ctx) : Promise.resolve([]),
  ]);
  if (!aluno) return null;

  const mediaNum = weightedAverage(minhasNotas, componentes);
  const average = mediaNum === null ? '—' : mediaNum.toFixed(1);
  const attendance = minhasPresencas.length
    ? `${Math.round((minhasPresencas.filter((p) => p.present).length / minhasPresencas.length) * 100)}%`
    : '—';
  const gradeLines = minhasNotas
    .filter((n) => n.value !== null)
    .map((n) => `- ${n.label}: ${n.value}`);

  return {
    studentId,
    studentName: aluno.fullName,
    average,
    attendance,
    gradeLines,
    gradeCount: minhasNotas.length,
  };
}

/** Monta o texto do relatório pra enviar (WhatsApp/print), com recado opcional do WayOn. */
export function buildReportText(s: StudentSummary, recado?: string | null): string {
  const linhas = [
    `*Relatório de ${s.studentName}*`,
    `Média: ${s.average} · Frequência: ${s.attendance}`,
    s.gradeLines.length ? `\nNotas:\n${s.gradeLines.join('\n')}` : '',
    recado ? `\n${recado}` : '',
  ];
  return linhas.filter(Boolean).join('\n');
}
