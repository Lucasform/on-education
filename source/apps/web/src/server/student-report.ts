import 'server-only';

import type { AuthContext } from '@on-education/auth';
import type { DbClient } from '@on-education/db';
import { getStudent, resolveGradeComponents, weightedAverage } from '@on-education/module-nucleo';
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
  const [aluno, minhasNotas, minhasPresencas] = await Promise.all([
    getStudent(client, ctx, studentId),
    listGradesForStudent(client, ctx, studentId),
    listAttendanceForStudent(client, ctx, studentId),
  ]);
  if (!aluno) return null;
  const componentes = isSchool
    ? await resolveGradeComponents(client, ctx, aluno.classId ?? null)
    : [];

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

export interface BoletimComponent {
  name: string;
  weight: number;
  average: string;
}
export interface StudentBoletim {
  studentId: string;
  studentName: string;
  className: string | null;
  components: BoletimComponent[];
  finalAverage: string;
  finalNum: number | null;
  attendance: string;
  absences: number;
  status: 'aprovado' | 'recuperacao' | 'reprovado' | 'sem_nota';
  grades: { label: string; value: number | null; kind: string; componentName: string | null }[];
}

/** Boletim completo de um aluno: média por componente, média final, frequência e situação. */
export async function buildStudentBoletim(
  client: DbClient,
  ctx: AuthContext,
  studentId: string,
): Promise<StudentBoletim | null> {
  const isSchool = ctx.tenantType === 'organization';
  const [aluno, notas, presencas] = await Promise.all([
    getStudent(client, ctx, studentId),
    listGradesForStudent(client, ctx, studentId),
    listAttendanceForStudent(client, ctx, studentId),
  ]);
  if (!aluno) return null;
  // Componentes da TURMA do aluno (se a turma tiver os seus); senão os gerais da escola.
  const componentes = isSchool
    ? await resolveGradeComponents(client, ctx, aluno.classId ?? null)
    : [];

  const compName = new Map(componentes.map((c) => [c.id, c.name]));
  const scale = 10;

  const components: BoletimComponent[] = componentes.map((c) => {
    const vs = notas
      .filter((n) => n.componentId === c.id && n.value !== null)
      .map((n) => n.value as number);
    const avg = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
    return { name: c.name, weight: c.weight, average: avg === null ? '—' : avg.toFixed(1) };
  });

  const finalNum = weightedAverage(notas, componentes);
  const finalAverage = finalNum === null ? '—' : finalNum.toFixed(1);
  const presentes = presencas.filter((p) => p.present).length;
  const absences = presencas.length - presentes;
  const attendance = presencas.length
    ? `${Math.round((presentes / presencas.length) * 100)}%`
    : '—';

  const status: StudentBoletim['status'] =
    finalNum === null
      ? 'sem_nota'
      : finalNum / scale >= 0.7
        ? 'aprovado'
        : finalNum / scale < 0.5
          ? 'reprovado'
          : 'recuperacao';

  const grades = notas.map((n) => ({
    label: n.label,
    value: n.value,
    kind: n.kind,
    componentName: n.componentId ? (compName.get(n.componentId) ?? null) : null,
  }));

  return {
    studentId,
    studentName: aluno.fullName,
    className: null,
    components,
    finalAverage,
    finalNum,
    attendance,
    absences,
    status,
    grades,
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
