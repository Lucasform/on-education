import { SubmitButton } from '@/components/submit-button';
import { listClasses, listCouncils } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { hojeISO } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createCouncilAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Conselho de Classe · Edu On Way' };

const STATUS_LABEL: Record<string, string> = { draft: 'Em andamento', closed: 'Encerrado' };
const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-500',
  closed: 'bg-muted text-muted-foreground',
};

export default async function ConselhoClassePage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [conselhos, turmas] = await Promise.all([
    listCouncils(client, ctx).catch(() => []),
    listClasses(client, ctx).catch(() => []),
  ]);

  return (
    <>
      <PageHeader
        title="Conselho de Classe"
        description="Registro dos conselhos de classe por turma."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Conselhos ({conselhos.length})</h2>
          {conselhos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum conselho registrado.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {conselhos.map((c) => (
                <li key={c.id} className="rounded-md border border-border p-3">
                  <a
                    href={`/app/conselho-classe/${c.id}`}
                    className="flex items-center justify-between gap-2 hover:underline"
                  >
                    <span className="font-medium">{c.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_CLASS[c.status] ?? STATUS_CLASS.draft}`}
                    >
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </a>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.date.split('-').reverse().join('/')}
                    {' · '}
                    {turmas.find((t) => t.id === c.classId)?.name ?? 'Turma'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Novo conselho</h2>
          {turmas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Cadastre turmas para criar conselhos de classe.
            </p>
          ) : (
            <form action={createCouncilAction} className="flex flex-col gap-2">
              <select name="classId" required className={fieldClass}>
                <option value="">Selecione a turma</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <input
                name="title"
                required
                placeholder="Título do conselho"
                className={fieldClass}
              />
              <input
                name="date"
                type="date"
                required
                defaultValue={hojeISO()}
                className={fieldClass}
              />
              <SubmitButton type="submit" size="sm">
                Criar conselho
              </SubmitButton>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
