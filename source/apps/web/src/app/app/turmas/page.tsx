import { SubmitButton } from '@/components/submit-button';
import { listClasses } from '@on-education/module-nucleo';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BulkAddRows } from '@/components/bulk-add-rows';
import { ConfirmButton } from '@/components/confirm-button';
import { CsvImport } from '@/components/csv-import';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SERIES } from '@/lib/series';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  createClassAction,
  deleteClassAction,
  duplicateClassesAction,
  importClassesCsvAction,
  importClassesStructuredAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Turmas · Edu On Way' };

const SECOES = ['A', 'B', 'C', 'D', 'E', 'F'];

export default async function TurmasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const sp = await searchParams;
  const turmas = await listClasses(db(), ctx).catch(() => [] as Awaited<ReturnType<typeof listClasses>>);
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
          {/* Nova turma individual */}
          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Nova turma</h2>
            <form action={createClassAction} className="flex flex-col gap-2">
              <select name="serie" className={fieldClass} defaultValue="">
                <option value="" disabled>
                  Selecione a série
                </option>
                {SERIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.value}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <select name="secao" className={fieldClass} defaultValue="">
                  <option value="">Turma única (sem letra)</option>
                  {SECOES.map((s) => (
                    <option key={s} value={s}>
                      Turma {s}
                    </option>
                  ))}
                </select>
                <input name="description" placeholder="Descrição (opcional)" className={fieldClass} />
              </div>
              <SubmitButton type="submit" size="sm">
                Adicionar turma
              </SubmitButton>
            </form>
          </div>

          {/* Importar em lote estruturado */}
          <div className={cardClass}>
            <h2 className="mb-1 text-sm font-medium">Criar turmas em lote</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Escolha a série e marque as turmas. Cria uma turma por letra.
            </p>
            <form action={importClassesStructuredAction} className="flex flex-col gap-3">
              <select name="serie" className={fieldClass} defaultValue="">
                <option value="" disabled>
                  Selecione a série
                </option>
                {SERIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.value}
                  </option>
                ))}
              </select>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Turmas:</p>
                <div className="flex flex-wrap gap-2">
                  {SECOES.map((s) => (
                    <label
                      key={s}
                      className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                    >
                      <input type="checkbox" name="secao" value={s} className="sr-only" />
                      Turma {s}
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Ou digitar turmas personalizadas:
                </p>
                <BulkAddRows
                  fields={[{ name: 'secao', placeholder: 'Ex.: Integral, Noturno' }]}
                />
              </div>
              <SubmitButton type="submit" size="sm" variant="outline">
                Criar turmas
              </SubmitButton>
            </form>
          </div>

          {/* CSV import */}
          <div className={cardClass}>
            <CsvImport
              action={importClassesCsvAction}
              templateName="modelo-turmas.csv"
              templateContent={'nome\n6º A\n6º B\n7º A\n'}
              hint="Coluna: nome. Abra no Excel, preencha e salve como CSV."
            />
          </div>

          {/* Duplicar turmas para novo ano */}
          {turmas.length > 0 && (
            <div className={cardClass}>
              <h2 className="mb-1 text-sm font-medium">Duplicar turmas para novo ano</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                Cria uma cópia de todas as {turmas.length} turmas ativas. Informe um sufixo para
                diferenciar (ex.: 2027) — deixe em branco para copiar com o mesmo nome.
              </p>
              <form action={duplicateClassesAction} className="flex flex-wrap gap-2">
                <input
                  name="suffix"
                  placeholder="Sufixo (ex.: 2027)"
                  className={`${fieldClass} flex-1`}
                />
                <SubmitButton type="submit" size="sm" variant="outline">
                  Duplicar turmas
                </SubmitButton>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
