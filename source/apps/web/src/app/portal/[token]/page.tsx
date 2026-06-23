import { db } from '@/server/db';
import { guardianCanMessageTeacher, listMessagesForGuardian } from '@on-education/module-comunicacao';
import { resolvePortalToken } from '@on-education/module-nucleo';
import Link from 'next/link';

import { sendPortalMessageAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Portal do Responsável · Edu On Way' };

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await resolvePortalToken(db(), token).catch(() => null);

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold">Link inválido ou expirado</h1>
        <p className="text-muted-foreground">
          Este link de acesso não é mais válido. Solicite um novo link à escola.
        </p>
        <Link
          href="/login"
          className="text-primary underline-offset-4 hover:underline"
        >
          Acessar como membro da escola
        </Link>
      </div>
    );
  }

  const [chat, podeProfessor] = await Promise.all([
    listMessagesForGuardian(db(), data.tenantId, data.guardian.id).catch(() => []),
    guardianCanMessageTeacher(db(), data.tenantId).catch(() => false),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Olá, {data.guardian.fullName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhamento escolar dos seus filhos
        </p>
      </div>

      {data.students.map((student) => (
        <section
          key={student.id}
          className="space-y-4 rounded-lg border border-border p-6"
        >
          <h2 className="text-lg font-semibold">{student.fullName}</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-md border border-border p-3 text-center">
              <div className="text-2xl font-bold text-red-500">{student.absences}</div>
              <div className="text-xs text-muted-foreground">Faltas</div>
            </div>
            <div className="rounded-md border border-border p-3 text-center">
              <div className="text-2xl font-bold">{student.grades.length}</div>
              <div className="text-xs text-muted-foreground">Notas lançadas</div>
            </div>
          </div>

          {student.grades.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Notas</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-1 pr-4">Avaliação</th>
                    <th className="pb-1 pr-4">Matéria</th>
                    <th className="pb-1">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {student.grades.map((g, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-1 pr-4">{g.label}</td>
                      <td className="py-1 pr-4 text-muted-foreground">
                        {g.subjectName ?? '-'}
                      </td>
                      <td className="py-1 font-medium">{g.value ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {student.recentLessons.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Aulas recentes</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {student.recentLessons.slice(0, 5).map((l, i) => (
                  <li key={i}>
                    {l.date.split('-').reverse().join('/')} · {l.topic}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}

      {data.students.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Nenhum aluno vinculado a este responsável.
        </p>
      )}

      {data.communications.length > 0 && (
        <section className="space-y-3 rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold">Comunicados recentes</h2>
          {data.communications.map((c, i) => (
            <div key={i} className="border-b border-border/50 pb-3 last:border-0">
              <p className="font-medium">{c.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </section>
      )}

      {/* Chat interno com a escola */}
      <section className="space-y-3 rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold">Falar com a escola</h2>
        {chat.length > 0 && (
          <ul className="space-y-2">
            {chat.map((m) => (
              <li key={m.id} className={`flex ${m.fromGuardian ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.fromGuardian
                      ? 'bg-primary text-white'
                      : 'border border-border bg-background'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${m.fromGuardian ? 'text-white/70' : 'text-muted-foreground'}`}
                  >
                    {m.fromGuardian ? 'Você' : (m.authorName ?? 'Escola')} ·{' '}
                    {new Date(m.createdAt).toLocaleString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <form action={sendPortalMessageAction} className="flex flex-col gap-2">
          <input type="hidden" name="token" value={token} />
          <textarea
            name="body"
            required
            rows={2}
            placeholder="Escreva sua mensagem para a escola…"
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex items-center gap-2">
            <select
              name="target"
              defaultValue="coordenacao"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="coordenacao">Para a coordenação</option>
              {podeProfessor && <option value="professor">Para o professor</option>}
            </select>
            <button
              type="submit"
              className="ml-auto rounded-full bg-primary px-5 py-2 text-sm font-medium text-white"
            >
              Enviar
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}