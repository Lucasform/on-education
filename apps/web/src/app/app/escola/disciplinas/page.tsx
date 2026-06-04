import { SubmitButton } from '@/components/submit-button';
import { listSubjects } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createSubjectAction, importSubjectsAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Disciplinas · On Way Education' };

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
          <ul className="space-y-1 text-sm text-muted-foreground">
            {disciplinas.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
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
            <h2 className="mb-1 text-sm font-medium">Importar em lote</h2>
            <p className="mb-2 text-xs text-muted-foreground">Uma disciplina por linha.</p>
            <form action={importSubjectsAction} className="flex flex-col gap-2">
              <textarea
                name="lista"
                rows={4}
                placeholder={'Matemática\nPortuguês\nCiências'}
                className={fieldClass}
              />
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
