import { SubmitButton } from '@/components/submit-button';
import { listStudents } from '@on-education/module-nucleo';
import { listPortfolioEntries } from '@on-education/module-pedagogico';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createPortfolioEntryAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Portfólio · On Way Education' };

export default async function PortfolioPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [entradas, alunos] = await Promise.all([
    listPortfolioEntries(client, ctx),
    listStudents(client, ctx),
  ]);
  const alunoNome = new Map(alunos.map((a) => [a.id, a.fullName]));

  return (
    <>
      <PageHeader title="Portfólio" description="Registre evidências e trabalhos de cada aluno." />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Registros ({entradas.length})</h2>
          {entradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {entradas.map((e) => (
                <li key={e.id} className="rounded-md border border-border p-2">
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {alunoNome.get(e.studentId) ?? 'Aluno'}
                    {e.description ? ` · ${e.description}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Novo registro</h2>
          <form action={createPortfolioEntryAction} className="flex flex-col gap-2">
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
            <input
              name="title"
              required
              placeholder="Título (ex.: Projeto de ciências)"
              className={fieldClass}
            />
            <textarea
              name="description"
              rows={3}
              placeholder="Descrição (opcional)"
              className={fieldClass}
            />
            <SubmitButton type="submit" size="sm">
              Adicionar
            </SubmitButton>
          </form>
          {alunos.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Cadastre alunos antes.</p>
          )}
        </div>
      </div>
    </>
  );
}
