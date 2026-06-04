import { listCommunications } from '@on-education/module-comunicacao';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { cardClass, PageHeader } from '@/components/form';
import { CopyLink } from '@/components/copy-link';
import { PrintButton } from '@/components/print-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mural dos pais · On Way Education' };

export default async function MuralPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');

  const todos = await listCommunications(db(), ctx);
  const publicados = todos
    .filter((c) => c.status === 'published')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <>
      <div className="flex items-start justify-between gap-3 print:hidden">
        <PageHeader
          title="Mural dos pais"
          description="Avisos publicados, em ordem do mais recente. Imprima ou salve em PDF para divulgar."
        />
        <PrintButton />
      </div>

      <div className={`${cardClass} print:hidden`}>
        <h2 className="mb-1 text-sm font-medium">Link público para os pais</h2>
        <p className="mb-2 text-xs text-muted-foreground">
          Compartilhe este link (ou QR) com os responsáveis. Eles veem só os avisos publicados, sem
          precisar de login.
        </p>
        <CopyLink path={`/mural/${ctx.tenantId}`} />
      </div>

      {publicados.length === 0 ? (
        <div className={cardClass}>
          <p className="text-sm text-muted-foreground">
            Nenhum aviso publicado ainda. Crie e publique em{' '}
            <Link
              href="/app/comunicados"
              className="text-primary underline-offset-4 hover:underline"
            >
              Comunicados
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {publicados.map((c) => (
            <article key={c.id} className={cardClass}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold">{c.title}</h2>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(c.createdAt).toLocaleDateString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                  })}
                </span>
              </div>
              {c.body && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{c.body}</p>
              )}
              {c.aiGenerated && (
                <span className="mt-3 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  gerado com EduON
                </span>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
