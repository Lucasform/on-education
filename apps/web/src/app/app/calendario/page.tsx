import { SubmitButton } from '@/components/submit-button';
import { listClasses, listEvents } from '@on-education/module-nucleo';
import { Button } from '@on-education/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { hojeISO } from '@/lib/date';

import { createEventAction, deleteEventAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Calendário · Edu On Way' };

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const pad = (n: number) => String(n).padStart(2, '0');

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; dia?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [eventos, turmas] = await Promise.all([listEvents(client, ctx), listClasses(client, ctx)]);
  const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));

  const hoje = new Date();
  const hojeStr = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;

  const { mes, dia } = await searchParams;
  const [ano, m] =
    mes && /^\d{4}-\d{2}$/.test(mes)
      ? (mes.split('-').map(Number) as [number, number])
      : [hoje.getFullYear(), hoje.getMonth() + 1];
  // Dia selecionado (clicado), se válido e dentro do mês exibido.
  const diaSel =
    dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) && dia.startsWith(`${ano}-${pad(m)}-`) ? dia : null;

  const prev = m === 1 ? `${ano - 1}-12` : `${ano}-${pad(m - 1)}`;
  const next = m === 12 ? `${ano + 1}-01` : `${ano}-${pad(m + 1)}`;

  // Eventos do mês, agrupados por dia (YYYY-MM-DD).
  const prefixo = `${ano}-${pad(m)}-`;
  const porDia = new Map<string, typeof eventos>();
  for (const e of eventos) {
    if (!e.date.startsWith(prefixo)) continue;
    const arr = porDia.get(e.date) ?? [];
    arr.push(e);
    porDia.set(e.date, arr);
  }
  const doMes = eventos
    .filter((e) => e.date.startsWith(prefixo))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));

  // Monta as células da grade (espaços em branco antes do dia 1 e depois do último).
  const primeiroDow = new Date(ano, m - 1, 1).getDay();
  const diasNoMes = new Date(ano, m, 0).getDate();
  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDow; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);
  while (celulas.length % 7 !== 0) celulas.push(null);

  return (
    <>
      <PageHeader title="Calendário" description="Eventos e agendamentos da escola." />

      <section className={cardClass}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {MESES[m - 1]} <span className="text-muted-foreground">{ano}</span>
          </h2>
          <div className="flex items-center gap-1">
            <Link href={`/app/calendario?mes=${prev}`} aria-label="Mês anterior">
              <Button size="sm" variant="ghost">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/app/calendario">
              <Button size="sm" variant="ghost">
                Hoje
              </Button>
            </Link>
            <Link href={`/app/calendario?mes=${next}`} aria-label="Próximo mês">
              <Button size="sm" variant="ghost">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-sm">
          {SEMANA.map((s) => (
            <div
              key={s}
              className="bg-card px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {s}
            </div>
          ))}
          {celulas.map((d, i) => {
            if (d === null)
              return <div key={`v-${i}`} className="min-h-12 bg-muted/30 sm:min-h-20" />;
            const dataStr = `${ano}-${pad(m)}-${pad(d)}`;
            const evs = porDia.get(dataStr) ?? [];
            const isHoje = dataStr === hojeStr;
            const isSel = dataStr === diaSel;
            return (
              <Link
                key={dataStr}
                href={`/app/calendario?mes=${ano}-${pad(m)}&dia=${dataStr}`}
                scroll={false}
                className={`min-h-12 bg-card p-1 transition-colors hover:bg-accent/50 sm:min-h-20 sm:p-1.5 ${
                  isSel ? 'ring-2 ring-inset ring-primary' : ''
                }`}
              >
                <div
                  className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] sm:h-6 sm:w-6 sm:text-xs ${
                    isHoje
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {d}
                </div>
                {/* Mobile: bolinhas (evita estourar a célula estreita). */}
                {evs.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 sm:hidden">
                    {evs.slice(0, 4).map((e) => (
                      <span key={e.id} className="h-1.5 w-1.5 rounded-full bg-primary" />
                    ))}
                  </div>
                )}
                {/* sm+: rótulos dos eventos. */}
                <div className="hidden space-y-0.5 sm:block">
                  {evs.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      title={e.title}
                      className="truncate rounded bg-primary/10 px-1 py-0.5 text-[11px] text-primary"
                    >
                      {e.time ? `${e.time.slice(0, 5)} ` : ''}
                      {e.title}
                    </div>
                  ))}
                  {evs.length > 3 && (
                    <div className="px-1 text-[10px] text-muted-foreground">+{evs.length - 3}</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className={cardClass}>
          <h2 className="mb-3 flex items-center justify-between text-sm font-medium">
            <span>
              {diaSel
                ? `Eventos de ${diaSel.slice(8)}/${pad(m)} (${(porDia.get(diaSel) ?? []).length})`
                : `Eventos de ${MESES[m - 1]} (${doMes.length})`}
            </span>
            {diaSel && (
              <Link
                href={`/app/calendario?mes=${ano}-${pad(m)}`}
                className="text-xs font-normal text-primary hover:underline"
              >
                ver o mês
              </Link>
            )}
          </h2>
          {(diaSel ? (porDia.get(diaSel) ?? []) : doMes).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {diaSel ? 'Nenhum evento neste dia.' : 'Nenhum evento neste mês.'}
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {(diaSel ? (porDia.get(diaSel) ?? []) : doMes).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  <span>
                    <span className="text-muted-foreground">
                      {e.date.slice(8)}/{pad(m)}
                    </span>{' '}
                    {e.time && (
                      <span className="text-muted-foreground">{e.time.slice(0, 5)} · </span>
                    )}
                    {e.title}
                    {e.classId && (
                      <span className="text-muted-foreground"> · {turmaNome.get(e.classId)}</span>
                    )}
                  </span>
                  <form action={deleteEventAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <ConfirmButton
                      size="sm"
                      variant="ghost"
                      message={`Excluir o evento "${e.title}"? Vai para a Lixeira.`}
                    >
                      Excluir
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Novo evento</h2>
          <form action={createEventAction} className="flex flex-col gap-2">
            <input name="title" required placeholder="Título do evento" className={fieldClass} />
            <div className="flex gap-2">
              <input
                name="date"
                type="date"
                required
                defaultValue={diaSel ?? hojeISO()}
                className={fieldClass}
              />
              <input name="time" type="time" className={fieldClass} />
            </div>
            <select name="classId" className={fieldClass} defaultValue="">
              <option value="">Toda a escola</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <textarea
              name="description"
              rows={2}
              placeholder="Descrição (opcional)"
              className={fieldClass}
            />
            <SubmitButton type="submit" size="sm">
              Agendar
            </SubmitButton>
          </form>
        </section>
      </div>
    </>
  );
}
