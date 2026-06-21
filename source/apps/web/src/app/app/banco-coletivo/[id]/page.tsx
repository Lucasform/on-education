import { isEntitled } from '@on-education/module-nucleo';
import { getCollective } from '@on-education/module-pedagogico';
import { notFound, redirect } from 'next/navigation';

import { cardClass } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { WorksheetView } from '@/components/worksheet-view';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { copyCollectiveAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Atividade do banco coletivo · Edu On Way' };

const ROTULO: Record<string, string> = {
  EI: 'Ed. Infantil',
  EF1: 'Fund. I',
  EF2: 'Fund. II',
  EM: 'Ensino Médio',
  outro: 'Outro',
};

export default async function ColetivaPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  if (!(await isEntitled(client, ctx.tenantId, 'marketplace'))) redirect('/app/planos');
  const a = await getCollective(client, id).catch(() => null);
  if (!a) notFound();
  const mine = a.createdBy === ctx.userId;

  return (
    <>
      <a
        href="/app/banco-coletivo"
        className="text-xs text-primary underline-offset-4 hover:underline"
      >
        ← Voltar ao banco coletivo
      </a>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{a.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ROTULO[a.ageRange ?? 'outro'] ?? a.ageRange}
            {a.subject ? ` · ${a.subject}` : ''}
          </p>
        </div>
        {mine ? (
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            Você compartilhou esta atividade
          </span>
        ) : (
          <form action={copyCollectiveAction}>
            <input type="hidden" name="id" value={a.id} />
            <SubmitButton type="submit" size="sm">
              Copiar para meu banco
            </SubmitButton>
          </form>
        )}
      </div>

      <article className={cardClass}>
        <WorksheetView>{a.content}</WorksheetView>
      </article>
    </>
  );
}
