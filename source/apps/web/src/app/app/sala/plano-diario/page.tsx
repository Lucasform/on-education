import { SubmitButton } from '@/components/submit-button';
import { isAiConfigured } from '@on-education/module-ia';
import { listClasses, listSubjects } from '@on-education/module-nucleo';
import {
  listLessonPlans,
  listUpcomingLessons,
} from '@on-education/module-sala-de-aula';
import { BookOpen, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import { hojeISO } from '@/lib/date';

import {
  generateLessonPlanAction,
  linkLessonToPlanAction,
} from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Plano de aulas · Edu On Way' };

/** Formata 'YYYY-MM-DD' como 'Seg, 13/06'. */
function rotuloDia(iso: string) {
  const [a = 0, m = 1, d = 1] = iso.split('-').map(Number);
  const dt = new Date(a, m - 1, d);
  const sem = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dt.getDay()] ?? '';
  return `${sem}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

/** Adiciona `days` dias a uma data ISO. */
function addDays(iso: string, days: number): string {
  const [a = 0, m = 1, d = 1] = iso.split('-').map(Number);
  const dt = new Date(a, m - 1, d + days);
  return dt.toISOString().slice(0, 10);
}

export default async function PlanoDiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; open?: string }>;
}) {
  const { classId, open } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const hoje = hojeISO();
  const fim = addDays(hoje, 13); // próximos 14 dias

  const [turmas, disciplinas] = await Promise.all([
    listClasses(client, ctx),
    ctx.tenantType === 'organization' ? listSubjects(client, ctx) : Promise.resolve([]),
  ]);
  const turmaId = classId || turmas[0]?.id || '';

  type AulaItem = Awaited<ReturnType<typeof listUpcomingLessons>>[number];
  type PlanoItem = Awaited<ReturnType<typeof listLessonPlans>>[number];
  const [aulas, planos]: [AulaItem[], PlanoItem[]] = turmaId
    ? await Promise.all([
        listUpcomingLessons(client, ctx, { classId: turmaId, from: hoje, to: fim }),
        listLessonPlans(client, ctx, turmaId),
      ])
    : [[], []];

  // Agrupa as aulas por data
  const porData = new Map<string, typeof aulas>();
  for (const a of aulas) {
    const arr = porData.get(a.date) ?? [];
    arr.push(a);
    porData.set(a.date, arr);
  }
  const datasOrdenadas = [...porData.keys()].sort();

  const comPlano = aulas.filter((a) => a.lessonPlanId).length;
  const semPlano = aulas.filter((a) => !a.lessonPlanId && a.status !== 'cancelada').length;
  const aiOn = isAiConfigured();

  return (
    <>
      <PageHeader
        title="Plano de aulas"
        description="Próximas aulas previstas pelo motor de horários. Vincule ou gere um plano de aula para cada uma."
      />

      {turmas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Crie uma turma e gere as aulas previstas em{' '}
          <Link href="/app/cronograma" className="text-primary underline-offset-4 hover:underline">
            Cronograma
          </Link>{' '}
          antes de planejar.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <form method="get" className="flex flex-wrap items-end gap-3">
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
                Ver
              </SubmitButton>
            </form>
            <p className="text-sm text-muted-foreground">
              {aulas.length === 0
                ? 'Nenhuma aula prevista nos próximos 14 dias.'
                : `${aulas.length} aula(s) · ${comPlano} com plano · ${semPlano} sem plano`}
            </p>
          </div>

          {aulas.length === 0 && (
            <div className={cardClass}>
              <p className="text-sm text-muted-foreground">
                Gere as aulas previstas desta turma em{' '}
                <Link
                  href={`/app/cronograma?classId=${turmaId}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Cronograma
                </Link>{' '}
                para poder planejar aqui.
              </p>
            </div>
          )}

          {datasOrdenadas.map((data) => {
            const aulasDodia = porData.get(data) ?? [];
            return (
              <section key={data} className="flex flex-col gap-2">
                <h2 className="text-sm font-medium text-muted-foreground">{rotuloDia(data)}</h2>
                <div className="flex flex-col gap-2">
                  {aulasDodia.map((aula) => {
                    const isOpen = open === aula.id;
                    return (
                      <div key={aula.id} className={`${cardClass} flex flex-col gap-3`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">
                              {aula.subjectName ?? 'Sem matéria'}
                              {aula.topic ? (
                                <span className="ml-2 font-normal text-muted-foreground">
                                  {aula.topic}
                                </span>
                              ) : null}
                            </p>
                            {aula.planTitle ? (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-success">
                                <BookOpen className="h-3 w-3" />
                                {aula.planTitle}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-xs text-muted-foreground/70">
                                Sem plano de aula
                              </p>
                            )}
                          </div>
                          <Link
                            href={`/app/sala/plano-diario?classId=${turmaId}&open=${isOpen ? '' : aula.id}`}
                            className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                          >
                            {isOpen ? 'Fechar' : 'Planejar'}
                          </Link>
                        </div>

                        {isOpen && (
                          <div className="border-t border-border pt-3">
                            {/* Vincular plano existente */}
                            {planos.length > 0 && (
                              <details className="mb-3">
                                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                                  Vincular plano existente do banco
                                </summary>
                                <form
                                  action={linkLessonToPlanAction}
                                  className="mt-2 flex gap-2"
                                >
                                  <input type="hidden" name="lessonId" value={aula.id} />
                                  <select
                                    name="planId"
                                    defaultValue={aula.lessonPlanId ?? ''}
                                    className={`${fieldClass} flex-1`}
                                  >
                                    <option value="">— Nenhum —</option>
                                    {planos.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.title}
                                      </option>
                                    ))}
                                  </select>
                                  <SubmitButton type="submit" size="sm" variant="outline">
                                    Salvar
                                  </SubmitButton>
                                </form>
                              </details>
                            )}

                            {/* Gerar plano com WayOn */}
                            {aiOn ? (
                              <div>
                                <p className="mb-2 flex items-center gap-1 text-xs font-medium">
                                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                                  Gerar plano com o WayOn
                                </p>
                                <form
                                  action={generateLessonPlanAction}
                                  className="flex flex-col gap-2"
                                >
                                  <input type="hidden" name="classId" value={turmaId} />
                                  <input type="hidden" name="lessonId" value={aula.id} />
                                  {aula.subjectId && (
                                    <input
                                      type="hidden"
                                      name="subjectId"
                                      value={aula.subjectId}
                                    />
                                  )}
                                  <input type="hidden" name="kind" value="aula" />
                                  <input
                                    name="topic"
                                    required
                                    defaultValue={aula.topic ?? ''}
                                    placeholder="Tema da aula"
                                    className={fieldClass}
                                  />
                                  <div className="flex gap-2">
                                    <select
                                      name="gradeLevel"
                                      className={`${fieldClass} flex-1`}
                                      defaultValue=""
                                    >
                                      <option value="">Série (opcional)</option>
                                      {disciplinas.length === 0
                                        ? null
                                        : [
                                            '1º ano EF',
                                            '2º ano EF',
                                            '3º ano EF',
                                            '4º ano EF',
                                            '5º ano EF',
                                            '6º ano EF',
                                            '7º ano EF',
                                            '8º ano EF',
                                            '9º ano EF',
                                            '1º ano EM',
                                            '2º ano EM',
                                            '3º ano EM',
                                          ].map((s) => (
                                            <option key={s} value={s}>
                                              {s}
                                            </option>
                                          ))}
                                    </select>
                                    <input
                                      name="durationMin"
                                      type="number"
                                      min={30}
                                      max={300}
                                      placeholder="min"
                                      className={`${fieldClass} w-20`}
                                    />
                                  </div>
                                  <SubmitButton type="submit" size="sm">
                                    Gerar plano
                                  </SubmitButton>
                                </form>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                WayOn indisponível. Configure{' '}
                                <code>ANTHROPIC_API_KEY</code> para gerar planos.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <div className="flex gap-3 text-xs text-muted-foreground">
            <Link
              href="/app/sala/planejamento"
              className="text-primary underline-offset-4 hover:underline"
            >
              Ver todos os planos →
            </Link>
            <Link
              href="/app/sala/diario"
              className="text-primary underline-offset-4 hover:underline"
            >
              Ir para o diário →
            </Link>
          </div>
        </>
      )}
    </>
  );
}
