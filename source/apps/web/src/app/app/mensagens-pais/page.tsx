import { listPortalMessages } from '@on-education/module-comunicacao';
import { getTenantSettings } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ComunicacaoTabs } from '@/components/comunicacao-tabs';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { replyToGuardianAction, setGuardianMsgTeacherAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mensagens dos pais · Edu On Way' };

function quando(d: Date | string) {
  return new Date(d).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function MensagensPaisPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const client = db();

  const [mensagens, settings] = await Promise.all([
    listPortalMessages(client, ctx).catch(
      () => [] as Awaited<ReturnType<typeof listPortalMessages>>,
    ),
    getTenantSettings(client, ctx).catch(() => null),
  ]);
  const permiteProfessor = settings?.allowGuardianMessageTeacher === true;

  // Agrupa por responsável (ordem crescente dentro da thread).
  const threads = new Map<string, { name: string; msgs: typeof mensagens }>();
  for (const m of mensagens) {
    const t = threads.get(m.guardianId) ?? { name: m.guardianName ?? 'Responsável', msgs: [] };
    t.msgs.push(m);
    threads.set(m.guardianId, t);
  }
  const lista = [...threads.entries()].map(([guardianId, t]) => ({
    guardianId,
    name: t.name,
    msgs: [...t.msgs].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
  }));

  return (
    <>
      <PageHeader
        title="Mensagens dos pais"
        description="Canal interno entre os responsáveis e a coordenação."
      />
      <ComunicacaoTabs />

      <form action={setGuardianMsgTeacherAction} className={`${cardClass} flex flex-wrap items-center gap-3`}>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="allowGuardianMessageTeacher"
            defaultChecked={permiteProfessor}
            className="h-4 w-4"
          />
          Permitir que o responsável envie mensagem direcionada ao professor
        </label>
        <SubmitButton type="submit" size="sm" variant="outline" className="ml-auto">
          Salvar
        </SubmitButton>
      </form>

      {lista.length === 0 ? (
        <div className={cardClass}>
          <p className="text-sm text-muted-foreground">
            Nenhuma mensagem ainda. Os responsáveis falam com a escola pelo portal deles.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {lista.map((th) => (
            <section key={th.guardianId} className={cardClass}>
              <h2 className="mb-3 text-sm font-medium">{th.name}</h2>
              <ul className="space-y-2">
                {th.msgs.map((m) => (
                  <li
                    key={m.id}
                    className={`flex ${m.fromGuardian ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        m.fromGuardian
                          ? 'border border-border bg-background'
                          : 'bg-primary text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p
                        className={`mt-1 text-[10px] ${m.fromGuardian ? 'text-muted-foreground' : 'text-white/70'}`}
                      >
                        {m.fromGuardian ? (th.name ?? 'Responsável') : (m.authorName ?? 'Coordenação')}
                        {m.target === 'professor' ? ' · para o professor' : ''} · {quando(m.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <form action={replyToGuardianAction} className="mt-3 flex items-center gap-2">
                <input type="hidden" name="guardianId" value={th.guardianId} />
                <input name="body" placeholder="Responder…" className={`${fieldClass} flex-1`} />
                <SubmitButton type="submit" size="sm">
                  Responder
                </SubmitButton>
              </form>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
