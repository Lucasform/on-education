import type { AuthContext } from '@on-education/auth';
import { isAiConfigured, listDrafts } from '@on-education/module-ia';
import { Button } from '@on-education/ui';

import { approveDraftAction, discardDraftAction, generateDraftAction } from '@/app/app/actions';
import { cardClass, fieldClass } from '@/components/form';
import { db } from '@/server/db';

/** Gerador de IA reutilizável por tipo (essay, tutor, ...). Rascunho human-in-the-loop. */
export async function IaGenerator({
  ctx,
  kind,
  promptPlaceholder,
  generateLabel,
}: {
  ctx: AuthContext;
  kind: string;
  promptPlaceholder: string;
  generateLabel: string;
}) {
  const all = await listDrafts(db(), ctx);
  const items = all.filter((d) => d.kind === kind);
  const aiOn = isAiConfigured();

  return (
    <>
      <div className={cardClass}>
        {aiOn ? (
          <form action={generateDraftAction} className="flex flex-col gap-2">
            <input type="hidden" name="kind" value={kind} />
            <textarea
              name="prompt"
              required
              rows={5}
              placeholder={promptPlaceholder}
              className={fieldClass}
            />
            <Button type="submit" size="sm">
              {generateLabel}
            </Button>
          </form>
        ) : (
          <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
            IA indisponível. Configure <code>ANTHROPIC_API_KEY</code> para usar.
          </p>
        )}
      </div>

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Resultados ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada gerado ainda.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((d) => (
              <li key={d.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{d.status}</span>
                  {d.status === 'draft' && (
                    <span className="flex gap-2">
                      <form action={approveDraftAction}>
                        <input type="hidden" name="id" value={d.id} />
                        <Button type="submit" size="sm">
                          Aprovar
                        </Button>
                      </form>
                      <form action={discardDraftAction}>
                        <input type="hidden" name="id" value={d.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Descartar
                        </Button>
                      </form>
                    </span>
                  )}
                </div>
                {d.prompt && <p className="mt-1 text-xs text-muted-foreground">↳ {d.prompt}</p>}
                {d.output && (
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{d.output}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
