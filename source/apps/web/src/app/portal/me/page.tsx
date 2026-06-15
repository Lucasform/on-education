import { resolvePortalForGuardian } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getGuardianSession } from '@/server/guardian-session';
import { logoutGuardianAction } from '../login/actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Portal do Responsável · Edu On Way' };

export default async function PortalMePage() {
  const session = await getGuardianSession();
  if (!session) redirect('/portal/login');

  const data = await resolvePortalForGuardian(db(), session.guardianId, session.tenantId).catch(() => null);
  if (!data) redirect('/portal/login');

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Olá, {data.guardian.fullName}</h1>
          <p className="text-sm text-muted-foreground">Acompanhe o desempenho dos seus filhos.</p>
        </div>
        <form action={logoutGuardianAction}>
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            Sair
          </button>
        </form>
      </div>

      {data.students.length === 0 ? (
        <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum aluno vinculado ainda. Contate a escola.
        </div>
      ) : (
        data.students.map((s) => (
          <div key={s.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-3 font-medium">{s.fullName}</h2>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-muted px-3 py-2">
                <div className="text-xs text-muted-foreground">Faltas</div>
                <div className="text-lg font-semibold">{s.absences}</div>
              </div>
              <div className="rounded-md bg-muted px-3 py-2">
                <div className="text-xs text-muted-foreground">Notas registradas</div>
                <div className="text-lg font-semibold">{s.grades.length}</div>
              </div>
            </div>

            {s.grades.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Notas
                </h3>
                <ul className="space-y-1 text-sm">
                  {s.grades.map((g, i) => (
                    <li key={i} className="flex justify-between gap-2 text-muted-foreground">
                      <span>
                        {g.label}
                        {g.subjectName && <span className="ml-1 text-xs opacity-70">· {g.subjectName}</span>}
                        {g.termName && <span className="ml-1 text-xs opacity-70">· {g.termName}</span>}
                      </span>
                      <span className="font-medium text-foreground">
                        {g.value === null ? 'pend.' : g.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {s.recentLessons.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Aulas recentes
                </h3>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {s.recentLessons.slice(0, 5).map((l, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>{l.topic}</span>
                      <span className="shrink-0">{l.date.split('-').reverse().join('/')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))
      )}

      {data.communications.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-medium">Comunicados da escola</h2>
          <ul className="space-y-3 text-sm">
            {data.communications.map((c, i) => (
              <li key={i} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <p className="font-medium">{c.title}</p>
                <p className="mt-0.5 text-muted-foreground">{c.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
