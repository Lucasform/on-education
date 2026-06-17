'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';

import { createEventAction, deleteEventAction } from '../actions';
import { deleteCalendarEventAction } from '../escola/calendario/actions';

export interface UnifiedEvent {
  id: string;
  date: string;
  title: string;
  kind: string;
  time?: string | null;
  classId?: string | null;
  source: 'event' | 'calendar';
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const pad = (n: number) => String(n).padStart(2, '0');

const CELL_COLORS: Record<string, string> = {
  feriado: 'border-l-4 border-l-red-500 bg-red-500/5',
  recesso: 'border-l-4 border-l-orange-400 bg-orange-400/5',
  commemorative: 'border-l-4 border-l-blue-500 bg-blue-500/5',
  school_day: 'border-l-4 border-l-green-500 bg-green-500/5',
  evento: 'border-l-4 border-l-primary bg-primary/5',
};
const LABEL_COLORS: Record<string, string> = {
  feriado: 'bg-red-500/15 text-red-500',
  recesso: 'bg-orange-400/15 text-orange-500',
  commemorative: 'bg-blue-500/15 text-blue-500',
  school_day: 'bg-green-500/15 text-green-600',
  evento: 'bg-primary/15 text-primary',
};
const KIND_LABEL: Record<string, string> = {
  feriado: 'Feriado',
  recesso: 'Sem aula',
  commemorative: 'Data comemorativa',
  school_day: 'Dia letivo esp.',
  evento: 'Evento',
};

export function CalendarView({
  events,
  turmas,
  today,
}: {
  events: UnifiedEvent[];
  turmas: { id: string; name: string }[];
  today: string; // YYYY-MM-DD
}) {
  const [ty, tm] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  const [ano, setAno] = useState(ty);
  const [m, setM] = useState(tm); // 1..12
  const [diaSel, setDiaSel] = useState<string | null>(null);

  const prefixo = `${ano}-${pad(m)}-`;

  const porDia = useMemo(() => {
    const map = new Map<string, UnifiedEvent[]>();
    for (const e of events) {
      if (!e.date.startsWith(prefixo)) continue;
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [events, prefixo]);

  const doMes = useMemo(() => events.filter((e) => e.date.startsWith(prefixo)), [events, prefixo]);

  const celulas = useMemo(() => {
    const primeiroDow = new Date(ano, m - 1, 1).getDay();
    const diasNoMes = new Date(ano, m, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < primeiroDow; i++) arr.push(null);
    for (let d = 1; d <= diasNoMes; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [ano, m]);

  const anos = Array.from({ length: 7 }, (_, i) => ty - 2 + i);

  function goPrev() {
    setDiaSel(null);
    if (m === 1) { setM(12); setAno((a) => a - 1); } else setM((x) => x - 1);
  }
  function goNext() {
    setDiaSel(null);
    if (m === 12) { setM(1); setAno((a) => a + 1); } else setM((x) => x + 1);
  }
  function hoje() {
    setAno(ty); setM(tm); setDiaSel(today);
  }

  const lista = diaSel ? (porDia.get(diaSel) ?? []) : doMes;
  const dateDefault = diaSel ?? today;

  return (
    <>
      {/* Grade mensal */}
      <div className={cardClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Mês anterior"
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="min-w-28 text-center text-base font-semibold">{MESES[m - 1]}</h2>
            <button
              type="button"
              onClick={goNext}
              aria-label="Próximo mês"
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <select
              value={ano}
              onChange={(e) => { setAno(Number(e.target.value)); setDiaSel(null); }}
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              aria-label="Ano"
            >
              {anos.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={hoje} className="rounded-md border border-border px-3 py-1 text-sm hover:bg-accent">
            Hoje
          </button>
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
            const isHoje = dataStr === today;
            const isSel = dataStr === diaSel;
            const evs = porDia.get(dataStr) ?? [];
            const dominant = evs[0];

            let cellCls = 'min-h-[52px] rounded-md border p-1 text-xs text-left transition-colors cursor-pointer hover:border-primary/50';
            if (isSel) cellCls += ' border-primary ring-2 ring-primary/50';
            else if (isHoje) cellCls += ' border-primary/60 ring-1 ring-primary/30';
            else if (dominant) cellCls += ` ${CELL_COLORS[dominant.kind] ?? ''}`;
            else if (isWeekend) cellCls += ' border-border/30 bg-muted/30 text-muted-foreground';
            else cellCls += ' border-border/50';

            return (
              <button
                type="button"
                key={dataStr}
                onClick={() => setDiaSel((cur) => (cur === dataStr ? null : dataStr))}
                className={cellCls}
              >
                <div className={`font-medium ${isHoje ? 'text-primary' : ''}`}>{d}</div>
                {evs.slice(0, 2).map((e) => (
                  <div key={e.id} className="mt-0.5 truncate rounded-sm px-0.5 py-px text-[10px] leading-tight" title={e.title}>
                    {e.title}
                  </div>
                ))}
                {evs.length > 2 && (
                  <div className="px-0.5 text-[9px] text-muted-foreground">+{evs.length - 2}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Eventos do dia/mês + novo evento */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 flex items-center justify-between text-sm font-medium">
            <span>
              {diaSel
                ? `${diaSel.slice(8)}/${pad(m)}/${ano} · ${lista.length} evento(s)`
                : `${MESES[m - 1]} ${ano} · ${doMes.length} evento(s)`}
            </span>
            {diaSel && (
              <button type="button" onClick={() => setDiaSel(null)} className="text-xs font-normal text-primary hover:underline">
                ver mês
              </button>
            )}
          </h2>
          {lista.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {lista.map((e) => (
                <li key={e.id} className={`flex items-center justify-between gap-2 rounded-md border-l-4 pl-2 py-1 ${CELL_COLORS[e.kind] ?? ''}`}>
                  <span className="min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground">{e.date.slice(8)}/{pad(m)} </span>
                    {e.time && <span className="text-xs text-muted-foreground">{e.time.slice(0, 5)} · </span>}
                    <span className="truncate">{e.title}</span>
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${LABEL_COLORS[e.kind] ?? 'bg-muted text-muted-foreground'}`}>
                      {KIND_LABEL[e.kind] ?? e.kind}
                    </span>
                  </span>
                  <form action={e.source === 'calendar' ? deleteCalendarEventAction : deleteEventAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <ConfirmButton size="sm" variant="ghost" message={`Remover "${e.title}"?`}>×</ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>

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
              <input key={dateDefault} name="date" type="date" required defaultValue={dateDefault} className={fieldClass} />
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
      </div>
    </>
  );
}
