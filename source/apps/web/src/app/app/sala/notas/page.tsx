import { SubmitButton } from '@/components/submit-button';
import { listClasses, listGradeComponents, listStudents } from '@on-education/module-nucleo';
import { listGrades } from '@on-education/module-sala-de-aula';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { deleteGradeAction, recordGradeAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notas · Edu On Way' };

const KIND_LABEL: Record<string, string> = {
  formal: 'avaliação',
  participacao: 'participação',
  anotacao: 'anotação',
};

export default async function NotasPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; studentId?: string }>;
}) {
  const { classId: filterClass, studentId: filterStudent } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const isSchool = ctx.tenantType === 'organization';
  const [todasNotas, alunos, turmas, componentes] = await Promise.all([
    listGrades(client, ctx).catch(() => []),
    listStudents(client, ctx).catch(() => []),
    listClasses(client, ctx).catch(() => []),
    isSchool ? listGradeComponents(client, ctx).catch(() => []) : Promise.resolve([]),
  ]);

  const alunoNome = new Map(alunos.map((a) => [a.id, a.fullName]));
  const compNome = new Map(componentes.map((c) => [c.id, c.name]));

  // Filtros
  const notas = todasNotas.filter((n) => {
    if (filterClass && n.classId !== filterClass) return false;
    if (filterStudent && n.studentId !== filterStudent) return false;
    return true;
  });

  // Agrupa por aluno para exibição
  const porAluno = new Map<string, typeof notas>();
  for (const n of notas) {
    const arr = porAluno.get(n.studentId) ?? [];
    arr.push(n);
    porAluno.set(n.studentId, arr);
  }
  const alunosComNota = [...porAluno.entries()].sort(([a], [b]) =>
    (alunoNome.get(a) ?? '').localeCompare(alunoNome.get(b) ?? '', 'pt-BR'),
  );

  // Alunos filtrados por turma para o select do formulário
  const alunosFiltrados = filterClass
    ? alunos.filter((a) => a.classId === filterClass)
    : alunos;

  return (
    <>
      <PageHeader
        title="Notas"
        description="Avaliações formais, notas de participação e anotações por aluno."
      />

      {/* Filtros */}
      <form method="get" className={`${cardClass} flex flex-wrap items-end gap-3`}>
        <label className="flex flex-col gap-1 text-sm">
          Turma
          <select name="classId" defaultValue={filterClass ?? ''} className={fieldClass}>
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Aluno
          <select name="studentId" defaultValue={filterStudent ?? ''} className={fieldClass}>
            <option value="">Todos os alunos</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>{a.fullName}</option>
            ))}
          </select>
        </label>
        <SubmitButton type="submit" size="sm" variant="outline">Filtrar</SubmitButton>
        {(filterClass || filterStudent) && (
          <a href="/app/sala/notas" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
            Limpar
          </a>
        )}
      </form>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Lista agrupada por aluno */}
        <div className={cardClass}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Lançamentos ({notas.length})</h2>
            {notas.length > 0 && (
              <a
                href="/app/sala/notas/export"
                className="rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-accent"
              >
                Exportar CSV
              </a>
            )}
          </div>
          {notas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento.</p>
          ) : (
            <div className="space-y-4">
              {alunosComNota.map(([sid, ns]) => (
                <div key={sid}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {alunoNome.get(sid) ?? 'Aluno'}
                  </p>
                  <ul className="space-y-1">
                    {ns.map((n) => (
                      <li key={n.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex-1 min-w-0">
                          <span className="truncate">{n.label}</span>
                          <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                            {KIND_LABEL[n.kind] ?? n.kind}
                          </span>
                          {n.componentId && compNome.get(n.componentId) && (
                            <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                              {compNome.get(n.componentId)}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="font-medium">
                            {n.value === null ? '—' : n.value}
                          </span>
                          <form action={deleteGradeAction}>
                            <input type="hidden" name="id" value={n.id} />
                            <ConfirmButton
                              size="sm"
                              variant="ghost"
                              message={`Excluir o lançamento "${n.label}"?`}
                            >
                              ×
                            </ConfirmButton>
                          </form>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formulário */}
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Novo lançamento</h2>
          <form action={recordGradeAction} className="flex flex-col gap-2">
            <select name="classId" className={fieldClass} defaultValue={filterClass ?? ''}>
              <option value="">Sem turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select name="studentId" required className={fieldClass} defaultValue={filterStudent ?? ''}>
              <option value="" disabled>Selecione o aluno</option>
              {alunosFiltrados.map((a) => (
                <option key={a.id} value={a.id}>{a.fullName}</option>
              ))}
            </select>
            <select name="kind" className={fieldClass} defaultValue="formal">
              <option value="formal">Avaliação (nota formal)</option>
              <option value="participacao">Participação</option>
              <option value="anotacao">Anotação (sem nota)</option>
            </select>
            {isSchool && componentes.length > 0 && (
              <select name="componentId" className={fieldClass} defaultValue="">
                <option value="">Componente da média (opcional)</option>
                {componentes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (peso {c.weight})
                  </option>
                ))}
              </select>
            )}
            <input
              name="label"
              required
              placeholder="Título (ex.: Prova 1, Trabalho bim.)"
              className={fieldClass}
            />
            <input
              name="value"
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="Nota (deixe vazio para anotação)"
              className={fieldClass}
            />
            <input name="note" placeholder="Observação (opcional)" className={fieldClass} />
            <SubmitButton type="submit" size="sm">Lançar</SubmitButton>
          </form>
          {alunos.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Cadastre alunos antes de lançar notas.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
