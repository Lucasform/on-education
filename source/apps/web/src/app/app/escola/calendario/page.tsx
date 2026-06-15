import { SubmitButton } from '@/components/submit-button';
import {
  calculateSchoolDays,
  getSchoolYear,
  listCalendarEvents,
} from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  createCalendarEventAction,
  deleteCalendarEventAction,
  setSchoolYearAction,
} from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Calendário Escolar · Edu On Way' };

const TYPE_LABELS: Record<string, string> = {
  holiday: 'Feriado',
  commemorative: 'Data comemorativa',
  no_school: 'Sem aula',
  school_day: 'Dia letivo especial',
};

const TYPE_COLORS: Record<string, string> = {
  holiday: 'border-l-4 border-l-danger bg-danger/5',
  no_school: 'border-l-4 border-l-warning bg-warning/5',
  commemorative: 'border-l-4 border-l-primary bg-primary/5',
  school_day: 'border-l-4 border-l-success bg-success/5',
};

const TYPE_DOT: Record<string, string> = {
  holiday: 'bg-danger',
  no_school: 'bg-warning',
  commemorative: 'bg-primary',
  school_day: 'bg-success',
};

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  const dow = firstDay.getUTCDay(); // 0=sun
  const days: (number | null)[] = Array.from({ length: dow }, () => null);
  for (let d = 1; d <= lastDay.getUTCDate(); d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; y?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');

  const { m, y } = await searchParams;
  const now = new Date();
  const viewYear = y ? parseInt(y) : now.getFullYear();
  const viewMonth = m ? parseInt(m) - 1 : now.getMonth();

  const client = db();
  const [events, schoolYear] = await Promise.all([
    listCalendarEvents(client, ctx).catch(() => []),
    getSchoolYear(client, ctx).catch(() => ({ schoolYearStart: null, schoolYearEnd: null })),
  ]);

  const nonSchoolSet = new Set(
    events
      .filter((e) => e.type === 'holiday' || e.type === 'no_school')
      .map((e) => e.date),
  );

  const schoolDays =
    schoolYear.schoolYearStart && schoolYear.schoolYearEnd
      ? calculateSchoolDays(schoolYear.schoolYearStart, schoolYear.schoolYearEnd, nonSchoolSet)
      : null;

  const eventsByDate = new Map<string, (typeof events)[number][]>();
  for (const e of events) {
    const arr = eventsByDate.get(e.date) ?? [];
    arr.push(e);
    eventsByDate.set(e.date, arr);
  }

  const grid = buildMonthGrid(viewYear, viewMonth);
  const monthLabel = new Date(Date.UTC(viewYear, viewMonth, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const prevMonth = viewMonth === 0 ? 12 : viewMonth;
  const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
  const nextMonth = viewMonth === 11 ? 1 : viewMonth + 2;
  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  const todayStr = now.toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="Calendário Escolar"
        description="Feriados, datas comemorativas, dias sem aula e contagem de dias letivos."
      />

      {/* Contadores do ano letivo */}
      {schoolDays && (
        <div className="grid grid-cols-3 gap-4">
          <div className={cardClass}>
            <div className="text-2xl font-semibold">{schoolDays.total}</div>
            <div className="text-xs text-muted-foreground">Dias letivos planejados</div>
          </div>
          <div className={cardClass}>
            <div className="text-2xl font-semibold text-success">{schoolDays.passed}</div>
            <div className="text-xs text-muted-foreground">Dias letivos cumpridos</div>
          </div>
          <div className={cardClass}>
            <div className="text-2xl font-semibold text-primary">{schoolDays.remaining}</div>
            <div className="text-xs text-muted-foreground">Dias letivos restantes</div>
          </div>
        </div>
      )}

      {/* Configuração do ano letivo */}
      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Ano letivo</h2>
        <form action={setSchoolYearAction} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Início</label>
            <input
              name="schoolYearStart"
              type="date"
              defaultValue={schoolYear.schoolYearStart ?? ''}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Fim</label>
            <input
              name="schoolYearEnd"
              type="date"
              defaultValue={schoolYear.schoolYearEnd ?? ''}
              className={fieldClass}
            />
          </div>
          <SubmitButton type="submit" size="sm" variant="outline">
            Salvar período
          </SubmitButton>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Dias letivos = dias úteis do período, excluindo finais de semana e eventos marcados como
          feriado ou sem aula.
        </p>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(TYPE_LABELS).map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${TYPE_DOT[k]}`} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          Final de semana
        </span>
      </div>

      {/* Calendário mensal */}
      <div className={cardClass}>
        <div className="mb-4 flex items-center justify-between">
          <a
            href={`?m=${prevMonth}&y=${prevYear}`}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            ‹
          </a>
          <span className="text-sm font-medium capitalize">{monthLabel}</span>
          <a
            href={`?m=${nextMonth}&y=${nextYear}`}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            ›
          </a>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {grid.map((day, i) => {
            if (day === null)
              return <div key={`e-${i}`} className="min-h-[56px] rounded-md" />;

            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isWeekend = i % 7 === 0 || i % 7 === 6;
            const isToday = dateStr === todayStr;
            const dayEvents = eventsByDate.get(dateStr) ?? [];
            const firstEvent = dayEvents[0];

            let cellClass = 'min-h-[56px] rounded-md border p-1 text-xs transition-colors';
            if (isToday) cellClass += ' border-primary/60 ring-1 ring-primary/30';
            else if (firstEvent) cellClass += ` ${TYPE_COLORS[firstEvent.type] ?? ''}`;
            else if (isWeekend) cellClass += ' border-border/30 bg-muted/30 text-muted-foreground';
            else cellClass += ' border-border/50';

            return (
              <div key={dateStr} className={cellClass}>
                <div className={`font-medium ${isToday ? 'text-primary' : ''}`}>{day}</div>
                {dayEvents.map((e) => (
                  <div
                    key={e.id}
                    className="mt-0.5 truncate rounded-sm px-0.5 py-px text-[10px] leading-tight"
                    title={e.name}
                  >
                    {e.name}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista de eventos */}
      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Eventos cadastrados ({events.length})</h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento ainda.</p>
        ) : (
          <ul className="divide-y divide-border/50 text-sm">
            {events.map((e) => (
              <li
                key={e.id}
                className={`flex items-center justify-between gap-3 py-2 pl-2 ${TYPE_COLORS[e.type] ?? ''}`}
              >
                <span>
                  <span className="font-medium">{e.date.split('-').reverse().join('/')}</span>
                  <span className="ml-2 text-muted-foreground">{e.name}</span>
                  <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                    {TYPE_LABELS[e.type] ?? e.type}
                  </span>
                  {e.recurring && (
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">anual</span>
                  )}
                </span>
                <form action={deleteCalendarEventAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <ConfirmButton size="sm" variant="ghost" message={`Remover "${e.name}"?`}>
                    Remover
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Formulário de novo evento */}
      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Adicionar evento</h2>
        <form action={createCalendarEventAction} className="grid gap-2 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Data</label>
            <input type="date" name="date" required className={fieldClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted-foreground">Nome</label>
            <input name="name" required placeholder="Ex.: Natal, Dia do Professor" className={fieldClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Tipo</label>
            <select name="type" defaultValue="holiday" className={fieldClass}>
              {Object.entries(TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 sm:col-span-4">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" name="recurring" />
              Repetir anualmente (ex.: feriados nacionais)
            </label>
          </div>
          <div className="sm:col-span-4">
            <SubmitButton type="submit" size="sm">
              Adicionar evento
            </SubmitButton>
          </div>
        </form>
      </div>
    </>
  );
}
