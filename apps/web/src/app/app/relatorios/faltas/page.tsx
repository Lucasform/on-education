import { SubmitButton } from '@/components/submit-button';
import { listClasses, listStudents, listSubjects } from '@on-education/module-nucleo';
import { listAttendance } from '@on-education/module-sala-de-aula';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader, tableWrapClass } from '@/components/form';
import { PrintButton } from '@/components/print-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Relatório de faltas · Edu On Way' };

export default async function RelatorioFaltasPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; studentId?: string; subjectId?: string }>;
}) {
  const { classId, studentId, subjectId } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');

  const client = db();
  const [turmas, alunos, disciplinas, registros] = await Promise.all([
    listClasses(client, ctx),
    listStudents(client, ctx),
    listSubjects(client, ctx),
    listAttendance(client, ctx),
  ]);

  const alunoNome = new Map(alunos.map((a) => [a.id, a.fullName]));
  const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));
  const subjNome = new Map(disciplinas.map((s) => [s.id, s.name]));

  // Só faltas, aplicando os filtros escolhidos.
  const faltas = registros
    .filter((r) => !r.present)
    .filter((r) => !classId || r.classId === classId)
    .filter((r) => !studentId || r.studentId === studentId)
    .filter((r) => !subjectId || r.subjectId === subjectId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  // Resumo por aluno (total de faltas) para o documento.
  const porAluno = new Map<string, number>();
  for (const f of faltas) porAluno.set(f.studentId, (porAluno.get(f.studentId) ?? 0) + 1);
  const resumo = [...porAluno.entries()]
    .map(([id, total]) => ({ id, nome: alunoNome.get(id) ?? 'Aluno', total }))
    .sort((a, b) => b.total - a.total);

  const escopo = [
    classId ? `Turma: ${turmaNome.get(classId) ?? '—'}` : 'Todas as turmas',
    studentId ? `Aluno: ${alunoNome.get(studentId) ?? '—'}` : null,
    subjectId ? `Matéria: ${subjNome.get(subjectId) ?? '—'}` : 'Todas as matérias',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <div className="flex items-start justify-between gap-3 print:hidden">
        <PageHeader
          title="Relatório de faltas"
          description="Documento de faltas da turma ou individual, por matéria. Use Imprimir para salvar em PDF."
        />
        <PrintButton />
      </div>

      {/* Filtros (não saem na impressão) */}
      <form method="get" className={`${cardClass} flex flex-wrap items-end gap-3 print:hidden`}>
        <label className="flex flex-col gap-1 text-sm">
          Turma
          <select name="classId" defaultValue={classId ?? ''} className={fieldClass}>
            <option value="">Todas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Aluno
          <select name="studentId" defaultValue={studentId ?? ''} className={fieldClass}>
            <option value="">Todos</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Matéria
          <select name="subjectId" defaultValue={subjectId ?? ''} className={fieldClass}>
            <option value="">Todas</option>
            {disciplinas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton type="submit" size="sm" variant="outline">
          Aplicar filtros
        </SubmitButton>
      </form>

      {/* Documento imprimível */}
      <article className="rounded-lg border border-border bg-card p-6 print:border-0 print:p-0">
        <header className="mb-4 border-b border-border pb-3">
          <h2 className="text-lg font-semibold">Relatório de faltas</h2>
          <p className="text-sm text-muted-foreground">{escopo}</p>
          <p className="text-xs text-muted-foreground">
            Total de faltas no escopo: {faltas.length}
          </p>
        </header>

        {resumo.length > 0 && (
          <section className="mb-5">
            <h3 className="mb-2 text-sm font-medium">Resumo por aluno</h3>
            <div className={tableWrapClass}>
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-4 font-medium">Aluno</th>
                    <th className="py-1.5 font-medium">Faltas</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 pr-4">{r.nome}</td>
                      <td className="py-1.5">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-medium">Detalhamento</h3>
          {faltas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma falta registrada para o escopo selecionado.
            </p>
          ) : (
            <div className={tableWrapClass}>
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-4 font-medium">Data</th>
                    <th className="py-1.5 pr-4 font-medium">Aluno</th>
                    <th className="py-1.5 pr-4 font-medium">Turma</th>
                    <th className="py-1.5 font-medium">Matéria</th>
                  </tr>
                </thead>
                <tbody>
                  {faltas.map((f) => (
                    <tr key={f.id} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 pr-4">{f.date}</td>
                      <td className="py-1.5 pr-4">{alunoNome.get(f.studentId) ?? 'Aluno'}</td>
                      <td className="py-1.5 pr-4 text-muted-foreground">
                        {turmaNome.get(f.classId) ?? '—'}
                      </td>
                      <td className="py-1.5 text-muted-foreground">
                        {f.subjectId ? (subjNome.get(f.subjectId) ?? '—') : 'Dia (sem matéria)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </article>
    </>
  );
}
