import { SubmitButton } from '@/components/submit-button';
import { isAiConfigured } from '@on-education/module-ia';
import { listClasses, listSubjects } from '@on-education/module-nucleo';
import { listLessonPlans } from '@on-education/module-sala-de-aula';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AgentNameText } from '@/components/agent-name-provider';
import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { MarkdownView } from '@/components/markdown-view';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  createLessonPlanAction,
  deleteLessonPlanAction,
  generateLessonPlanAction,
} from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Planejamento · Edu On Way' };

const KIND_LABEL: Record<string, string> = {
  aula: 'Aula',
  avaliacao: 'Avaliação',
  trabalho: 'Trabalho',
};

export default async function PlanejamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const isSchool = ctx.tenantType === 'organization';

  const turmas = await listClasses(client, ctx).catch(() => []);
  const turmaId = classId || turmas[0]?.id || '';
  const [planos, disciplinas] = await Promise.all([
    turmaId ? listLessonPlans(client, ctx, turmaId).catch(() => []) : Promise.resolve([]),
    isSchool ? listSubjects(client, ctx).catch(() => []) : Promise.resolve([]),
  ]);
  const aiOn = isAiConfigured();

  return (
    <>
      <PageHeader
        title="Planejamento"
        description="Planos de aula, avaliações e trabalhos por turma e matéria. No diário, você liga o registro ao plano."
      />

      {turmas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Crie uma turma primeiro.{' '}
          <Link href="/app/turmas" className="text-primary underline-offset-4 hover:underline">
            Criar turma →
          </Link>
        </p>
      ) : (
        <>
          <form method="get" className={`${cardClass} flex flex-wrap items-end gap-3`}>
            <label className="flex flex-col gap-1 text-sm">
              Turma
              <select name="classId" defaultValue={turmaId} className={fieldClass}>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton type="submit" size="sm" variant="outline">
              Ver turma
            </SubmitButton>
          </form>

          <div className="grid gap-5 md:grid-cols-2">
            <div className={cardClass}>
              <h2 className="mb-3 text-sm font-medium">Planejado ({planos.length})</h2>
              {planos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada planejado para esta turma.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {planos.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-start justify-between gap-2 border-b border-border/60 pb-2 last:border-0"
                    >
                      <span>
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                          {KIND_LABEL[p.kind] ?? p.kind}
                        </span>{' '}
                        <span className="font-medium">{p.title}</span>
                        <span className="text-muted-foreground">
                          {p.subjectName ? ` · ${p.subjectName}` : ''}
                          {p.date ? ` · ${p.date.split('-').reverse().join('/')}` : ''}
                        </span>
                        {p.content && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs text-primary">
                              Ver plano
                            </summary>
                            <div className="mt-1 text-xs">
                              <MarkdownView>{p.content}</MarkdownView>
                            </div>
                          </details>
                        )}
                      </span>
                      <form action={deleteLessonPlanAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          aria-label="Remover do planejamento"
                          message="Remover este item do planejamento?"
                          className="h-6 px-1.5 text-xs"
                        >
                          ✕
                        </ConfirmButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-5">
              <div className={cardClass}>
                <h2 className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Gerar plano com o <AgentNameText />
                </h2>
                <p className="mb-2 text-xs text-muted-foreground">
                  Diga o tema; o <AgentNameText /> monta objetivos, passo a passo, recursos e avaliação. Vai
                  direto pro planejamento desta turma e usa os materiais dela como referência.
                </p>
                {aiOn ? (
                  <form action={generateLessonPlanAction} className="flex flex-col gap-2">
                    <input type="hidden" name="classId" value={turmaId} />
                    <select name="kind" className={fieldClass} defaultValue="aula">
                      <option value="aula">Plano de aula</option>
                      <option value="avaliacao">Avaliação</option>
                      <option value="trabalho">Trabalho</option>
                    </select>
                    {isSchool && (
                      <select name="subjectId" className={fieldClass} defaultValue="">
                        <option value="">Matéria (opcional)</option>
                        {disciplinas.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      name="topic"
                      required
                      placeholder="Tema (ex.: frações equivalentes)"
                      className={fieldClass}
                    />
                    <div className="flex gap-2">
                      <input
                        name="gradeLevel"
                        placeholder="Série/ano (ex.: 5º ano)"
                        className={fieldClass}
                      />
                      <input
                        name="durationMin"
                        type="number"
                        min={10}
                        max={600}
                        placeholder="min"
                        className={`${fieldClass} w-24`}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" name="useBncc" className="h-4 w-4" />
                      Alinhar à BNCC (sugere habilidades/códigos pra você confirmar)
                    </label>
                    <input
                      name="bncc"
                      placeholder="Habilidade BNCC específica (opcional, ex.: EF05MA03)"
                      className={fieldClass}
                    />
                    <textarea
                      name="notes"
                      rows={2}
                      placeholder="Observações (opcional): turma agitada, foco em revisão, etc."
                      className={fieldClass}
                    />
                    <SubmitButton type="submit" size="sm">
                      Gerar e salvar no planejamento
                    </SubmitButton>
                  </form>
                ) : (
                  <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                    <AgentNameText /> indisponível. Configure <code>ANTHROPIC_API_KEY</code> para gerar planos.
                  </p>
                )}
              </div>

              <div className={cardClass}>
                <h2 className="mb-3 text-sm font-medium">Novo item (manual)</h2>
                <form action={createLessonPlanAction} className="flex flex-col gap-2">
                  <input type="hidden" name="classId" value={turmaId} />
                  <select name="kind" className={fieldClass} defaultValue="aula">
                    <option value="aula">Plano de aula</option>
                    <option value="avaliacao">Avaliação</option>
                    <option value="trabalho">Trabalho</option>
                  </select>
                  {isSchool && (
                    <select name="subjectId" className={fieldClass} defaultValue="">
                      <option value="">Matéria (opcional)</option>
                      {disciplinas.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <input name="title" required placeholder="Título" className={fieldClass} />
                  <input name="date" type="date" className={fieldClass} />
                  <textarea
                    name="content"
                    rows={4}
                    placeholder="Objetivos, conteúdo, instruções…"
                    className={fieldClass}
                  />
                  <SubmitButton type="submit" size="sm">
                    Adicionar ao planejamento
                  </SubmitButton>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
