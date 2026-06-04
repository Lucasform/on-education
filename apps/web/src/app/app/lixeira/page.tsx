import { SubmitButton } from '@/components/submit-button';
import {
  listDeletedClasses,
  listDeletedEvents,
  listDeletedStudents,
} from '@on-education/module-nucleo';
import { listDeletedCommunications } from '@on-education/module-comunicacao';
import { listDeletedActivities } from '@on-education/module-pedagogico';
import { redirect } from 'next/navigation';

import { cardClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  restoreActivityAction,
  restoreClassAction,
  restoreCommunicationAction,
  restoreEventAction,
  restoreStudentAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Lixeira · On Way Education' };

type Item = { id: string; label: string };

function Secao({
  titulo,
  itens,
  action,
}: {
  titulo: string;
  itens: Item[];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className={cardClass}>
      <h2 className="mb-3 text-sm font-medium">
        {titulo} ({itens.length})
      </h2>
      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada na lixeira.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {itens.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2">
              <span>{i.label}</span>
              <form action={action}>
                <input type="hidden" name="id" value={i.id} />
                <SubmitButton type="submit" size="sm" variant="outline">
                  Restaurar
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function LixeiraPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [turmas, alunos, atividades, comunicados, eventos] = await Promise.all([
    listDeletedClasses(client, ctx),
    listDeletedStudents(client, ctx),
    listDeletedActivities(client, ctx),
    listDeletedCommunications(client, ctx),
    listDeletedEvents(client, ctx),
  ]);

  return (
    <>
      <PageHeader title="Lixeira" description="Itens excluídos. Restaure quando precisar." />
      <div className="grid gap-5 md:grid-cols-2">
        <Secao
          titulo="Turmas"
          itens={turmas.map((t) => ({ id: t.id, label: t.name }))}
          action={restoreClassAction}
        />
        <Secao
          titulo="Alunos"
          itens={alunos.map((a) => ({ id: a.id, label: a.fullName }))}
          action={restoreStudentAction}
        />
        <Secao
          titulo="Atividades"
          itens={atividades.map((a) => ({ id: a.id, label: a.title }))}
          action={restoreActivityAction}
        />
        <Secao
          titulo="Comunicados"
          itens={comunicados.map((c) => ({ id: c.id, label: c.title }))}
          action={restoreCommunicationAction}
        />
        <Secao
          titulo="Eventos"
          itens={eventos.map((e) => ({ id: e.id, label: `${e.date} · ${e.title}` }))}
          action={restoreEventAction}
        />
      </div>
    </>
  );
}
