import { SubmitButton } from '@/components/submit-button';
import { listClasses } from '@on-education/module-nucleo';
import { listLessonPlans, listLessonsForDiary } from '@on-education/module-sala-de-aula';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { hojeISO, inicioPeriodo, type Periodo } from '@/lib/date';

import { createLessonAction, markLessonAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Diário de classe · Edu On Way' };

const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function rotuloDia(date: string, hoje: string): string {
  const [a = 0, m = 1, d = 1] = date.split('-').map(Number);
  const wd = SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()] ?? '';
  const br = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  if (date === hoje) return `Hoje · ${br}`;
  return `${wd} · ${br}`;
}

export default async function DiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: Periodo }>;
}) {
  const { periodo = 'mes' } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const hoje = hojeISO();
  const [todas, turmas, planos] = await Promise.all([
    listLessonsForDiary(client, ctx).catch(() => []),
    listClasses(client, ctx).catch(() => []),
    listLessonPlans(client, ctx).catch(() => []),
  ]);
  const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));
  const planoTitulo = new Map(planos.map((p) => [p.id, p.title]));

  // Janela: hoje e passado (o futuro previsto ainda não precisa de marcação), com corte do período.
  const desde = inicioPeriodo(periodo);
  const aulas = todas.filter((a) => a.date <= hoje && (!desde || a.date >= desde));
  const pendentes = aulas.filter((a) => a.status === 'prevista').length;

  // Agrupa por data (já vem ordenado por data desc).
  const porDia = new Map<string, typeof aulas>();
  for (const a of aulas) {
    const arr = porDia.get(a.date) ?? [];
    arr.push(a);
    porDia.set(a.date, arr);
  }

  const periodoLabel: Record<Periodo, string> = {
    semana: 'Última semana',
    mes: 'Último mês',
    tudo: 'Tudo',
  };

  return (
    <>
      <PageHeader
        title="Diário de classe"
        description="As aulas vêm do cronograma. Tudo conta como dada; você só marca o que fugiu do previsto (aula não dada) e, se quiser, anota o tema."
      />

      <div className="flex flex-wrap items-center gap-3">
        <form method="get" className={`${cardClass} flex flex-1 flex-wrap items-end gap-3`}>
          <label className="flex flex-col gap-1 text-sm">
            Período
            <select name="periodo" defaultValue={periodo} className={fieldClass}>
              <option value="semana">Última semana</option>
              <option value="mes">Último mês</option>
              <option value="tudo">Tudo</option>
            </select>
          </label>
          <SubmitButton type="submit" size="sm" variant="outline">
            Aplicar
          </SubmitButton>
          <span className="text-xs text-muted-foreground">
            {periodoLabel[periodo]}
            {pendentes > 0 ? ` · ${pendentes} prevista(s)` : ''}
          </span>
        </form>
      </div>

      {aulas.length === 0 ? (
        <div className={cardClass}>
          <p className="text-sm text-muted-foreground">
            Nenhuma aula no período. Gere o diário automático a partir da grade em{' '}
            <Link href="/app/cronograma" className="text-primary hover:underline">
              Cronograma › Gerar aulas do período
            </Link>{' '}
            ou registre uma aula manualmente abaixo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...porDia.entries()].map(([data, doDia]) => (
            <section key={data} className={cardClass}>
              <h2 className="mb-3 text-sm font-semibold capitalize">{rotuloDia(data, hoje)}</h2>
              <ul className="space-y-2">
                {doDia.map((a) => (
                  <li key={a.id} className="rounded-md border border-border p-2.5">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {a.subjectName ?? 'Aula'}
                        <span className="font-normal text-muted-foreground">
                          {' '}
                          · {turmaNome.get(a.classId) ?? 'Turma'}
                        </span>
                      </span>
                      {a.status === 'cancelada' ? (
                        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">
                          não houve aula
                        </span>
                      ) : a.status === 'dada' ? (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                          ✓ dada
                        </span>
                      ) : (
                        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                          prevista (conta como dada)
                        </span>
                      )}
                      {a.lessonPlanId && planoTitulo.get(a.lessonPlanId) && (
                        <span className="text-[11px] text-primary">
                          plano: {planoTitulo.get(a.lessonPlanId)}
                        </span>
                      )}
                    </div>

                    {a.status === 'cancelada' ? (
                      <form
                        action={markLessonAction}
                        className="flex flex-wrap items-center gap-2 text-xs"
                      >
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="status" value="prevista" />
                        <span className="text-muted-foreground">
                          Motivo: {a.cancelReason || 'não informado'}
                        </span>
                        <SubmitButton type="submit" size="sm" variant="ghost" className="h-7 text-xs">
                          Reabrir
                        </SubmitButton>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        {/* Marcar dada + tema (também serve para editar o tema de uma aula já dada). */}
                        <form action={markLessonAction} className="flex flex-1 items-end gap-2">
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="dada" />
                          <input
                            name="topic"
                            defaultValue={a.topic}
                            placeholder="Conteúdo / tema da aula (opcional)"
                            className={`${fieldClass} h-8 text-sm`}
                          />
                          <SubmitButton type="submit" size="sm" className="h-8 text-xs">
                            Salvar tema
                          </SubmitButton>
                        </form>
                        {/* Exceção: não houve aula. */}
                        <form
                          action={markLessonAction}
                          className="flex items-end gap-1.5"
                        >
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="cancelada" />
                          <input
                            name="cancelReason"
                            placeholder="motivo"
                            className={`${fieldClass} h-8 w-28 text-sm`}
                          />
                          <SubmitButton
                            type="submit"
                            size="sm"
                            variant="ghost"
                            className="h-8 whitespace-nowrap text-xs text-danger"
                          >
                            Não houve aula
                          </SubmitButton>
                        </form>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Registrar aula avulsa</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Para uma aula fora da grade (reposição, atividade extra). O diário normal já vem do
          cronograma.
        </p>
        <form action={createLessonAction} className="flex flex-col gap-2 sm:max-w-md">
          <select name="classId" required className={fieldClass} defaultValue="">
            <option value="" disabled>
              Selecione a turma
            </option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input name="date" type="date" required defaultValue={hoje} className={fieldClass} />
          <input name="topic" required placeholder="Conteúdo / tema da aula" className={fieldClass} />
          {planos.length > 0 && (
            <select name="lessonPlanId" className={fieldClass} defaultValue="">
              <option value="">Vincular a um plano (opcional)</option>
              {planos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.subjectName ? ` · ${p.subjectName}` : ''}
                </option>
              ))}
            </select>
          )}
          <textarea name="notes" placeholder="Observações (opcional)" rows={2} className={fieldClass} />
          <SubmitButton type="submit" size="sm">
            Registrar aula avulsa
          </SubmitButton>
        </form>
        {turmas.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">Crie uma turma antes de registrar aulas.</p>
        )}
      </div>
    </>
  );
}
