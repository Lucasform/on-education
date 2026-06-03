import { listClasses, listStudents } from '@on-education/module-nucleo';
import { listActivities, listQuizzes } from '@on-education/module-pedagogico';
import { listAttendance, listGrades } from '@on-education/module-sala-de-aula';
import { redirect } from 'next/navigation';

import { cardClass, PageHeader } from '@/components/form';
import { PrintButton } from '@/components/print-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Relatórios · On Way Education' };

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={cardClass}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fmt = (n: number | null, suffix = '') => (n === null ? '—' : `${n.toFixed(1)}${suffix}`);
const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : null);

export default async function RelatoriosPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');

  const client = db();
  const [turmas, alunos, notas, presencas, atividades, simulados] = await Promise.all([
    listClasses(client, ctx),
    listStudents(client, ctx),
    listGrades(client, ctx),
    listAttendance(client, ctx),
    listActivities(client, ctx, {}),
    listQuizzes(client, ctx),
  ]);

  // Indicadores gerais da escola (só notas com valor; anotações têm value nulo).
  const comValor = notas.filter((n) => n.value !== null) as { studentId: string; value: number }[];
  const mediaGeral = avg(comValor.map((n) => n.value));
  const presentes = presencas.filter((p) => p.present).length;
  const freqGeral = pct(presentes, presencas.length);

  // Agregação por turma.
  const semTurma = { id: '—', name: 'Sem turma' };
  const grupos = [...turmas, semTurma].map((t) => {
    const ids = new Set(
      alunos.filter((a) => (t.id === '—' ? !a.classId : a.classId === t.id)).map((a) => a.id),
    );
    const notasT = comValor.filter((n) => ids.has(n.studentId)).map((n) => n.value);
    const presT = presencas.filter((p) => ids.has(p.studentId));
    const presentesT = presT.filter((p) => p.present).length;
    return {
      id: t.id,
      name: t.name,
      alunos: ids.size,
      media: avg(notasT),
      freq: pct(presentesT, presT.length),
    };
  });
  const linhas = grupos.filter((g) => g.alunos > 0);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="Relatórios"
          description="Visão de direção: indicadores da escola e desempenho por turma."
        />
        <PrintButton />
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Turmas" value={turmas.length} />
        <Kpi label="Alunos" value={alunos.length} />
        <Kpi label="Média geral" value={fmt(mediaGeral)} />
        <Kpi label="Frequência" value={freqGeral === null ? '—' : `${freqGeral}%`} />
        <Kpi label="Atividades" value={atividades.length} />
        <Kpi label="Simulados" value={simulados.length} />
      </section>

      <section className={`${cardClass} overflow-x-auto p-0`}>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Turma</th>
              <th className="px-4 py-2 font-medium">Alunos</th>
              <th className="px-4 py-2 font-medium">Média</th>
              <th className="px-4 py-2 font-medium">Frequência</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Cadastre turmas e alunos e lance notas para ver os indicadores.
                </td>
              </tr>
            )}
            {linhas.map((g) => (
              <tr key={g.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2 font-medium">{g.name}</td>
                <td className="px-4 py-2 text-muted-foreground">{g.alunos}</td>
                <td className="px-4 py-2">{fmt(g.media)}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {g.freq === null ? '—' : `${g.freq}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
