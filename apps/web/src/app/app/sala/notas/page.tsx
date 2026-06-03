import { listClasses, listGradeComponents, listStudents } from '@on-education/module-nucleo';
import { listGrades } from '@on-education/module-sala-de-aula';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { recordGradeAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notas · On Way Education' };

export default async function NotasPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const isSchool = ctx.tenantType === 'organization';
  const [notas, alunos, turmas, componentes] = await Promise.all([
    listGrades(client, ctx),
    listStudents(client, ctx),
    listClasses(client, ctx),
    isSchool ? listGradeComponents(client, ctx) : Promise.resolve([]),
  ]);
  const alunoNome = new Map(alunos.map((a) => [a.id, a.fullName]));
  const compNome = new Map(componentes.map((c) => [c.id, c.name]));
  const KIND_LABEL: Record<string, string> = {
    formal: 'avaliação',
    participacao: 'participação',
    anotacao: 'anotação',
  };

  return (
    <>
      <PageHeader
        title="Notas"
        description="Avaliações formais, notas de participação e anotações por aluno."
      />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Lançamentos ({notas.length})</h2>
          {notas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento ainda.</p>
          ) : (
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {notas.map((n) => (
                <li key={n.id} className="flex justify-between gap-2">
                  <span>
                    {alunoNome.get(n.studentId) ?? 'Aluno'} · {n.label}
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                      {KIND_LABEL[n.kind] ?? n.kind}
                    </span>
                    {n.componentId && compNome.get(n.componentId) && (
                      <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                        {compNome.get(n.componentId)}
                      </span>
                    )}
                    {n.note && <span className="block text-xs opacity-80">{n.note}</span>}
                  </span>
                  <span className="font-medium text-foreground">
                    {n.value === null ? '—' : n.value}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Novo lançamento</h2>
          <form action={recordGradeAction} className="flex flex-col gap-2">
            <select name="studentId" required className={fieldClass} defaultValue="">
              <option value="" disabled>
                Selecione o aluno
              </option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>
            <select name="classId" className={fieldClass} defaultValue="">
              <option value="">Sem turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
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
              placeholder="Título (ex.: Prova 1, Participação 1º bim.)"
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
            <Button type="submit" size="sm">
              Lançar
            </Button>
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
