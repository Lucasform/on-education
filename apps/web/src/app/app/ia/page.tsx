import { isAiConfigured, listDrafts } from '@on-education/module-ia';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { approveDraftAction, discardDraftAction, generateDraftAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'IA pedagógica · On Education' };

export default async function IaPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const rascunhos = await listDrafts(db(), ctx);
  const aiOn = isAiConfigured();

  return (
    <>
      <PageHeader
        title="IA pedagógica"
        description="Gere planos e atividades. Você revisa e aprova cada rascunho."
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
            <Button type="submit" size="sm">
              Gerar rascunho
            </Button>
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
                    {d.kind} <span className="text-muted-foreground">· {d.status}</span>
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
