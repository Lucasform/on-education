import { listClasses, listEvents } from '@on-education/module-nucleo';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createEventAction, deleteEventAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Calendário · On Education' };

export default async function CalendarioPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [eventos, turmas] = await Promise.all([listEvents(client, ctx), listClasses(client, ctx)]);
  const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));

  // Agrupa por data para um calendário em lista.
  const porData = new Map<string, typeof eventos>();
  for (const e of eventos) {
    const arr = porData.get(e.date) ?? [];
    arr.push(e);
    porData.set(e.date, arr);
  }

  return (
    <>
      <PageHeader title="Calendário" description="Eventos e agendamentos da escola." />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Agenda ({eventos.length})</h2>
          {eventos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento agendado.</p>
          ) : (
            <div className="space-y-4">
              {[...porData.entries()].map(([data, lista]) => (
                <div key={data}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {data}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {lista.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-2">
                        <span>
                          {e.time && <span className="text-muted-foreground">{e.time} · </span>}
                          {e.title}
                          {e.classId && (
                            <span className="text-muted-foreground">
                              {' '}
                              · {turmaNome.get(e.classId)}
                            </span>
                          )}
                        </span>
                        <form action={deleteEventAction}>
                          <input type="hidden" name="id" value={e.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            Excluir
                          </Button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Novo evento</h2>
          <form action={createEventAction} className="flex flex-col gap-2">
            <input name="title" required placeholder="Título do evento" className={fieldClass} />
            <div className="flex gap-2">
              <input name="date" type="date" required className={fieldClass} />
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
            <Button type="submit" size="sm">
              Agendar
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
