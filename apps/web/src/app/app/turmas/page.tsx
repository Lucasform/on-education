import { listClasses } from '@on-education/module-nucleo';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { ConfirmButton } from '@/components/confirm-button';
import { CsvImport } from '@/components/csv-import';

import {
  createClassAction,
  deleteClassAction,
  importClassesAction,
  importClassesCsvAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Turmas · On Way Education' };

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
            <ul className="space-y-1 text-sm">
              {turmas.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span>{t.name}</span>
                  <form action={deleteClassAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <ConfirmButton
                      size="sm"
                      variant="ghost"
                      message={`Excluir a turma "${t.name}"? Vai para a Lixeira e pode ser restaurada.`}
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
            <h2 className="mb-3 text-sm font-medium">Nova turma</h2>
            <form action={createClassAction} className="flex flex-col gap-2">
              <input name="name" required placeholder="Nome da turma" className={fieldClass} />
              <input name="description" placeholder="Descrição (opcional)" className={fieldClass} />
              <Button type="submit" size="sm">
                Adicionar turma
              </Button>
            </form>
          </div>
          <div className={cardClass}>
            <h2 className="mb-1 text-sm font-medium">Importar em lote</h2>
            <p className="mb-2 text-xs text-muted-foreground">Uma turma por linha.</p>
            <form action={importClassesAction} className="flex flex-col gap-2">
              <textarea
                name="lista"
                rows={4}
                placeholder={'6º A\n6º B\n7º A'}
                className={fieldClass}
              />
              <Button type="submit" size="sm" variant="outline">
                Importar turmas
              </Button>
            </form>
          </div>
          <div className={cardClass}>
            <CsvImport
              action={importClassesCsvAction}
              templateName="modelo-turmas.csv"
              templateContent={'nome\n6º A\n6º B\n7º A\n'}
              hint="Coluna: nome. Abra no Excel, preencha e salve como CSV."
            />
          </div>
        </div>
      </div>
    </>
  );
}
