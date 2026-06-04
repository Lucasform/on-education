import { SubmitButton } from '@/components/submit-button';
import { listGuardians } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { CsvImport } from '@/components/csv-import';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  createGuardianAction,
  importGuardiansAction,
  importGuardiansCsvAction,
} from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Responsáveis · On Way Education' };

export default async function ResponsaveisPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const responsaveis = await listGuardians(db(), ctx);

  return (
    <>
      <PageHeader title="Responsáveis" description="Pais e responsáveis pelos alunos." />
      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Responsáveis ({responsaveis.length})</h2>
        {responsaveis.length === 0 ? (
          <p className="mb-4 text-sm text-muted-foreground">Nenhum responsável ainda.</p>
        ) : (
          <ul className="mb-4 space-y-1 text-sm text-muted-foreground">
            {responsaveis.map((g) => (
              <li key={g.id}>
                {g.fullName}
                {g.phone && <span className="opacity-60"> · {g.phone}</span>}
              </li>
            ))}
          </ul>
        )}
        <form action={createGuardianAction} className="grid gap-2 sm:grid-cols-3">
          <input
            name="fullName"
            required
            placeholder="Nome do responsável"
            className={fieldClass}
          />
          <input name="email" type="email" placeholder="E-mail (opcional)" className={fieldClass} />
          <input name="phone" placeholder="Telefone (opcional)" className={fieldClass} />
          <div className="sm:col-span-3">
            <SubmitButton type="submit" size="sm">
              Adicionar responsável
            </SubmitButton>
          </div>
        </form>
      </div>

      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Importar em lote</h2>
        <p className="mb-2 text-xs text-muted-foreground">
          Um responsável por linha. Formato: <code>Nome; email; telefone</code> (e-mail e telefone
          opcionais).
        </p>
        <form action={importGuardiansAction} className="flex flex-col gap-2">
          <textarea
            name="lista"
            rows={4}
            placeholder={'Maria Souza; maria@email.com; 11999990000\nJoão Lima'}
            className={fieldClass}
          />
          <SubmitButton type="submit" size="sm" variant="outline">
            Importar responsáveis
          </SubmitButton>
        </form>
      </div>

      <div className={cardClass}>
        <CsvImport
          action={importGuardiansCsvAction}
          templateName="modelo-responsaveis.csv"
          templateContent={
            'nome;email;telefone\nMaria Souza;maria@email.com;11999990000\nJoão Lima;;\n'
          }
          hint="Colunas: nome, email (opcional), telefone (opcional)."
        />
      </div>
    </>
  );
}
