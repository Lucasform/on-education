import { SubmitButton } from '@/components/submit-button';
import { listSubjects } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { BulkAddRows } from '@/components/bulk-add-rows';
import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  createSubjectAction,
  deleteSubjectAction,
  importSubjectsAction,
} from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Disciplinas · Edu On Way' };

export default async function DisciplinasPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const disciplinas = await listSubjects(db(), ctx);

  return (
    <>
      <PageHeader title="Disciplinas" description="Matérias oferecidas pela escola." />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Disciplinas ({disciplinas.length})</h2>
          {disciplinas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma disciplina ainda.</p>
          ) : (
            <ul className="divide-y divide-border/60 text-sm">
              {disciplinas.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span>{s.name}</span>
                  <form action={deleteSubjectAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <ConfirmButton
                      size="sm"
                      variant="ghost"
                      message={`Excluir "${s.name}"? Essa ação não pode ser desfeita.`}
                    >
                      Excluir
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-5">
          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Nova disciplina</h2>
            <form action={createSubjectAction} className="flex flex-col gap-2">
              <input name="name" required placeholder="Ex.: Matemática" className={fieldClass} />
              <SubmitButton type="submit" size="sm">
                Adicionar disciplina
              </SubmitButton>
            </form>
          </div>
          <div className={cardClass}>
            <h2 className="mb-1 text-sm font-medium">Adicionar em lote</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Uma disciplina por linha. Clique em "+" para adicionar mais.
            </p>
            <form action={importSubjectsAction} className="flex flex-col gap-3">
              <BulkAddRows fields={[{ name: 'name', placeholder: 'Ex.: Matemática' }]} />
              <SubmitButton type="submit" size="sm" variant="outline">
                Importar disciplinas
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
