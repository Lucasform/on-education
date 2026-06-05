import { SubmitButton } from '@/components/submit-button';
import { isAiConfigured, listDrafts } from '@on-education/module-ia';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { MarkdownView } from '@/components/markdown-view';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  approveDraftAction,
  approveDraftToBankAction,
  discardDraftAction,
  generateDraftAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'WayOn · Edu On Way' };

const KIND_LABEL: Record<string, string> = {
  lesson_plan: 'Plano de aula',
  activity: 'Atividade',
  essay: 'Redação',
  tutor: 'Tutor',
};
const STATUS_LABEL: Record<string, string> = {
  draft: 'rascunho',
  approved: 'aprovado',
  discarded: 'descartado',
};

export default async function IaPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const rascunhos = await listDrafts(db(), ctx);
  const aiOn = isAiConfigured();

  return (
    <>
      <PageHeader
        title="WayOn"
        description="Seu agente de ensino. Gere planos e atividades; você revisa e aprova cada rascunho."
      />

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Gerar conteúdo</h2>
        {aiOn ? (
          <form action={generateDraftAction} className="flex flex-col gap-2">
            <select name="kind" className={fieldClass} defaultValue="lesson_plan">
              <option value="lesson_plan">Plano de aula</option>
              <option value="activity">Atividade</option>
            </select>
            <textarea
              name="prompt"
              required
              rows={3}
              placeholder="Ex.: plano de aula sobre frações para o 6º ano"
              className={fieldClass}
            />
            <SubmitButton type="submit" size="sm">
              Gerar rascunho
            </SubmitButton>
          </form>
        ) : (
          <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
            IA indisponível. Configure <code>ANTHROPIC_API_KEY</code> para gerar rascunhos.
          </p>
        )}
      </div>

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Rascunhos ({rascunhos.length})</h2>
        {rascunhos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada gerado ainda.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {rascunhos.map((d) => (
              <li key={d.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {KIND_LABEL[d.kind] ?? d.kind}{' '}
                    <span className="text-muted-foreground">
                      · {STATUS_LABEL[d.status] ?? d.status}
                    </span>
                  </span>
                  {d.status === 'draft' && (
                    <span className="flex flex-wrap gap-2">
                      {(d.kind === 'activity' || d.kind === 'lesson_plan') && (
                        <form action={approveDraftToBankAction}>
                          <input type="hidden" name="id" value={d.id} />
                          <SubmitButton type="submit" size="sm">
                            Aprovar e salvar no banco
                          </SubmitButton>
                        </form>
                      )}
                      <form action={approveDraftAction}>
                        <input type="hidden" name="id" value={d.id} />
                        <SubmitButton type="submit" size="sm" variant="outline">
                          Só aprovar
                        </SubmitButton>
                      </form>
                      <form action={discardDraftAction}>
                        <input type="hidden" name="id" value={d.id} />
                        <SubmitButton type="submit" size="sm" variant="ghost">
                          Descartar
                        </SubmitButton>
                      </form>
                    </span>
                  )}
                </div>
                {d.output && (
                  <div className="mt-3 rounded-lg border border-border bg-background/50 p-4">
                    <MarkdownView>{d.output}</MarkdownView>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
