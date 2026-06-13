import { KpiCard as Kpi } from '@/components/kpi-card';
import { SubmitButton } from '@/components/submit-button';
import {
  isEntitled,
  listClasses,
  listGradeComponents,
  listOccurrences,
  listStudents,
  weightedAverage,
} from '@on-education/module-nucleo';
import { listActivities, listQuizzes } from '@on-education/module-pedagogico';
import { listAttendance, listGrades } from '@on-education/module-sala-de-aula';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { UpgradeGate } from '@/components/upgrade-gate';
import { PrintButton } from '@/components/print-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Relatórios · Edu On Way' };

/** Barra horizontal simples (sem lib de gráfico): 0..max → largura %. */
function Bar({ value, max, tone }: { value: number | null; max: number; tone: string }) {
  const w = value === null ? 0 : Math.max(2, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${w}%` }} />
    </div>
  );
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fmt = (n: number | null, suffix = '') => (n === null ? '—' : `${n.toFixed(1)}${suffix}`);
const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : null);

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; grade?: string; view?: string }>;
}) {
  const { classId, grade, view = 'graf' } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');

  const client = db();
  if (!await isEntitled(client, ctx.tenantId, 'analytics.director')) {
    return <UpgradeGate feature="analytics.director" tenantType={ctx.tenantType} />;
  }
  const [turmas, alunosAll, notas, presencas, atividades, simulados, ocorrencias, componentes] =
    await Promise.all([
      listClasses(client, ctx),
      listStudents(client, ctx),
      listGrades(client, ctx),
      listAttendance(client, ctx),
      listActivities(client, ctx, {}),
      listQuizzes(client, ctx),
      listOccurrences(client, ctx),
      listGradeComponents(client, ctx),
    ]);

  // Média ponderada por aluno (pesos definidos pela escola). Cacheada por id.
  const notasByStudent = new Map<string, typeof notas>();
  for (const n of notas) {
    const arr = notasByStudent.get(n.studentId) ?? [];
    arr.push(n);
    notasByStudent.set(n.studentId, arr);
  }
  const mediaAluno = (sid: string) => weightedAverage(notasByStudent.get(sid) ?? [], componentes);

  // Filtros (item 15): por turma e/ou por série (gradeLevel). Escopa alunos.
  const seriesDisponiveis = [
    ...new Set(turmas.map((t) => t.gradeLevel).filter(Boolean)),
  ] as string[];
  const turmasDaSerie = new Set(turmas.filter((t) => t.gradeLevel === grade).map((t) => t.id));
  const alunos = alunosAll.filter((a) => {
    if (classId) return a.classId === classId;
    if (grade) return a.classId && turmasDaSerie.has(a.classId);
    return true;
  });
  const filtrando = Boolean(classId || grade);
  const escopoIds = new Set(alunos.map((a) => a.id));
  const inEscopo = (sid: string) => !filtrando || escopoIds.has(sid);

  // Indicadores gerais: média = média das médias (ponderadas) dos alunos do escopo.
  const mediasEscopo = alunos.map((a) => mediaAluno(a.id)).filter((m): m is number => m !== null);
  const presEscopo = presencas.filter((p) => inEscopo(p.studentId));
  const mediaGeral = avg(mediasEscopo);
  const freqGeral = pct(presEscopo.filter((p) => p.present).length, presEscopo.length);

  // Agregação por turma (quando sem filtro) — com barras.
  const semTurma = { id: '—', name: 'Sem turma' };
  const grupos = [...turmas, semTurma].map((t) => {
    const alunosT = alunosAll.filter((a) => (t.id === '—' ? !a.classId : a.classId === t.id));
    const ids = new Set(alunosT.map((a) => a.id));
    const mediasT = alunosT.map((a) => mediaAluno(a.id)).filter((m): m is number => m !== null);
    const presT = presencas.filter((p) => ids.has(p.studentId));
    return {
      id: t.id,
      name: t.name,
      alunos: ids.size,
      media: avg(mediasT),
      freq: pct(presT.filter((p) => p.present).length, presT.length),
    };
  });
  const linhas = grupos.filter((g) => g.alunos > 0);

  // Alunos em risco (item 14): frequência < 75% ou média < 6.
  const risco = alunos
    .map((a) => {
      const ps = presencas.filter((p) => p.studentId === a.id);
      const m = mediaAluno(a.id);
      const f = pct(ps.filter((p) => p.present).length, ps.length);
      return { id: a.id, nome: a.fullName, media: m, freq: f };
    })
    .filter((a) => (a.media !== null && a.media < 6) || (a.freq !== null && a.freq < 75))
    .sort((a, b) => (a.freq ?? 100) - (b.freq ?? 100));

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="Painel da escola"
          description="Visão consolidada: indicadores, desempenho por turma e alunos que precisam de atenção."
        />
        <PrintButton />
      </div>

      <form method="get" className={`${cardClass} flex flex-wrap items-end gap-3 print:hidden`}>
        <label className="flex flex-col gap-1 text-sm">
          Turma
          <select name="classId" defaultValue={classId ?? ''} className={fieldClass}>
            <option value="">Toda a escola</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {seriesDisponiveis.length > 0 && (
          <label className="flex flex-col gap-1 text-sm">
            Série
            <select name="grade" defaultValue={grade ?? ''} className={fieldClass}>
              <option value="">Todas</option>
              {seriesDisponiveis.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Visualização
          <select name="view" defaultValue={view} className={fieldClass}>
            <option value="graf">Gráfico</option>
            <option value="tab">Tabela</option>
          </select>
        </label>
        <SubmitButton type="submit" size="sm" variant="outline">
          Aplicar
        </SubmitButton>
      </form>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Turmas" value={turmas.length} />
        <Kpi label={classId ? 'Alunos (turma)' : 'Alunos'} value={alunos.length} />
        <Kpi label="Média geral" value={fmt(mediaGeral)} />
        <Kpi label="Frequência" value={freqGeral === null ? '—' : `${freqGeral}%`} />
        <Kpi label="Ocorrências" value={ocorrencias.length} />
        <Kpi label="Simulados" value={simulados.length} />
      </section>

      {risco.length > 0 && (
        <section className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">
            Atenção: {risco.length} aluno(s) com frequência &lt; 75% ou média &lt; 6
          </h2>
          <ul className="space-y-1.5 text-sm">
            {risco.slice(0, 12).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <Link href={`/app/alunos/${a.id}`} className="hover:underline">
                  {a.nome}
                </Link>
                <span className="text-xs text-muted-foreground">
                  média {fmt(a.media)} · freq {a.freq === null ? '—' : `${a.freq}%`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!classId && (
        <section className={cardClass}>
          <h2 className="mb-4 text-sm font-medium">Desempenho por turma</h2>
          {linhas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Cadastre turmas e alunos e lance notas para ver os indicadores.
            </p>
          ) : view === 'tab' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-4 font-medium">Turma</th>
                    <th className="py-1.5 pr-4 font-medium">Alunos</th>
                    <th className="py-1.5 pr-4 font-medium">Média</th>
                    <th className="py-1.5 font-medium">Frequência</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((g) => (
                    <tr key={g.id} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 pr-4 font-medium">{g.name}</td>
                      <td className="py-1.5 pr-4 text-muted-foreground">{g.alunos}</td>
                      <td className="py-1.5 pr-4">{fmt(g.media)}</td>
                      <td className="py-1.5 text-muted-foreground">
                        {g.freq === null ? '—' : `${g.freq}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              {linhas.map((g) => (
                <div key={g.id} className="grid grid-cols-[1fr,auto] items-center gap-x-4 gap-y-1">
                  <span className="text-sm font-medium">{g.name}</span>
                  <span className="text-xs text-muted-foreground">{g.alunos} aluno(s)</span>
                  <div className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-xs text-muted-foreground">
                      média {fmt(g.media)}
                    </span>
                    <Bar value={g.media} max={10} tone="bg-primary" />
                  </div>
                  <span />
                  <div className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-xs text-muted-foreground">
                      freq {g.freq === null ? '—' : `${g.freq}%`}
                    </span>
                    <Bar value={g.freq} max={100} tone="bg-emerald-500" />
                  </div>
                  <span />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <p className="text-xs text-muted-foreground print:hidden">
        Atividades no banco: {atividades.length}.
      </p>
    </>
  );
}
