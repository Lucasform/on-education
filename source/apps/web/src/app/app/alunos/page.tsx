import { SubmitButton } from '@/components/submit-button';
import { isEntitled, listClasses, listStudents } from '@on-education/module-nucleo';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BulkAddRows } from '@/components/bulk-add-rows';
import { BulkCheckbox, BulkDeleteForm } from '@/components/bulk-delete-form';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { UpgradeGate } from '@/components/upgrade-gate';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { CsvImport } from '@/components/csv-import';

import {
  bulkDeleteStudentsAction,
  createStudentAction,
  importStudentsAction,
  importStudentsCsvAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Alunos · Edu On Way' };

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; classId?: string; sort?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (!(await isEntitled(db(), ctx.tenantId, 'students'))) {
    return (
      <>
        <PageHeader title="Alunos" description="Cadastro e histórico dos alunos." />
        <UpgradeGate feature="students" tenantType={ctx.tenantType} />
      </>
    );
  }
  const client = db();
  const sp = await searchParams;
  const [alunos, turmas] = await Promise.all([
    listStudents(client, ctx).catch(() => [] as Awaited<ReturnType<typeof listStudents>>),
    listClasses(client, ctx).catch(() => [] as Awaited<ReturnType<typeof listClasses>>),
  ]);
  const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));

  const termo = (sp.q ?? '').trim().toLowerCase();
  const filtrados = alunos
    .filter((a) => !sp.classId || a.classId === sp.classId)
    .filter((a) => !termo || a.fullName.toLowerCase().includes(termo))
    .sort((a, b) =>
      sp.sort === 'za'
        ? b.fullName.localeCompare(a.fullName, 'pt-BR')
        : a.fullName.localeCompare(b.fullName, 'pt-BR'),
    );

  return (
    <>
      <PageHeader title="Alunos" description="Cadastre, importe e acompanhe seus alunos." />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">
              Alunos ({filtrados.length}
              {filtrados.length !== alunos.length ? ` de ${alunos.length}` : ''})
            </h2>
            {alunos.length > 0 && (
              <a
                href="/app/alunos/export"
                className="rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-accent"
              >
                Exportar CSV
              </a>
            )}
          </div>

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
            <select name="sort" defaultValue={sp.sort ?? 'az'} className={`${fieldClass} w-28`}>
              <option value="az">Nome A-Z</option>
              <option value="za">Nome Z-A</option>
            </select>
            <button type="submit" className="rounded-md border border-border px-3 text-sm">
              Filtrar
            </button>
            {(sp.q || sp.classId || sp.sort === 'za') && (
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
            <BulkDeleteForm action={bulkDeleteStudentsAction} itemLabel="alunos">
              <ul className="space-y-1 text-sm">
                {filtrados.map((a) => (
                  <li key={a.id} className="flex items-center gap-2">
                    <BulkCheckbox value={a.id} />
                    <Link href={`/app/alunos/${a.id}`} className="hover:underline">
                      {a.fullName}
                      {a.classId && turmaNome.get(a.classId) && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {turmaNome.get(a.classId)}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </BulkDeleteForm>
          )}
        </div>
        <div className="flex flex-col gap-5">
          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Novo aluno</h2>
            <form action={createStudentAction} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <input name="fullName" required placeholder="Nome completo do aluno" className={fieldClass} />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Data de nascimento *
                    <input name="birthDate" type="date" required className={fieldClass} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Turma
                    <select name="classId" className={fieldClass} defaultValue="">
                      <option value="">Sem turma</option>
                      {turmas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Responsável: padrão escolar — vincula já no cadastro. */}
              <fieldset className="flex flex-col gap-2 rounded-md border border-border/70 p-3">
                <legend className="px-1 text-xs font-medium text-muted-foreground">
                  Responsável (opcional)
                </legend>
                <input
                  name="guardianName"
                  placeholder="Nome do responsável"
                  className={fieldClass}
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    name="guardianPhone"
                    type="tel"
                    placeholder="Telefone / WhatsApp"
                    className={fieldClass}
                  />
                  <input
                    name="guardianRelation"
                    placeholder="Parentesco (mãe, pai…)"
                    className={fieldClass}
                  />
                </div>
                <input
                  name="guardianEmail"
                  type="email"
                  placeholder="E-mail (opcional)"
                  className={fieldClass}
                />
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-0.5 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name="guardianFinancial" className="h-3.5 w-3.5" />
                    Responsável financeiro
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name="guardianPickup" className="h-3.5 w-3.5" />
                    Pode buscar
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name="guardianEmergency" className="h-3.5 w-3.5" />
                    Contato de emergência
                  </label>
                </div>
              </fieldset>

              <SubmitButton type="submit" size="sm">
                Adicionar aluno
              </SubmitButton>
              <p className="text-[11px] text-muted-foreground">
                * Idade é obrigatória. Você pode completar endereço, dados médicos e mais
                responsáveis na ficha do aluno.
              </p>
            </form>
          </div>
          <div className={cardClass}>
            <h2 className="mb-1 text-sm font-medium">Adicionar em lote</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Um aluno por linha. Clique em "+" para adicionar mais.
            </p>
            <form action={importStudentsAction} className="flex flex-col gap-3">
              <BulkAddRows
                fields={[
                  { name: 'fullName', placeholder: 'Nome do aluno', className: 'flex-[2]' },
                  { name: 'className', placeholder: 'Turma (opcional)' },
                  { name: 'birthDate', placeholder: 'Nascimento (opcional)', type: 'date' },
                ]}
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
