import { listClasses, listStudents } from '@on-education/module-nucleo';
import { listAttendance } from '@on-education/module-sala-de-aula';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader, tableWrapClass } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import { buildStudentSummary } from '@/server/student-report';

import { ExportCsvButton } from './ExportCsvButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Construtor de relatórios · Edu On Way' };

const FONTES = [
  { value: 'alunos', label: 'Alunos por turma' },
  { value: 'medias', label: 'Médias e frequência' },
  { value: 'faltas', label: 'Resumo de faltas' },
] as const;

export default async function ConstrutorPage({
  searchParams,
}: {
  searchParams: Promise<{ fonte?: string; turma?: string }>;
}) {
  const { fonte, turma } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  const client = db();
  const turmas = await listClasses(client, ctx).catch(() => []);

  // Dados da tabela, calculados apenas quando os filtros estão presentes.
  type Row = Record<string, string>;
  let rows: Row[] = [];
  let colunas: string[] = [];
  let tituloTabela = '';

  const fonteValida = FONTES.some((f) => f.value === fonte);

  if (fonteValida && fonte) {
    const alunos = await listStudents(client, ctx).catch(() => []);
    const alunosFiltrados = turma ? alunos.filter((a) => a.classId === turma) : alunos;

    if (fonte === 'alunos') {
      const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));
      colunas = ['Nome', 'Turma'];
      tituloTabela = 'Alunos por turma';
      rows = alunosFiltrados.map((a) => ({
        Nome: a.fullName,
        Turma: a.classId ? (turmaNome.get(a.classId) ?? 'Sem turma') : 'Sem turma',
      }));
    } else if (fonte === 'medias') {
      colunas = ['Nome', 'Média', 'Frequência'];
      tituloTabela = 'Médias e frequência';
      const resumos = await Promise.all(
        alunosFiltrados.map((a) => buildStudentSummary(client, ctx, a.id).catch(() => null)),
      );
      rows = resumos
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map((r) => ({
          Nome: r.studentName,
          'Média': r.average,
          'Frequência': r.attendance,
        }));
    } else if (fonte === 'faltas') {
      const registros = await listAttendance(client, ctx).catch(() => []);
      const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));
      const alunoNome = new Map(alunos.map((a) => [a.id, a.fullName]));

      const faltas = registros
        .filter((r) => !r.present)
        .filter((r) => !turma || r.classId === turma);

      const porAluno = new Map<string, number>();
      for (const f of faltas) {
        porAluno.set(f.studentId, (porAluno.get(f.studentId) ?? 0) + 1);
      }

      colunas = ['Nome', 'Turma', 'Faltas'];
      tituloTabela = 'Resumo de faltas';
      rows = [...porAluno.entries()]
        .map(([id, total]) => {
          const aluno = alunos.find((a) => a.id === id);
          return {
            Nome: alunoNome.get(id) ?? 'Aluno',
            Turma: aluno?.classId ? (turmaNome.get(aluno.classId) ?? 'Sem turma') : 'Sem turma',
            Faltas: String(total),
          };
        })
        .sort((a, b) => Number(b.Faltas) - Number(a.Faltas));
    }
  }

  const turmaSelecionada = turmas.find((t) => t.id === turma);

  return (
    <>
      <PageHeader
        title="Construtor de relatórios"
        description="Escolha a fonte de dados e a turma para gerar e exportar um relatório."
        back={{ href: '/app/relatorios', label: 'Relatórios' }}
      />

      <form method="get" className={`${cardClass} flex flex-wrap items-end gap-3`}>
        <label className="flex flex-col gap-1 text-sm">
          Fonte de dados
          <select name="fonte" defaultValue={fonte ?? ''} className={`${fieldClass} min-w-[200px]`}>
            <option value="">Selecione...</option>
            {FONTES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Turma
          <select name="turma" defaultValue={turma ?? ''} className={`${fieldClass} min-w-[180px]`}>
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <SubmitButton type="submit" size="sm" variant="outline">
          Gerar relatório
        </SubmitButton>
      </form>

      {!fonteValida && !fonte && (
        <div className={`${cardClass} text-sm text-muted-foreground`}>
          Selecione uma fonte de dados e clique em "Gerar relatório" para visualizar os dados.
        </div>
      )}

      {fonteValida && fonte && (
        <section className={cardClass}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">{tituloTabela}</h2>
              {turmaSelecionada && (
                <p className="text-xs text-muted-foreground">Turma: {turmaSelecionada.name}</p>
              )}
              <p className="text-xs text-muted-foreground">{rows.length} registro(s)</p>
            </div>
            <ExportCsvButton rows={rows} filename={`${fonte}-relatorio.csv`} />
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum dado encontrado para os filtros selecionados.
            </p>
          ) : (
            <div className={tableWrapClass}>
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    {colunas.map((col) => (
                      <th key={col} className="py-1.5 pr-4 font-medium last:pr-0">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      {colunas.map((col) => (
                        <td key={col} className="py-1.5 pr-4 last:pr-0">
                          {row[col] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
