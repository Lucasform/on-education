import { getTenantSettings } from '@on-education/module-nucleo';
import { getActivity } from '@on-education/module-pedagogico';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { PrintButton } from '@/components/print-button';
import { cardClass } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

export default async function AtividadeDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [atividade, settings] = await Promise.all([
    getActivity(client, ctx, id),
    getTenantSettings(client, ctx).catch(() => null),
  ]);
  if (!atividade) notFound();

  return (
    <>
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link
          href="/app/atividades"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          ← Voltar ao banco
        </Link>
        <PrintButton label="Imprimir / PDF" />
      </div>

      {/* documento imprimível, no padrão da escola/professor (identidade no cabeçalho) */}
      <article className={`${cardClass} print:border-0 print:shadow-none`}>
        <header className="mb-4 flex items-center gap-3 border-b border-border pb-4">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <span className="h-12 w-12 rounded-lg bg-primary" />
          )}
          <div>
            <h1 className="text-xl font-bold leading-tight">{atividade.title}</h1>
            <p className="text-xs text-muted-foreground">
              {atividade.subject ? `${atividade.subject} · ` : ''}
              {atividade.aiGenerated ? 'Gerado pelo EduON' : 'Atividade'}
            </p>
          </div>
        </header>

        {atividade.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1 print:hidden">
            {atividade.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {atividade.content || 'Sem conteúdo.'}
        </div>
      </article>
    </>
  );
}
