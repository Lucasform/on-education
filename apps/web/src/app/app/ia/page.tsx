import { SubmitButton } from '@/components/submit-button';
import { isAiConfigured, listDrafts } from '@on-education/module-ia';
import { getTenantSettings, listClasses } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { GerarAtividadeForm } from '@/components/gerar-atividade-form';
import { MarkdownView } from '@/components/markdown-view';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  approveDraftAction,
  approveDraftToBankAction,
  discardDraftAction,
  generateContentAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'WayOn · Edu On Way' };

const KIND_LABEL: Record<string, string> = {
  lesson_plan: 'Plano de aula',
  activity: 'Atividade',
  essay: 'Redação',
  tutor: 'Tutor',
  outro: 'Outro',
};
const STATUS_LABEL: Record<string, string> = {
  draft: 'rascunho',
  approved: 'aprovado',
  discarded: 'descartado',
};

export default async function IaPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const [rascunhos, settings, turmas] = await Promise.all([
    listDrafts(db(), ctx),
    getTenantSettings(db(), ctx).catch(() => null),
    listClasses(db(), ctx).catch(() => []),
  ]);
  const aiOn = isAiConfigured();
  const agente = settings?.agentName?.trim() || 'WayOn';

  return (
    <>
      <PageHeader
        title={agente}
        description="Seu agente de ensino. Gere planos e atividades; você revisa e aprova cada rascunho."
      />

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Gerar conteúdo</h2>
        {aiOn ? (
          <form action={generateContentAction} className="flex flex-col gap-2">
            <select name="kind" className={fieldClass} defaultValue="lesson_plan">
              <option value="lesson_plan">Plano de aula</option>
              <option value="flashcards">Flashcards</option>
              <option value="outro">Outro</option>
            </select>
            <textarea
              name="prompt"
              required
              rows={3}
              placeholder="Ex.: plano de aula sobre frações para o 6º ano"
              className={fieldClass}
            />
            {turmas.length > 0 && (
              <select name="classId" defaultValue="" className={fieldClass}>
                <option value="">Basear nos materiais de uma turma (opcional)</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            <SubmitButton type="submit" size="sm">
              Gerar com o WayOn
            </SubmitButton>
            <p className="text-xs text-muted-foreground">
              Flashcards abrem direto na tela de estudo. O resto vira rascunho para você revisar.
            </p>
          </form>
        ) : (
          <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
            WayOn indisponível. Configure <code>ANTHROPIC_API_KEY</code> para gerar.
          </p>
        )}
      </div>

      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Criar atividade, prova, trabalho ou roteiro</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Gera o material já no banco, classificado. Em <strong>Trabalho</strong>, escolha
          individual ou em grupo (nº de alunos) e os materiais que os alunos devem usar.
        </p>
        {aiOn ? (
          <GerarAtividadeForm turmas={turmas.map((t) => ({ id: t.id, name: t.name }))} />
        ) : (
          <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
            WayOn indisponível. Configure <code>ANTHROPIC_API_KEY</code>.
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
