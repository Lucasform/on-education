import { listClasses } from '@on-education/module-nucleo';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createClassAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Turmas · On Education' };

export default async function TurmasPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const turmas = await listClasses(db(), ctx);

  return (
    <>
      <PageHeader title="Turmas" description="Organize suas turmas e classes." />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Suas turmas ({turmas.length})</h2>
          {turmas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma turma ainda.</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {turmas.map((t) => (
                <li key={t.id}>{t.name}</li>
              ))}
            </ul>
          )}
        </div>
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Nova turma</h2>
          <form action={createClassAction} className="flex flex-col gap-2">
            <input name="name" required placeholder="Nome da turma" className={fieldClass} />
            <input name="description" placeholder="Descrição (opcional)" className={fieldClass} />
            <Button type="submit" size="sm">
              Adicionar turma
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
