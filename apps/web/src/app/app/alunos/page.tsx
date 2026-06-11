import { SubmitButton } from '@/components/submit-button';
import { listClasses, listStudents } from '@on-education/module-nucleo';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { CsvImport } from '@/components/csv-import';

import {
  createStudentAction,
  deleteStudentAction,
  importStudentsAction,
  importStudentsCsvAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Alunos · Edu On Way' };

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; classId?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const sp = await searchParams;
  const [alunos, turmas] = await Promise.all([listStudents(client, ctx), listClasses(client, ctx)]);
  const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));

  const termo = (sp.q ?? '').trim().toLowerCase();
  const filtrados = alunos
    .filter((a) => !sp.classId || a.classId === sp.classId)
    .filter((a) => !termo || a.fullName.toLowerCase().includes(termo));

  return (
    <>
      <PageHeader title="Alunos" description="Cadastre, importe e acompanhe seus alunos." />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">
            Alunos ({filtrados.length}
            {filtrados.length !== alunos.length ? ` de ${alunos.length}` : ''})
          </h2>

          <form method="get" className="mb-3 flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={sp.q ?? ''}
              placeholder="Buscar por nome…"
              className={`${fieldClass} w-full sm:w-44`}
            />
            {turmas.length > 0 && (
              <select
                name="classId"
                defaultValue={sp.classId ?? ''}
                className={`${fieldClass} w-36`}
              >
                <option value="">Todas as turmas</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            <button type="submit" className="rounded-md border border-border px-3 text-sm">
              Filtrar
            </button>
            {(sp.q || sp.classId) && (
              <Link href="/app/alunos" className="px-2 text-sm text-muted-foreground">
                Limpar
              </Link>
            )}
          </form>

          {filtrados.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {alunos.length === 0 ? 'Nenhum aluno ainda.' : 'Nenhum aluno com esse filtro.'}
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {filtrados.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <Link href={`/app/alunos/${a.id}`} className="hover:underline">
                    {a.fullName}
                    {a.classId && turmaNome.get(a.classId) && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {turmaNome.get(a.classId)}
                      </span>
                    )}
                  </Link>
                  <form action={deleteStudentAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <SubmitButton type="submit" size="sm" variant="ghost">
                      Excluir
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-5">
          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Novo aluno</h2>
            <form action={createStudentAction} className="flex flex-col gap-2">
              <input name="fullName" required placeholder="Nome do aluno" className={fieldClass} />
              <select name="classId" className={fieldClass} defaultValue="">
                <option value="">Sem turma</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Nascimento (opcional)
                <input name="birthDate" type="date" className={fieldClass} />
              </label>
              <SubmitButton type="submit" size="sm">
                Adicionar aluno
              </SubmitButton>
            </form>
          </div>
          <div className={cardClass}>
            <h2 className="mb-1 text-sm font-medium">Importar em lote</h2>
            <p className="mb-2 text-xs text-muted-foreground">
              Um aluno por linha. Opcional: nome e turma separados por ponto e vírgula.
            </p>
            <form action={importStudentsAction} className="flex flex-col gap-2">
              <textarea
                name="lista"
                rows={4}
                placeholder={'Ana Souza; 6º A\nBruno Lima; 6º A\nCarla Dias'}
                className={fieldClass}
              />
              <SubmitButton type="submit" size="sm" variant="outline">
                Importar alunos
              </SubmitButton>
            </form>
          </div>
          <div className={cardClass}>
            <CsvImport
              action={importStudentsCsvAction}
              templateName="modelo-alunos.csv"
              templateContent={
                'nome;turma;nascimento\nAna Souza;6º A;15/03/2014\nBruno Lima;6º A;\nCarla Dias;;\n'
              }
              hint="Colunas: nome, turma (opcional), nascimento (DD/MM/AAAA, opcional)."
            />
          </div>
        </div>
      </div>
    </>
  );
}
