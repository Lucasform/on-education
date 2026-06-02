import { listClasses } from '@on-education/module-nucleo';
import { listLessons } from '@on-education/module-sala-de-aula';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createLessonAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Diário de classe · On Way Education' };

export default async function DiarioPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [aulas, turmas] = await Promise.all([listLessons(client, ctx), listClasses(client, ctx)]);
  const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));

  return (
    <>
      <PageHeader
        title="Diário de classe"
        description="Registre os conteúdos dados em cada aula."
      />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Aulas registradas ({aulas.length})</h2>
          {aulas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma aula registrada ainda.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {aulas.map((a) => (
                <li key={a.id} className="rounded-md border border-border p-2">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{a.topic}</span>
                    <span className="text-muted-foreground">{a.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {turmaNome.get(a.classId) ?? 'Turma'}
                    {a.notes ? ` · ${a.notes}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Registrar aula</h2>
          <form action={createLessonAction} className="flex flex-col gap-2">
            <select name="classId" required className={fieldClass} defaultValue="">
              <option value="" disabled>
                Selecione a turma
              </option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input name="date" type="date" required className={fieldClass} />
            <input
              name="topic"
              required
              placeholder="Conteúdo / tema da aula"
              className={fieldClass}
            />
            <textarea
              name="notes"
              placeholder="Observações (opcional)"
              rows={2}
              className={fieldClass}
            />
            <Button type="submit" size="sm">
              Registrar
            </Button>
          </form>
          {turmas.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Crie uma turma antes de registrar aulas.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
