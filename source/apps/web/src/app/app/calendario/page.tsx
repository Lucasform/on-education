import {
  calculateSchoolDays,
  getSchoolYear,
  listCalendarEvents,
  listClasses,
  listEvents,
} from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { CalendarAiUpload } from '../escola/calendario/CalendarAiUpload';
import { setSchoolYearAction } from '../escola/calendario/actions';
import { CalendarView, type UnifiedEvent } from './CalendarView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Calendário · Edu On Way' };

const pad = (n: number) => String(n).padStart(2, '0');

const LABEL_COLORS: Record<string, string> = {
  feriado: 'bg-red-500',
  recesso: 'bg-orange-400',
  commemorative: 'bg-blue-500',
  school_day: 'bg-green-500',
  evento: 'bg-primary',
};
const KIND_LABEL: Record<string, string> = {
  feriado: 'Feriado',
  recesso: 'Sem aula',
  commemorative: 'Data comemorativa',
  school_day: 'Dia letivo esp.',
  evento: 'Evento',
};

export default async function CalendarioPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  // Feriados, dias letivos e importação por PDF disponíveis para TODOS (escola e professor).
  const [eventosBase, calEvents, turmas, schoolYear] = await Promise.all([
    listEvents(client, ctx).catch(() => []),
    listCalendarEvents(client, ctx).catch(() => []),
    listClasses(client, ctx).catch(() => []),
    getSchoolYear(client, ctx).catch(() => ({ schoolYearStart: null, schoolYearEnd: null })),
  ]);

  const eventsNorm: UnifiedEvent[] = eventosBase.map((e) => ({
    id: e.id,
    date: e.date,
    title: e.title,
    kind: e.kind,
    time: e.time,
    classId: e.classId,
    source: 'event' as const,
  }));

  const TYPE_MAP: Record<string, string> = {
    holiday: 'feriado',
    no_school: 'recesso',
    commemorative: 'commemorative',
    school_day: 'school_day',
  };
  const calNorm: UnifiedEvent[] = calEvents.map((e) => ({
    id: e.id,
    date: e.date,
    title: e.name,
    kind: TYPE_MAP[e.type] ?? 'evento',
    time: null,
    classId: null,
    source: 'calendar' as const,
  }));

  const seen = new Set(eventsNorm.map((e) => `${e.date}|${e.title}`));
  const eventos = [...eventsNorm, ...calNorm.filter((e) => !seen.has(`${e.date}|${e.title}`))].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''),
  );

  const nonSchoolSet = new Set(
    eventos.filter((e) => e.kind === 'feriado' || e.kind === 'recesso').map((e) => e.date),
  );
  const schoolDays =
    schoolYear.schoolYearStart && schoolYear.schoolYearEnd
      ? calculateSchoolDays(schoolYear.schoolYearStart, schoolYear.schoolYearEnd, nonSchoolSet)
      : null;

  const hoje = new Date();
  const today = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;

  return (
    <>
      <PageHeader title="Calendário" description="Eventos, feriados e dias letivos." />

      {/* Contadores do ano letivo */}
      {schoolDays && (
        <div className="grid grid-cols-3 gap-4">
          <div className={cardClass}>
            <div className="text-2xl font-semibold">{schoolDays.total}</div>
            <div className="text-xs text-muted-foreground">Dias letivos planejados</div>
          </div>
          <div className={cardClass}>
            <div className="text-2xl font-semibold text-success">{schoolDays.passed}</div>
            <div className="text-xs text-muted-foreground">Cumpridos até hoje</div>
          </div>
          <div className={cardClass}>
            <div className="text-2xl font-semibold text-primary">{schoolDays.remaining}</div>
            <div className="text-xs text-muted-foreground">Restantes</div>
          </div>
        </div>
      )}

      {/* Configuração do ano letivo */}
      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Ano letivo</h2>
        <form action={setSchoolYearAction} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Início</label>
            <input name="schoolYearStart" type="date" defaultValue={schoolYear.schoolYearStart ?? ''} className={fieldClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Fim</label>
            <input name="schoolYearEnd" type="date" defaultValue={schoolYear.schoolYearEnd ?? ''} className={fieldClass} />
          </div>
          <SubmitButton type="submit" size="sm" variant="outline">Salvar</SubmitButton>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Dias letivos = dias úteis do período excluindo fins de semana, feriados e dias sem aula.
        </p>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(KIND_LABEL).map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${LABEL_COLORS[k]}`} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          Final de semana
        </span>
      </div>

      {/* Calendário interativo (client): clique instantâneo, navegação por mês/ano */}
      <CalendarView events={eventos} turmas={turmas.map((t) => ({ id: t.id, name: t.name }))} today={today} />

      {/* Importar com IA */}
      <div className={cardClass}>
        <h2 className="mb-2 text-sm font-medium">Importar com IA</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Envie foto ou PDF do calendário para extrair os feriados automaticamente.
        </p>
        <CalendarAiUpload />
      </div>
    </>
  );
}
