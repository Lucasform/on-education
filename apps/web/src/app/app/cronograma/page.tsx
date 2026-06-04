import { SubmitButton } from '@/components/submit-button';
import { listClasses, listSubjects } from '@on-education/module-nucleo';
import { listScheduleExceptions, listScheduleSlots } from '@on-education/module-sala-de-aula';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { PrintButton } from '@/components/print-button';
import { hojeISO } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  createScheduleExceptionAction,
  createScheduleSlotAction,
  deleteScheduleExceptionAction,
  deleteScheduleSlotAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cronograma · On Way Education' };

const DIAS = [
  { n: 1, label: 'Segunda' },
  { n: 2, label: 'Terça' },
  { n: 3, label: 'Quarta' },
  { n: 4, label: 'Quinta' },
  { n: 5, label: 'Sexta' },
  { n: 6, label: 'Sábado' },
  { n: 7, label: 'Domingo' },
];

export default async function CronogramaPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const isSchool = ctx.tenantType === 'organization';

  const turmas = await listClasses(client, ctx);
  const turmaId = classId || turmas[0]?.id || '';
  const [slots, disciplinas, excecoes] = await Promise.all([
    turmaId ? listScheduleSlots(client, ctx, turmaId) : Promise.resolve([]),
    isSchool ? listSubjects(client, ctx) : Promise.resolve([]),
    turmaId ? listScheduleExceptions(client, ctx, turmaId) : Promise.resolve([]),
  ]);

  // Só dias úteis por padrão; mostra sábado/domingo se houver slot neles.
  const usaFimDeSemana = slots.some((s) => s.weekday > 5);
  const dias = DIAS.filter((d) => d.n <= 5 || usaFimDeSemana);
  const turmaNome = turmas.find((t) => t.id === turmaId)?.name ?? '';

  return (
    <>
      <div className="flex items-start justify-between gap-3 print:hidden">
        <PageHeader
          title="Cronograma"
          description="Horário semanal da turma. Imprima ou salve em PDF para distribuir."
        />
        {turmaId && <PrintButton />}
      </div>

      <form method="get" className={`${cardClass} flex flex-wrap items-end gap-3 print:hidden`}>
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

      {turmas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Crie uma turma primeiro.</p>
      ) : (
        <>
          <article className="rounded-lg border border-border bg-card p-5 print:border-0 print:p-0">
            <h2 className="mb-3 text-base font-semibold">Horário · {turmaNome}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dias.map((d) => {
                const doDia = slots.filter((s) => s.weekday === d.n);
                return (
                  <div key={d.n} className="rounded-md border border-border/60 p-3">
                    <h3 className="mb-2 text-sm font-medium">{d.label}</h3>
                    {doDia.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sem aulas.</p>
                    ) : (
                      <ul className="space-y-1.5 text-sm">
                        {doDia.map((s) => (
                          <li key={s.id} className="flex items-start justify-between gap-2">
                            <span>
                              <span className="font-medium">
                                {s.startTime}
                                {s.endTime ? `–${s.endTime}` : ''}
                              </span>{' '}
                              <span className="text-muted-foreground">
                                {s.subjectName ?? 'Aula'}
                                {s.note ? ` · ${s.note}` : ''}
                              </span>
                            </span>
                            <form action={deleteScheduleSlotAction} className="print:hidden">
                              <input type="hidden" name="id" value={s.id} />
                              <ConfirmButton
                                size="sm"
                                variant="ghost"
                                message="Remover este horário?"
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
                );
              })}
            </div>
          </article>

          <div className={`${cardClass} print:hidden`}>
            <h2 className="mb-3 text-sm font-medium">Adicionar horário</h2>
            <form action={createScheduleSlotAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="classId" value={turmaId} />
              <label className="flex flex-col gap-1 text-sm">
                Dia
                <select name="weekday" className={fieldClass} defaultValue="1">
                  {DIAS.map((d) => (
                    <option key={d.n} value={d.n}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Início
                <input name="startTime" type="time" required className={fieldClass} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Fim
                <input name="endTime" type="time" className={fieldClass} />
              </label>
              {isSchool && (
                <label className="flex flex-col gap-1 text-sm">
                  Matéria
                  <select name="subjectId" className={fieldClass} defaultValue="">
                    <option value="">—</option>
                    {disciplinas.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1 text-sm">
                Observação
                <input name="note" placeholder="ex.: sala 3" className={fieldClass} />
              </label>
              <SubmitButton type="submit" size="sm">
                Adicionar
              </SubmitButton>
            </form>
          </div>

          <div className={cardClass}>
            <h2 className="mb-1 text-sm font-medium">Alterações pontuais ({excecoes.length})</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Exceções numa data específica (feriado, prova, reposição) sem mexer na grade fixa.
            </p>
            {excecoes.length > 0 && (
              <ul className="mb-3 space-y-1.5 text-sm">
                {excecoes.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="font-medium">{e.date.split('-').reverse().join('/')}</span>
                      <span className="text-muted-foreground"> · {e.note}</span>
                    </span>
                    <form action={deleteScheduleExceptionAction} className="print:hidden">
                      <input type="hidden" name="id" value={e.id} />
                      <ConfirmButton
                        size="sm"
                        variant="ghost"
                        message="Remover esta alteração?"
                        className="h-6 px-1.5 text-xs"
                      >
                        ✕
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form
              action={createScheduleExceptionAction}
              className="flex flex-wrap items-end gap-2 print:hidden"
            >
              <input type="hidden" name="classId" value={turmaId} />
              <label className="flex flex-col gap-1 text-sm">
                Data
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={hojeISO()}
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm">
                O que muda
                <input
                  name="note"
                  required
                  placeholder="ex.: sem aula (feriado), prova de matemática"
                  className={fieldClass}
                />
              </label>
              <SubmitButton type="submit" size="sm" variant="outline">
                Registrar alteração
              </SubmitButton>
            </form>
          </div>
        </>
      )}
    </>
  );
}
