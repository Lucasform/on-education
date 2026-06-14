import { listAllClasses } from '@on-education/module-nucleo';

import { db } from '@/server/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Turmas · Admin' };

export default async function AdminTurmasPage() {
  const turmas = await Promise.race([
    listAllClasses(db()).catch(() => []),
    new Promise<Awaited<ReturnType<typeof listAllClasses>>>((r) => setTimeout(() => r([]), 7000)),
  ]);

  return (
    <>
      <a href="/admin" className="text-xs text-primary underline-offset-4 hover:underline">
        ← Voltar para a visão geral
      </a>
      <h1 className="text-2xl font-semibold tracking-tight">Turmas ({turmas.length})</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Todas as turmas de todas as contas, com a contagem de alunos.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Turma</th>
              <th className="px-4 py-2 font-medium">Série</th>
              <th className="px-4 py-2 font-medium">Alunos</th>
              <th className="px-4 py-2 font-medium">Conta</th>
            </tr>
          </thead>
          <tbody>
            {turmas.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhuma turma.
                </td>
              </tr>
            ) : (
              turmas.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.gradeLevel ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.students}</td>
                  <td className="px-4 py-2">
                    <a
                      href={`/admin/contas/${c.tenantId}`}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {c.tenantName}
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
