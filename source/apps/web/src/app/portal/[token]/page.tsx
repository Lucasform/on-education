import { resolvePortalToken } from '@on-education/module-nucleo';
import { BookOpen, Calendar, GraduationCap, Megaphone, XCircle } from 'lucide-react';

import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

function fmt(iso: string) {
  const [a = 0, m = 1, d = 1] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`;
}

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await resolvePortalToken(db(), token);

  if (!data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <XCircle className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-semibold">Link inválido ou expirado</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Este link de acesso não é mais válido. Solicite um novo link à escola.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-4 py-8 md:p-8">
      <div>
        <p className="text-sm text-muted-foreground">Portal do responsável</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.guardian.fullName}</h1>
      </div>

      {data.students.map((s) => (
        <section key={s.id} className="flex flex-col gap-4 rounded-xl border border-border p-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{s.fullName}</h2>
          </div>

          {/* Notas */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Notas
            </p>
            {s.grades.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma nota lançada ainda.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Atividade</th>
                      <th className="px-3 py-2 text-left font-medium">Matéria</th>
                      <th className="px-3 py-2 text-left font-medium">Período</th>
                      <th className="px-3 py-2 text-right font-medium">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.grades.map((g, i) => (
                      <tr key={i} className="border-t border-border/60">
                        <td className="px-3 py-2">{g.label}</td>
                        <td className="px-3 py-2 text-muted-foreground">{g.subjectName ?? '-'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{g.termName ?? '-'}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          {g.kind === 'anotacao' ? (
                            <span className="text-muted-foreground">Anotação</span>
                          ) : g.value != null ? (
                            g.value.toFixed(1)
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Faltas */}
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-sm font-medium">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Frequência
            </p>
            <p className="text-sm">
              {s.absences === 0 ? (
                <span className="text-success">Sem faltas registradas.</span>
              ) : (
                <span>
                  <span className="font-semibold text-warning">{s.absences}</span>{' '}
                  falta(s) registrada(s).
                </span>
              )}
            </p>
          </div>

          {/* Aulas recentes */}
          {s.recentLessons.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Últimas aulas
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {s.recentLessons.map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0">{fmt(l.date)}</span>
                    <span>{l.subjectName ? `${l.subjectName} — ` : ''}{l.topic || 'Sem tema registrado'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}

      {/* Comunicados */}
      {data.communications.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Megaphone className="h-4 w-4 text-muted-foreground" />
            Comunicados recentes
          </h2>
          {data.communications.map((c, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <p className="font-medium">{c.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </section>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Portal gerado pelo Edu On Way. Para dúvidas, entre em contato com a escola.
      </p>
    </main>
  );
}
