import { SubmitButton } from '@/components/submit-button';
import { isAiConfigured } from '@on-education/module-ia';
import { listClasses, listSubjects } from '@on-education/module-nucleo';
import { listCurriculumUnits, listLessonsForDiary } from '@on-education/module-sala-de-aula';
import { ArrowDown, ArrowUp, Sparkles, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AgentNameText } from '@/components/agent-name-provider';
import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { hojeISO } from '@/lib/date';

import {
  createCurriculumUnitAction,
  deleteCurriculumUnitAction,
  distributeCurriculumAction,
  generateCurriculumAction,
  moveCurriculumUnitAction,
  updateCurriculumUnitAction,
} from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Plano de curso · Edu On Way' };

export default async function PlanoCursoPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; subjectId?: string; dist?: string }>;
}) {
  const { classId, subjectId, dist } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const isSchool = ctx.tenantType === 'organization';
  const hoje = hojeISO();

  const turmas = await listClasses(client, ctx);
  const turmaId = classId || turmas[0]?.id || '';
  const disciplinas = isSchool ? await listSubjects(client, ctx) : [];
  // Numa escola, o plano de curso é por matéria; escolhe a primeira por padrão.
  const matId = isSchool ? subjectId || disciplinas[0]?.id || '' : '';
  const matNome = disciplinas.find((s) => s.id === matId)?.name ?? '';

  const [unidades, aulas] = await Promise.all([
    turmaId ? listCurriculumUnits(client, ctx, turmaId, matId || null) : Promise.resolve([]),
    turmaId ? listLessonsForDiary(client, ctx, { classId: turmaId }) : Promise.resolve([]),
  ]);

  const planejado = unidades.reduce((s, u) => s + u.lessonsPlanned, 0);
  const previstasFuturas = aulas.filter(
    (a) => a.status === 'prevista' && a.date >= hoje && (matId ? a.subjectId === matId : true),
  ).length;

  const distParts = dist ? dist.split('.') : null;
  const distMsg = distParts
    ? `${distParts[0]} aula(s) preenchida(s) com as unidades.${
        Number(distParts[1]) > 0 ? ` ${distParts[1]} aula(s) ficaram sem unidade (amplie a ementa).` : ''
      }`
    : null;

  return (
    <>
      <PageHeader
        title="Plano de curso"
        description="A sequência didática da matéria: as unidades do ano, em ordem, com quantas aulas cada uma ocupa. Distribua nas aulas previstas e o diário já vem com o tema preenchido."
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
            {isSchool && disciplinas.length > 0 && (
              <label className="flex flex-col gap-1 text-sm">
                Matéria
                <select name="subjectId" defaultValue={matId} className={fieldClass}>
                  {disciplinas.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <SubmitButton type="submit" size="sm" variant="outline">
              Ver
            </SubmitButton>
          </form>

          {/* Resumo: planejado x previstas + distribuir */}
          <section className={cardClass}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm">
                  <span className="font-semibold">{unidades.length}</span> unidade(s)
                  {matNome ? ` · ${matNome}` : ''} ·{' '}
                  <span className="font-semibold">{planejado}</span> aula(s) planejada(s)
                  <span className="text-muted-foreground">
                    {' '}
                    vs {previstasFuturas} prevista(s) à frente
                  </span>
                </p>
                {planejado > 0 && previstasFuturas > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {planejado > previstasFuturas
                      ? `A ementa tem mais aulas do que o previsto (${planejado - previstasFuturas} a mais).`
                      : planejado < previstasFuturas
                        ? `Sobram ${previstasFuturas - planejado} aulas previstas sem unidade.`
                        : 'Ementa e aulas previstas batem certinho.'}
                  </p>
                )}
              </div>
              {unidades.length > 0 && (
                <form action={distributeCurriculumAction}>
                  <input type="hidden" name="classId" value={turmaId} />
                  {matId && <input type="hidden" name="subjectId" value={matId} />}
                  <SubmitButton type="submit" size="sm">
                    Distribuir nas aulas
                  </SubmitButton>
                </form>
              )}
            </div>
            {distMsg && (
              <p className="mt-3 rounded-md border border-success/30 bg-success/10 p-2 text-xs text-success">
                {distMsg}{' '}
                <Link href="/app/sala/diario" className="font-medium underline-offset-4 hover:underline">
                  Abrir o diário →
                </Link>
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Distribuir preenche o tema das aulas previstas futuras na ordem das unidades, sem
              sobrescrever o que o professor já escreveu. Gere as aulas antes em{' '}
              <Link href="/app/cronograma" className="text-primary hover:underline">
                Cronograma
              </Link>
              .
            </p>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Lista de unidades */}
            <section className={cardClass}>
              <h2 className="mb-3 text-sm font-medium">Sequência ({unidades.length})</h2>
              {unidades.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma unidade ainda. Gere com o <AgentNameText /> ou adicione manualmente.
                </p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {unidades.map((u, i) => (
                    <li key={u.id} className="rounded-md border border-border p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium">
                          {i + 1}. {u.title}
                          <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                            {u.lessonsPlanned} aula(s)
                          </span>
                        </span>
                        <div className="flex shrink-0 items-center gap-0.5">
                          {i > 0 && (
                            <form action={moveCurriculumUnitAction}>
                              <input type="hidden" name="id" value={u.id} />
                              <input type="hidden" name="dir" value="up" />
                              <input type="hidden" name="classId" value={turmaId} />
                              {matId && <input type="hidden" name="subjectId" value={matId} />}
                              <SubmitButton
                                type="submit"
                                size="sm"
                                variant="ghost"
                                aria-label="Subir"
                                className="h-6 px-1"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </SubmitButton>
                            </form>
                          )}
                          {i < unidades.length - 1 && (
                            <form action={moveCurriculumUnitAction}>
                              <input type="hidden" name="id" value={u.id} />
                              <input type="hidden" name="dir" value="down" />
                              <input type="hidden" name="classId" value={turmaId} />
                              {matId && <input type="hidden" name="subjectId" value={matId} />}
                              <SubmitButton
                                type="submit"
                                size="sm"
                                variant="ghost"
                                aria-label="Descer"
                                className="h-6 px-1"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </SubmitButton>
                            </form>
                          )}
                          <form action={deleteCurriculumUnitAction}>
                            <input type="hidden" name="id" value={u.id} />
                            <input type="hidden" name="classId" value={turmaId} />
                            {matId && <input type="hidden" name="subjectId" value={matId} />}
                            <ConfirmButton
                              size="sm"
                              variant="ghost"
                              aria-label="Remover unidade"
                              message={`Remover a unidade "${u.title}"?`}
                              className="h-6 px-1.5 text-xs"
                            >
                              ✕
                            </ConfirmButton>
                          </form>
                        </div>
                      </div>
                      {u.content && (
                        <p className="mt-1 text-xs text-muted-foreground">{u.content}</p>
                      )}
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-primary">Editar</summary>
                        <form
                          action={updateCurriculumUnitAction}
                          className="mt-2 flex flex-col gap-2"
                        >
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="classId" value={turmaId} />
                          {matId && <input type="hidden" name="subjectId" value={matId} />}
                          <input
                            name="title"
                            defaultValue={u.title}
                            className={fieldClass}
                            placeholder="Título da unidade"
                          />
                          <input
                            name="lessonsPlanned"
                            type="number"
                            min={1}
                            max={200}
                            defaultValue={u.lessonsPlanned}
                            className={`${fieldClass} w-28`}
                            placeholder="aulas"
                          />
                          <textarea
                            name="content"
                            rows={2}
                            defaultValue={u.content ?? ''}
                            className={fieldClass}
                            placeholder="Objetivos / conteúdo"
                          />
                          <SubmitButton type="submit" size="sm" variant="outline">
                            Salvar
                          </SubmitButton>
                        </form>
                      </details>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <div className="flex flex-col gap-5">
              {/* Gerar ementa com IA */}
              <section className={cardClass}>
                <h2 className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Gerar ementa com o <AgentNameText />
                </h2>
                <p className="mb-2 text-xs text-muted-foreground">
                  O <AgentNameText /> propõe as unidades do ano em ordem, com a quantidade de aulas de cada uma.
                  Você revê e ajusta. As unidades entram no fim da sequência.
                </p>
                {isAiConfigured() ? (
                  <form action={generateCurriculumAction} className="flex flex-col gap-2">
                    <input type="hidden" name="classId" value={turmaId} />
                    {matId && <input type="hidden" name="subjectId" value={matId} />}
                    <input
                      name="subject"
                      required
                      defaultValue={matNome}
                      placeholder="Matéria (ex.: Matemática)"
                      className={fieldClass}
                    />
                    <div className="flex gap-2">
                      <input
                        name="gradeLevel"
                        placeholder="Série/ano (ex.: 5º ano)"
                        className={fieldClass}
                      />
                      <input
                        name="totalLessons"
                        type="number"
                        min={1}
                        max={400}
                        placeholder="aulas no ano"
                        className={`${fieldClass} w-32`}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" name="useBncc" className="h-4 w-4" />
                      Sugerir habilidades da BNCC (para você confirmar)
                    </label>
                    <textarea
                      name="notes"
                      rows={2}
                      placeholder="Observações (opcional): foco em revisão, projeto interdisciplinar…"
                      className={fieldClass}
                    />
                    <SubmitButton type="submit" size="sm">
                      Gerar ementa
                    </SubmitButton>
                  </form>
                ) : (
                  <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                    <AgentNameText /> indisponível. Configure <code>ANTHROPIC_API_KEY</code> para gerar a ementa.
                  </p>
                )}
              </section>

              {/* Adicionar unidade manual */}
              <section className={cardClass}>
                <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium">
                  <Wand2 className="h-4 w-4 text-muted-foreground" />
                  Nova unidade (manual)
                </h2>
                <form action={createCurriculumUnitAction} className="flex flex-col gap-2">
                  <input type="hidden" name="classId" value={turmaId} />
                  {matId && <input type="hidden" name="subjectId" value={matId} />}
                  <input
                    name="title"
                    required
                    placeholder="Título (ex.: Unidade 1 — Frações)"
                    className={fieldClass}
                  />
                  <input
                    name="lessonsPlanned"
                    type="number"
                    min={1}
                    max={200}
                    defaultValue={4}
                    className={`${fieldClass} w-28`}
                    placeholder="aulas"
                  />
                  <textarea
                    name="content"
                    rows={2}
                    placeholder="Objetivos / conteúdo (opcional)"
                    className={fieldClass}
                  />
                  <SubmitButton type="submit" size="sm">
                    Adicionar unidade
                  </SubmitButton>
                </form>
              </section>
            </div>
          </div>
        </>
      )}
    </>
  );
}
