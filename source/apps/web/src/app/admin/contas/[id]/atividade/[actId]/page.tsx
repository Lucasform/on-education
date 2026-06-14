import { getTenantActivity } from '@on-education/module-nucleo';
import { notFound } from 'next/navigation';

import { MarkdownView } from '@/components/markdown-view';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Atividade · Admin' };

export default async function AdminActivityPage({
  params,
}: {
  params: Promise<{ id: string; actId: string }>;
}) {
  const { id, actId } = await params;
  const a = await getTenantActivity(db(), id, actId).catch(() => null);
  if (!a) notFound();

  return (
    <>
      <a
        href={`/admin/contas/${id}`}
        className="text-xs text-primary underline-offset-4 hover:underline"
      >
        ← Voltar para a conta
      </a>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{a.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
              {a.kind}
            </span>
            {a.subject && <span>{a.subject}</span>}
            {a.gradeLevel && <span>· {a.gradeLevel}</span>}
            {a.ageBand && <span>· {a.ageBand} anos</span>}
            {a.aiGenerated && <span>· gerada por IA</span>}
            {!a.approved && <span className="text-warning">· rascunho</span>}
          </p>
        </div>
      </div>

      {a.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {a.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <article className="rounded-lg border border-border bg-card p-6">
        {a.content ? (
          <MarkdownView>{a.content}</MarkdownView>
        ) : (
          <p className="text-sm text-muted-foreground">Sem conteúdo.</p>
        )}
      </article>
    </>
  );
}
