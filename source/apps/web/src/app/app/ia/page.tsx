import { SubmitButton } from '@/components/submit-button';
import { limitFor } from '@on-education/entitlements';
import { getUsedTokens, isAiConfigured, listDrafts } from '@on-education/module-ia';
import { getTenantPlanId, getTenantSettings, listClasses } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { AgentNameText } from '@/components/agent-name-provider';
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
  const [rascunhos, settings, turmas, planId, usedTokens] = await Promise.all([
    listDrafts(db(), ctx).catch(() => [] as Awaited<ReturnType<typeof listDrafts>>),
    getTenantSettings(db(), ctx).catch(() => null),
    listClasses(db(), ctx).catch(() => []),
    getTenantPlanId(db(), ctx.tenantId).catch(() => null),
    getUsedTokens(db(), ctx.tenantId).catch(() => 0),
  ]);
  const aiOn = isAiConfigured();
  const agente = settings?.agentName?.trim() || 'WayOn';

  // Cota de IA do mês (tokens). limit -1/undefined = ilimitado.
  const tokenLimit = planId ? limitFor(planId, 'aiTokensPerMonth') : undefined;
  const ilimitado = tokenLimit === undefined || tokenLimit === -1;
  const usoPct =
    ilimitado || !tokenLimit ? 0 : Math.min(100, Math.round((usedTokens / tokenLimit) * 100));

  return (
    <>
      <PageHeader
        title={agente}
        description="Seu agente de ensino. Gere planos e atividades; você revisa e aprova cada rascunho."
      />

      {aiOn && (
        <div className={cardClass}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium">Uso do <AgentNameText /> este mês</span>
            <span className="text-xs text-muted-foreground">
              {ilimitado ? 'Plano ilimitado' : `${usoPct}% da cota`}
            </span>
          </div>
          {ilimitado ? (
            <p className="text-xs text-muted-foreground">Sem limite de gerações no seu plano. ✨</p>
          ) : (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${usoPct >= 90 ? 'bg-danger' : usoPct >= 70 ? 'bg-warning' : 'bg-primary'}`}
                  style={{ width: `${usoPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {usoPct >= 100
                  ? 'Cota do mês esgotada. Renova no início do próximo mês.'
                  : `Renova no início do próximo mês.`}
              </p>
            </>
          )}
        </div>
      )}

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
              Gerar com o {agente}
            </SubmitButton>
            <p className="text-xs text-muted-foreground">
              Flashcards abrem direto na tela de estudo para usar com a turma. Os demais conteúdos
              (plano de aula, atividade, prova, texto) viram rascunho para você revisar, editar e
              publicar.
            </p>
          </form>
        ) : (
          <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
            {agente} indisponível. Configure <code>ANTHROPIC_API_KEY</code> para gerar.
          </p>
        )}
      </div>

      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Criar atividade, prova, trabalho ou roteiro</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          O material é gerado e já fica salvo no seu banco de atividades, classificado por tipo.
          Para trabalhos, você define se é individual ou em grupo (com o número de alunos) e quais
          materiais os alunos devem usar como apoio.
        </p>
        {aiOn ? (
          <GerarAtividadeForm turmas={turmas.map((t) => ({ id: t.id, name: t.name }))} />
        ) : (
          <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
            {agente} indisponível. Configure <code>ANTHROPIC_API_KEY</code>.
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
