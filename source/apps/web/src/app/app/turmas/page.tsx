import { SubmitButton } from '@/components/submit-button';
import { listClasses } from '@on-education/module-nucleo';
import Link from 'next/link';
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
export const metadata = { title: 'Turmas · Edu On Way' };

export default async function TurmasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const sp = await searchParams;
  const turmas = await listClasses(db(), ctx);
  const termo = (sp.q ?? '').trim().toLowerCase();
  const filtradas = termo ? turmas.filter((t) => t.name.toLowerCase().includes(termo)) : turmas;

  return (
    <>
      <PageHeader title="Turmas" description="Organize suas turmas e classes." />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">
            Suas turmas ({filtradas.length}
            {filtradas.length !== turmas.length ? ` de ${turmas.length}` : ''})
          </h2>

          {turmas.length > 3 && (
            <form method="get" className="mb-3 flex flex-wrap gap-2">
              <input
                name="q"
                defaultValue={sp.q ?? ''}
                placeholder="Buscar turma…"
                className={`${fieldClass} w-full sm:w-44`}
              />
              <button type="submit" className="rounded-md border border-border px-3 text-sm">
                Filtrar
              </button>
              {sp.q && (
                <Link href="/app/turmas" className="px-2 text-sm text-muted-foreground">
                  Limpar
                </Link>
              )}
            </form>
          )}

          {filtradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {turmas.length === 0 ? 'Nenhuma turma ainda.' : 'Nenhuma turma com esse nome.'}
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {filtradas.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <Link href={`/app/turmas/${t.id}`} className="hover:underline">
                    {t.name}
                    {t.gradeLevel && (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {t.gradeLevel}
                      </span>
                    )}
                  </Link>
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
              <div className="flex gap-2">
                <input name="gradeLevel" placeholder="Série/ano" className={fieldClass} />
                <input name="ageRange" placeholder="Faixa etária" className={fieldClass} />
              </div>
              <input name="description" placeholder="Descrição (opcional)" className={fieldClass} />
              <SubmitButton type="submit" size="sm">
                Adicionar turma
              </SubmitButton>
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
              <SubmitButton type="submit" size="sm" variant="outline">
                Importar turmas
              </SubmitButton>
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
