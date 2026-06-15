import { SubmitButton } from '@/components/submit-button';
import { getStudent, listDiaryEntries } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { hojeISO } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createDiaryEntryAction, deleteDiaryEntryAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Diário · Edu On Way' };

const CATEGORY_LABEL: Record<string, string> = {
  observation: 'Observação',
  milestone: 'Marco',
  health: 'Saúde',
  photo: 'Foto',
};

const CATEGORY_CLASS: Record<string, string> = {
  observation: 'bg-blue-500/10 text-blue-500',
  milestone: 'bg-emerald-500/10 text-emerald-500',
  health: 'bg-red-500/10 text-red-500',
  photo: 'bg-purple-500/10 text-purple-500',
};

export default async function DiarioAlunoPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [aluno, entradas] = await Promise.all([
    getStudent(client, ctx, studentId).catch(() => null),
    listDiaryEntries(client, ctx, studentId).catch(() => []),
  ]);
  if (!aluno) redirect('/app/diario-infantil');

  return (
    <>
      <PageHeader
        title={aluno.fullName}
        description="Diário de desenvolvimento"
        back={{ href: '/app/diario-infantil', label: 'Diário Infantil' }}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Registros ({entradas.length})</h2>
          {entradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {entradas.map((e) => (
                <li key={e.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CATEGORY_CLASS[e.category] ?? CATEGORY_CLASS.observation}`}
                      >
                        {CATEGORY_LABEL[e.category] ?? e.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {e.date.split('-').reverse().join('/')}
                      </span>
                    </div>
                    <form action={deleteDiaryEntryAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="studentId" value={studentId} />
                      <ConfirmButton
                        size="sm"
                        variant="ghost"
                        message="Excluir este registro do diário?"
                      >
                        Excluir
                      </ConfirmButton>
                    </form>
                  </div>
                  {e.content && (
                    <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{e.content}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Novo registro</h2>
          <form action={createDiaryEntryAction} className="flex flex-col gap-2">
            <input type="hidden" name="studentId" value={studentId} />
            <div className="flex gap-2">
              <input
                name="date"
                type="date"
                required
                defaultValue={hojeISO()}
                className={fieldClass}
              />
              <select name="category" defaultValue="observation" className={fieldClass}>
                <option value="observation">Observação</option>
                <option value="milestone">Marco</option>
                <option value="health">Saúde</option>
                <option value="photo">Foto</option>
              </select>
            </div>
            <textarea
              name="content"
              rows={4}
              placeholder="Conteúdo do registro (opcional)"
              className={fieldClass}
            />
            <SubmitButton type="submit" size="sm">
              Adicionar registro
            </SubmitButton>
          </form>
        </div>
      </div>
    </>
  );
}
