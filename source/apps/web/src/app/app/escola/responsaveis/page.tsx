import { SubmitButton } from '@/components/submit-button';
import { listGuardians } from '@on-education/module-nucleo';
import { ExternalLink, Link2 } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BulkAddRows } from '@/components/bulk-add-rows';
import { ConfirmButton } from '@/components/confirm-button';
import { CsvImport } from '@/components/csv-import';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  createGuardianAction,
  deleteGuardianAction,
  generateGuardianTokenAction,
  importGuardiansAction,
  importGuardiansCsvAction,
  setGuardianPortalPasswordAction,
} from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Responsáveis · Edu On Way' };

export default async function ResponsaveisPage({
  searchParams,
}: {
  searchParams: Promise<{ portalToken?: string; guardianId?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');

  const { portalToken, guardianId: tokenGuardianId } = await searchParams;
  const responsaveis = await listGuardians(db(), ctx).catch(() => [] as Awaited<ReturnType<typeof listGuardians>>);
  const nomeGuardian = tokenGuardianId
    ? (responsaveis.find((g) => g.id === tokenGuardianId)?.fullName ?? '')
    : '';

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  return (
    <>
      <PageHeader title="Responsáveis" description="Pais e responsáveis pelos alunos." />

      {portalToken && (
        <div className="rounded-lg border border-success/40 bg-success/10 p-4">
          <p className="mb-1 text-sm font-medium text-success">
            Link do portal gerado{nomeGuardian ? ` para ${nomeGuardian}` : ''} (válido 90 dias)
          </p>
          <p className="mb-2 text-xs text-muted-foreground">
            Copie o link abaixo e envie ao responsável. Ele não requer login.
          </p>
          <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
            <code className="flex-1 break-all text-xs">
              {baseUrl}/portal/{portalToken}
            </code>
            <Link
              href={`${baseUrl}/portal/${portalToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-primary"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Guarde este link agora — o valor bruto não será exibido novamente.
          </p>
        </div>
      )}

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Responsáveis ({responsaveis.length})</h2>
        {responsaveis.length === 0 ? (
          <p className="mb-4 text-sm text-muted-foreground">Nenhum responsável ainda.</p>
        ) : (
          <ul className="mb-4 divide-y divide-border text-sm">
            {responsaveis.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {g.fullName}
                  {g.email && <span className="ml-2 text-xs text-muted-foreground">{g.email}</span>}
                  {g.phone && <span className="ml-2 text-xs text-muted-foreground">{g.phone}</span>}
                </span>
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <form action={generateGuardianTokenAction}>
                    <input type="hidden" name="guardianId" value={g.id} />
                    <SubmitButton
                      type="submit"
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Link portal
                    </SubmitButton>
                  </form>
                  <form action={setGuardianPortalPasswordAction} className="flex items-center gap-1">
                    <input type="hidden" name="guardianId" value={g.id} />
                    <input
                      name="password"
                      type="text"
                      placeholder="Senha portal"
                      minLength={6}
                      className="h-7 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      style={{ width: '110px' }}
                    />
                    <SubmitButton type="submit" size="sm" variant="outline">
                      Definir
                    </SubmitButton>
                  </form>
                  <form action={deleteGuardianAction}>
                    <input type="hidden" name="id" value={g.id} />
                    <ConfirmButton
                      size="sm"
                      variant="ghost"
                      message={`Excluir "${g.fullName}" e todos os vínculos? Não pode ser desfeito.`}
                    >
                      Excluir
                    </ConfirmButton>
                  </form>
                </div>
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
        <h2 className="mb-1 text-sm font-medium">Adicionar em lote</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Um responsável por linha. Clique em "+" para adicionar mais.
        </p>
        <form action={importGuardiansAction} className="flex flex-col gap-3">
          <BulkAddRows
            fields={[
              { name: 'fullName', placeholder: 'Nome do responsável', className: 'flex-[2]' },
              { name: 'email', placeholder: 'E-mail (opcional)', type: 'email' },
              { name: 'phone', placeholder: 'Telefone (opcional)' },
            ]}
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
