import type { AuthContext } from '@on-education/auth';
import { isAiConfigured, listDrafts } from '@on-education/module-ia';
import { Button } from '@on-education/ui';

import { approveDraftAction, discardDraftAction, generateDraftAction } from '@/app/app/actions';
import { cardClass, fieldClass } from '@/components/form';
import { MarkdownView } from '@/components/markdown-view';
import { db } from '@/server/db';

/** Gerador de IA reutilizável por tipo (essay, tutor, ...). Rascunho human-in-the-loop. */
export async function IaGenerator({
  ctx,
  kind,
  promptPlaceholder,
  generateLabel,
  students,
}: {
  ctx: AuthContext;
  kind: string;
  promptPlaceholder: string;
  generateLabel: string;
  /** Quando fornecido, mostra um seletor para vincular o rascunho a um aluno. */
  students?: { id: string; fullName: string }[];
}) {
  const all = await listDrafts(db(), ctx);
  const items = all.filter((d) => d.kind === kind);
  const aiOn = isAiConfigured();
  const nameById = new Map((students ?? []).map((s) => [s.id, s.fullName]));

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
            {students && students.length > 0 && (
              <select name="studentId" defaultValue="" className={fieldClass}>
                <option value="">Vincular a um aluno (opcional)</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            )}
            <Button type="submit" size="sm">
              {generateLabel}
            </Button>
          </form>
        ) : (
          <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
            WayOn indisponível. Configure <code>ANTHROPIC_API_KEY</code> para usar.
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
                  <span className="text-muted-foreground">
                    {d.status}
                    {d.studentId && nameById.get(d.studentId) && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                        {nameById.get(d.studentId)}
                      </span>
                    )}
                  </span>
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
                {d.prompt && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">↳ {d.prompt}</p>
                )}
                {d.output && <MarkdownView className="mt-2">{d.output}</MarkdownView>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
