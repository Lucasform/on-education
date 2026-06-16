import { SubmitButton } from '@/components/submit-button';
import { listClasses, listStudents, listSubjects } from '@on-education/module-nucleo';
import { listAttendance } from '@on-education/module-sala-de-aula';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { inicioPeriodo, type Periodo } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Faltas · Edu On Way' };

export default async function FaltasPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: Periodo; classId?: string }>;
}) {
  const { periodo = 'mes', classId: filterClass } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [todosRegistros, todosAlunos, turmas, disciplinas] = await Promise.all([
    listAttendance(client, ctx).catch(() => []),
    listStudents(client, ctx).catch(() => []),
    listClasses(client, ctx).catch(() => []),
    listSubjects(client, ctx).catch(() => []),
  ]);

  const subjNome = new Map(disciplinas.map((s) => [s.id, s.name]));
  const desde = inicioPeriodo(periodo);
  const registros = (desde ? todosRegistros.filter((r) => r.date >= desde) : todosRegistros).filter(
    (r) => !filterClass || r.classId === filterClass,
  );

  // Alunos filtrados pela turma selecionada
  const alunos = filterClass
    ? todosAlunos.filter((a) => a.classId === filterClass)
    : todosAlunos;

  // Resumo por aluno
  interface Resumo {
    nome: string;
    total: number;
    presentes: number;
    faltas: number;
    pct: number;
  }
  const resumo: Resumo[] = alunos
    .map((a) => {
      const rs = registros.filter((r) => r.studentId === a.id);
      const total = rs.length;
      const presentes = rs.filter((r) => r.present).length;
      const faltas = total - presentes;
      const pct = total > 0 ? Math.round((presentes / total) * 100) : 100;
      return { nome: a.fullName, total, presentes, faltas, pct };
    })
    .sort((a, b) => a.faltas - b.faltas || a.nome.localeCompare(b.nome, 'pt-BR'));

  const totalFaltas = resumo.reduce((s, r) => s + r.faltas, 0);

  return (
    <>
      <PageHeader
        title="Faltas"
        description="Frequência e faltas por aluno. Para lançar chamada use Sala de aula › Chamada."
      />

      {/* Filtros */}
      <form method="get" className={`${cardClass} flex flex-wrap items-end gap-3`}>
        <label className="flex flex-col gap-1 text-sm">
          Período
          <select name="periodo" defaultValue={periodo} className={fieldClass}>
            <option value="semana">Última semana</option>
            <option value="mes">Último mês</option>
            <option value="tudo">Todo o período</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Turma
          <select name="classId" defaultValue={filterClass ?? ''} className={fieldClass}>
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <SubmitButton type="submit" size="sm" variant="outline">Filtrar</SubmitButton>
      </form>

      {/* Resumo geral */}
      {resumo.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className={cardClass}>
            <div className="text-2xl font-semibold">{registros.length}</div>
            <div className="text-xs text-muted-foreground">Registros no período</div>
          </div>
          <div className={cardClass}>
            <div className="text-2xl font-semibold text-danger">{totalFaltas}</div>
            <div className="text-xs text-muted-foreground">Total de faltas</div>
          </div>
          <div className={cardClass}>
            <div className="text-2xl font-semibold text-success">
              {registros.length > 0
                ? Math.round((registros.filter((r) => r.present).length / registros.length) * 100)
                : 100}%
            </div>
            <div className="text-xs text-muted-foreground">Frequência geral</div>
          </div>
        </div>
      )}

      {/* Tabela por aluno */}
      <div className={`${cardClass} overflow-x-auto p-0`}>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Aluno</th>
              <th className="px-4 py-2.5 font-medium text-center">Aulas</th>
              <th className="px-4 py-2.5 font-medium text-center text-danger">Faltas</th>
              <th className="px-4 py-2.5 font-medium text-center">Frequência</th>
              <th className="px-4 py-2.5 font-medium">Barra</th>
            </tr>
          </thead>
          <tbody>
            {resumo.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum registro no período.
                </td>
              </tr>
            ) : (
              resumo.map((r) => (
                <tr key={r.nome} className="border-b border-border/60 last:border-0 hover:bg-accent/30">
                  <td className="px-4 py-2.5 font-medium">{r.nome}</td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground">{r.total}</td>
                  <td className={`px-4 py-2.5 text-center font-medium ${r.faltas > 0 ? 'text-danger' : 'text-muted-foreground'}`}>
                    {r.faltas}
                  </td>
                  <td className={`px-4 py-2.5 text-center font-medium ${r.pct >= 75 ? 'text-success' : 'text-danger'}`}>
                    {r.pct}%
                  </td>
                  <td className="px-4 py-2.5 w-32">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${r.pct >= 75 ? 'bg-success' : 'bg-danger'}`}
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detalhamento por data (colapsado por padrão no mobile) */}
      {registros.length > 0 && (
        <details className={cardClass}>
          <summary className="cursor-pointer text-sm font-medium">
            Ver registros individuais ({registros.length})
          </summary>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {registros.slice(0, 200).map((r) => {
              const nome = todosAlunos.find((a) => a.id === r.studentId)?.fullName ?? 'Aluno';
              return (
                <li key={r.id} className="flex justify-between gap-2">
                  <span>
                    {nome} · {r.date}
                    {r.subjectId && (
                      <span className="text-xs"> · {subjNome.get(r.subjectId) ?? 'matéria'}</span>
                    )}
                  </span>
                  <span className={r.present ? 'text-success' : 'text-danger'}>
                    {r.present ? 'presente' : 'falta'}
                  </span>
                </li>
              );
            })}
            {registros.length > 200 && (
              <li className="text-xs text-muted-foreground">… e mais {registros.length - 200} registros</li>
            )}
          </ul>
        </details>
      )}
    </>
  );
}
