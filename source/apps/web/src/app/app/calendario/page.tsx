import {
  calculateSchoolDays,
  getSchoolYear,
  listCalendarEvents,
  listClasses,
  listEvents,
} from '@on-education/module-nucleo';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { hojeISO } from '@/lib/date';

import { CalendarAiUpload } from '../escola/calendario/CalendarAiUpload';
import { deleteCalendarEventAction, setSchoolYearAction } from '../escola/calendario/actions';
import { createEventAction, deleteEventAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Calendário · Edu On Way' };

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const pad = (n: number) => String(n).padStart(2, '0');

// Tipo unificado para renderização na grade
interface UnifiedEvent {
  id: string;
  date: string;
  title: string;
  kind: 'feriado' | 'recesso' | 'commemorative' | 'school_day' | 'evento';
  time?: string | null;
  classId?: string | null;
  source: 'event' | 'calendar'; // qual tabela originou
}

const CELL_COLORS: Record<string, string> = {
  feriado:       'border-l-4 border-l-red-500 bg-red-500/5',
  recesso:       'border-l-4 border-l-orange-400 bg-orange-400/5',
  commemorative: 'border-l-4 border-l-blue-500 bg-blue-500/5',
  school_day:    'border-l-4 border-l-green-500 bg-green-500/5',
  evento:        'border-l-4 border-l-primary bg-primary/5',
};
const LABEL_COLORS: Record<string, string> = {
  feriado:       'bg-red-500/15 text-red-500',
  recesso:       'bg-orange-400/15 text-orange-500',
  commemorative: 'bg-blue-500/15 text-blue-500',
  school_day:    'bg-green-500/15 text-green-600',
  evento:        'bg-primary/15 text-primary',
};
const KIND_LABEL: Record<string, string> = {
  feriado:       'Feriado',
  recesso:       'Sem aula',
  commemorative: 'Data comemorativa',
  school_day:    'Dia letivo esp.',
  evento:        'Evento',
};

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; dia?: string }>;
}) {
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

  // Normaliza eventos da tabela `events`
  const eventsNorm: UnifiedEvent[] = eventosBase.map((e) => ({
    id: e.id,
    date: e.date,
    title: e.title,
    kind: e.kind as UnifiedEvent['kind'],
    time: e.time,
    classId: e.classId,
    source: 'event' as const,
  }));

  // Normaliza school_calendar_events
  const TYPE_MAP: Record<string, UnifiedEvent['kind']> = {
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

  // Merge sem duplicatas (mesmo dia+título)
  const seen = new Set(eventsNorm.map((e) => `${e.date}|${e.title}`));
  const merged = [...eventsNorm, ...calNorm.filter((e) => !seen.has(`${e.date}|${e.title}`))];
  const eventos = merged.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));

  // Dias letivos (exclui feriado+recesso+fins de semana)
  const nonSchoolSet = new Set(
    eventos.filter((e) => e.kind === 'feriado' || e.kind === 'recesso').map((e) => e.date),
  );
  const schoolDays =
    schoolYear.schoolYearStart && schoolYear.schoolYearEnd
      ? calculateSchoolDays(schoolYear.schoolYearStart, schoolYear.schoolYearEnd, nonSchoolSet)
      : null;

  const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));
  const hoje = new Date();
  const hojeStr = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;

  const { mes, dia } = await searchParams;
  const [ano, m] =
    mes && /^\d{4}-\d{2}$/.test(mes)
      ? (mes.split('-').map(Number) as [number, number])
      : [hoje.getFullYear(), hoje.getMonth() + 1];
  const diaSel =
    dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) && dia.startsWith(`${ano}-${pad(m)}-`) ? dia : null;

  const prev = m === 1 ? `${ano - 1}-12` : `${ano}-${pad(m - 1)}`;
  const next = m === 12 ? `${ano + 1}-01` : `${ano}-${pad(m + 1)}`;

  const prefixo = `${ano}-${pad(m)}-`;
  const porDia = new Map<string, UnifiedEvent[]>();
  for (const e of eventos) {
    if (!e.date.startsWith(prefixo)) continue;
    const arr = porDia.get(e.date) ?? [];
    arr.push(e);
    porDia.set(e.date, arr);
  }
  const doMes = eventos.filter((e) => e.date.startsWith(prefixo));

  // Grade
  const primeiroDow = new Date(ano, m - 1, 1).getDay();
  const diasNoMes = new Date(ano, m, 0).getDate();
  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDow; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);
  while (celulas.length % 7 !== 0) celulas.push(null);

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
      {(
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
      )}

      {/* Legenda */}
      {(
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {Object.entries(KIND_LABEL).map(([k, label]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${LABEL_COLORS[k]?.split(' ')[0]?.replace('bg-', 'bg-')}`} />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            Final de semana
          </span>
        </div>
      )}

      {/* Grade mensal */}
      <div className={cardClass}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {MESES[m - 1]} <span className="text-muted-foreground">{ano}</span>
          </h2>
          <div className="flex items-center gap-1">
            <Link
              href={`/app/calendario?mes=${prev}`}
              aria-label="Mês anterior"
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link href="/app/calendario" className="rounded-md px-2 py-1 text-sm hover:bg-accent">
              Hoje
            </Link>
            <Link
              href={`/app/calendario?mes=${next}`}
              aria-label="Próximo mês"
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {SEMANA.map((s) => (
            <div key={s} className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {s}
            </div>
          ))}
          {celulas.map((d, i) => {
            if (d === null) return <div key={`v-${i}`} className="min-h-[52px] rounded-md" />;
            const dataStr = `${ano}-${pad(m)}-${pad(d)}`;
            const isWeekend = i % 7 === 0 || i % 7 === 6;
            const isHoje = dataStr === hojeStr;
            const isSel = dataStr === diaSel;
            const evs = porDia.get(dataStr) ?? [];
            const dominant = evs[0];

            let cellCls = 'min-h-[52px] rounded-md border p-1 text-xs transition-colors cursor-pointer';
            if (isHoje) cellCls += ' border-primary/60 ring-1 ring-primary/30';
            else if (isSel) cellCls += ' border-primary ring-1 ring-primary/50';
            else if (dominant) cellCls += ` ${CELL_COLORS[dominant.kind] ?? ''}`;
            else if (isWeekend) cellCls += ' border-border/30 bg-muted/30 text-muted-foreground';
            else cellCls += ' border-border/50';

            return (
              <Link key={dataStr} href={`/app/calendario?mes=${ano}-${pad(m)}&dia=${dataStr}`} scroll={false}>
                <div className={cellCls}>
                  <div className={`font-medium ${isHoje ? 'text-primary' : ''}`}>{d}</div>
                  {evs.slice(0, 2).map((e) => (
                    <div
                      key={e.id}
                      className="mt-0.5 truncate rounded-sm px-0.5 py-px text-[10px] leading-tight"
                      title={e.title}
                    >
                      {e.title}
                    </div>
                  ))}
                  {evs.length > 2 && (
                    <div className="px-0.5 text-[9px] text-muted-foreground">+{evs.length - 2}</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Eventos do dia/mês */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 flex items-center justify-between text-sm font-medium">
            <span>
              {diaSel
                ? `${diaSel.slice(8)}/${pad(m)} · ${(porDia.get(diaSel) ?? []).length} evento(s)`
                : `${MESES[m - 1]} · ${doMes.length} evento(s)`}
            </span>
            {diaSel && (
              <Link href={`/app/calendario?mes=${ano}-${pad(m)}`} className="text-xs font-normal text-primary hover:underline">
                ver mês
              </Link>
            )}
          </h2>
          {(diaSel ? (porDia.get(diaSel) ?? []) : doMes).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {(diaSel ? (porDia.get(diaSel) ?? []) : doMes).map((e) => (
                <li key={e.id} className={`flex items-center justify-between gap-2 rounded-md border-l-4 pl-2 py-1 ${CELL_COLORS[e.kind] ?? ''}`}>
                  <span className="flex-1 min-w-0">
                    <span className="text-muted-foreground text-xs">{e.date.slice(8)}/{pad(m)} </span>
                    {e.time && <span className="text-muted-foreground text-xs">{e.time.slice(0, 5)} · </span>}
                    <span className="truncate">{e.title}</span>
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${LABEL_COLORS[e.kind] ?? 'bg-muted text-muted-foreground'}`}>
                      {KIND_LABEL[e.kind] ?? e.kind}
                    </span>
                    {e.classId && <span className="ml-1 text-xs text-muted-foreground">· {turmaNome.get(e.classId)}</span>}
                  </span>
                  {e.source === 'calendar' ? (
                    <form action={deleteCalendarEventAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <ConfirmButton size="sm" variant="ghost" message={`Remover "${e.title}"?`}>
                        ×
                      </ConfirmButton>
                    </form>
                  ) : (
                    <form action={deleteEventAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <ConfirmButton size="sm" variant="ghost" message={`Excluir "${e.title}"?`}>
                        ×
                      </ConfirmButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Formulário: novo evento */}
        <div className="flex flex-col gap-4">
          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Adicionar evento</h2>
            <form action={createEventAction} className="flex flex-col gap-2">
              <input name="title" required placeholder="Título" className={fieldClass} />
              <select name="kind" defaultValue="evento" className={fieldClass}>
                <option value="evento">Evento</option>
                <option value="feriado">Feriado (não letivo)</option>
                <option value="recesso">Sem aula (não letivo)</option>
              </select>
              <div className="flex gap-2">
                <input name="date" type="date" required defaultValue={diaSel ?? hojeISO()} className={fieldClass} />
                <input name="time" type="time" className={fieldClass} />
              </div>
              {turmas.length > 0 && (
                <select name="classId" className={fieldClass} defaultValue="">
                  <option value="">Toda a escola</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
              <SubmitButton type="submit" size="sm">Adicionar</SubmitButton>
            </form>
          </div>

          {/* Upload IA */}
          <div className={cardClass}>
            <h2 className="mb-2 text-sm font-medium">Importar com IA</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Envie foto ou PDF do calendário para extrair os feriados automaticamente.
            </p>
            <CalendarAiUpload />
          </div>
        </div>
      </div>
    </>
  );
}
