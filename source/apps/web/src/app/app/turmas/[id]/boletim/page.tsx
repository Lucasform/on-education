import {
  getClass,
  listClassSubjects,
  listGradeComponents,
  listStudents,
  weightedAverage,
} from '@on-education/module-nucleo';
import { listGrades } from '@on-education/module-sala-de-aula';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PrintButton } from '@/components/print-button';
import { cardClass, PageHeader, tableWrapClass } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

export default async function BoletimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();

  const [turma, todosAlunos, materias, todasNotas, componentes] = await Promise.all([
    getClass(client, ctx, id).catch(() => null),
    listStudents(client, ctx).catch(() => []),
    listClassSubjects(client, ctx, id).catch(() => []),
    listGrades(client, ctx).catch(() => []),
    listGradeComponents(client, ctx).catch(() => []),
  ]);
  if (!turma) redirect('/app/turmas');

  const alunos = todosAlunos.filter((a) => a.classId === id);
  const notasDaTurma = todasNotas.filter((n) => n.classId === id);

  // Para cada aluno, para cada matéria, calcula a média ponderada das notas daquela matéria.
  const subjects = materias.map((m) => ({ id: m.subjectId, name: m.subjectName ?? 'Matéria' }));

  const linhas = alunos.map((aluno) => {
    const notasAluno = notasDaTurma.filter((n) => n.studentId === aluno.id);
    const porMateria = subjects.map((s) => {
      const notas = notasAluno.filter((n) => n.subjectId === s.id);
      return weightedAverage(notas, componentes);
    });
    const mediaGeral = weightedAverage(notasAluno, componentes);
    return { aluno, porMateria, mediaGeral };
  });

  // Ordenar por nome do aluno
  linhas.sort((a, b) => a.aluno.fullName.localeCompare(b.aluno.fullName, 'pt-BR'));

  // Média por coluna (por matéria)
  const mediasColuna = subjects.map((_, si) => {
    const vals = linhas.map((l) => l.porMateria[si]).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  });
  const mediaGeralTurma = (() => {
    const vals = linhas.map((l) => l.mediaGeral).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  })();

  const fmt = (v: number | null) => (v === null ? '—' : v.toFixed(1));
  const cellColor = (v: number | null) => {
    if (v === null) return '';
    if (v < 5) return 'text-destructive font-medium';
    if (v < 7) return 'text-amber-600 font-medium';
    return 'text-emerald-700 font-medium';
  };

  return (
    <>
      <PageHeader
        title={`Boletim — ${turma.name}`}
        description="Médias consolidadas por aluno e matéria."
      />

      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={`/app/turmas/${id}`}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          ← Voltar para a turma
        </Link>
        <PrintButton label="Imprimir boletim" />
      </div>

      {alunos.length === 0 ? (
        <div className={cardClass}>
          <p className="text-sm text-muted-foreground">Nenhum aluno nesta turma ainda.</p>
        </div>
      ) : (
        <div className={cardClass}>
          <div className={tableWrapClass}>
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Aluno</th>
                  {subjects.map((s) => (
                    <th key={s.id ?? s.name} className="py-2 pr-3 text-right font-medium">
                      {s.name}
                    </th>
                  ))}
                  <th className="py-2 pl-2 text-right font-semibold text-foreground">Média</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map(({ aluno, porMateria, mediaGeral }) => (
                  <tr key={aluno.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/app/alunos/${aluno.id}`}
                        className="hover:underline print:no-underline"
                      >
                        {aluno.fullName}
                      </Link>
                    </td>
                    {porMateria.map((v, i) => (
                      <td key={i} className={`py-2 pr-3 text-right ${cellColor(v)}`}>
                        {fmt(v)}
                      </td>
                    ))}
                    <td className={`py-2 pl-2 text-right font-semibold ${cellColor(mediaGeral)}`}>
                      {fmt(mediaGeral)}
                    </td>
                  </tr>
                ))}
                {/* Linha de médias da turma */}
                <tr className="border-t-2 border-border bg-muted/40 text-xs text-muted-foreground">
                  <td className="py-2 pr-4 font-medium">Média da turma</td>
                  {mediasColuna.map((v, i) => (
                    <td key={i} className="py-2 pr-3 text-right font-medium">
                      {fmt(v)}
                    </td>
                  ))}
                  <td className="py-2 pl-2 text-right font-semibold text-foreground">
                    {fmt(mediaGeralTurma)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {subjects.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Vincule matérias à turma para ver as colunas por disciplina.
            </p>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground print:hidden">
        Vermelho = abaixo de 5 · Âmbar = 5–6,9 · Verde = 7 ou mais.
        Médias ponderadas pelos componentes de avaliação configurados.
      </p>
    </>
  );
}
