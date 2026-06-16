import { SubmitButton } from '@/components/submit-button';
import { listClasses, listGradeComponents, listStudents, weightedAverage } from '@on-education/module-nucleo';
import { listAttendance, listGrades } from '@on-education/module-sala-de-aula';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { PrintButton } from '@/components/print-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Boletim · Edu On Way' };

function gradeColor(val: number | null, scale = 10): string {
  if (val === null) return '';
  const pct = val / scale;
  if (pct >= 0.7) return 'text-success font-semibold';
  if (pct >= 0.5) return 'text-warning font-semibold';
  return 'text-danger font-semibold';
}

export default async function BoletimPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId: filterClass } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const isSchool = ctx.tenantType === 'organization';
  const [todosAlunos, notas, presencas, componentes, turmas] = await Promise.all([
    listStudents(client, ctx).catch(() => []),
    listGrades(client, ctx).catch(() => []),
    listAttendance(client, ctx).catch(() => []),
    isSchool ? listGradeComponents(client, ctx).catch(() => []) : Promise.resolve([]),
    listClasses(client, ctx).catch(() => []),
  ]);

  const alunos = filterClass
    ? todosAlunos.filter((a) => a.classId === filterClass)
    : todosAlunos;

  const scale = 10;

  const media = (sid: string) => {
    const m = weightedAverage(
      notas.filter((n) => n.studentId === sid),
      componentes,
    );
    return m;
  };

  const presenca = (sid: string) => {
    const rs = presencas.filter((p) => p.studentId === sid);
    if (!rs.length) return null;
    const presentes = rs.filter((r) => r.present).length;
    return Math.round((presentes / rs.length) * 100);
  };

  const mediaComponente = (sid: string, compId: string) => {
    const vs = notas
      .filter((n) => n.studentId === sid && n.componentId === compId && n.value !== null)
      .map((n) => n.value as number);
    return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3 print:hidden">
        <PageHeader
          title="Boletim"
          description="Média por componente, média final ponderada e frequência por aluno."
        />
        <PrintButton />
      </div>

      {/* Filtro por turma */}
      <form method="get" className={`${cardClass} flex flex-wrap items-end gap-3 print:hidden`}>
        <label className="flex flex-col gap-1 text-sm">
          Turma
          <select name="classId" defaultValue={filterClass ?? ''} className={fieldClass}>
            <option value="">Todos os alunos</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <SubmitButton type="submit" size="sm" variant="outline">Filtrar</SubmitButton>
        {filterClass && (
          <a href="/app/sala/boletim" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
            Limpar
          </a>
        )}
      </form>

      {/* Legenda */}
      <div className="flex gap-4 text-xs print:hidden">
        <span className="flex items-center gap-1.5 text-success">● Aprovado (≥ 7)</span>
        <span className="flex items-center gap-1.5 text-warning">● Recuperação (5–6.9)</span>
        <span className="flex items-center gap-1.5 text-danger">● Reprovado (&lt; 5)</span>
      </div>

      <div className={`${cardClass} overflow-x-auto p-0`}>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Aluno</th>
              {componentes.map((c) => (
                <th key={c.id} className="px-4 py-2.5 font-medium whitespace-nowrap">
                  {c.name}
                  <span className="font-normal opacity-60"> ×{c.weight}</span>
                </th>
              ))}
              <th className="px-4 py-2.5 font-medium whitespace-nowrap">Média final</th>
              <th className="px-4 py-2.5 font-medium whitespace-nowrap">Frequência</th>
              <th className="px-4 py-2.5 font-medium">Situação</th>
            </tr>
          </thead>
          <tbody>
            {alunos.length === 0 && (
              <tr>
                <td
                  colSpan={componentes.length + 4}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  {filterClass ? 'Nenhum aluno nesta turma.' : 'Cadastre alunos e lance notas para ver o boletim.'}
                </td>
              </tr>
            )}
            {alunos.map((a) => {
              const m = media(a.id);
              const freq = presenca(a.id);
              const aprovado = m !== null && m / scale >= 0.7;
              const reprovado = m !== null && m / scale < 0.5;
              return (
                <tr key={a.id} className="border-b border-border/60 last:border-0 hover:bg-accent/30">
                  <td className="px-4 py-2.5 font-medium">{a.fullName}</td>
                  {componentes.map((c) => {
                    const mc = mediaComponente(a.id, c.id);
                    return (
                      <td key={c.id} className={`px-4 py-2.5 ${gradeColor(mc, scale)}`}>
                        {mc === null ? <span className="text-muted-foreground">—</span> : mc.toFixed(1)}
                      </td>
                    );
                  })}
                  <td className={`px-4 py-2.5 ${gradeColor(m, scale)}`}>
                    {m === null ? <span className="text-muted-foreground">—</span> : m.toFixed(1)}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {freq === null ? '—' : `${freq}%`}
                  </td>
                  <td className="px-4 py-2.5">
                    {m === null ? (
                      <span className="text-muted-foreground text-xs">sem nota</span>
                    ) : aprovado ? (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                        Aprovado
                      </span>
                    ) : reprovado ? (
                      <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-medium text-danger">
                        Reprovado
                      </span>
                    ) : (
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
                        Recuperação
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {componentes.length === 0 && isSchool && (
        <p className="text-xs text-muted-foreground print:hidden">
          Dica: defina componentes em Escola › Notas e pesos para detalhar o boletim por Prova,
          Trabalho etc.
        </p>
      )}
    </>
  );
}
