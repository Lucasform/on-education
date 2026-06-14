import { listAllStudents } from '@on-education/module-nucleo';

import { db } from '@/server/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Alunos · Admin' };

export default async function AdminAlunosPage() {
  const alunos = await Promise.race([
    listAllStudents(db()).catch(() => []),
    new Promise<Awaited<ReturnType<typeof listAllStudents>>>((r) => setTimeout(() => r([]), 7000)),
  ]);

  return (
    <>
      <a href="/admin" className="text-xs text-primary underline-offset-4 hover:underline">
        ← Voltar para a visão geral
      </a>
      <h1 className="text-2xl font-semibold tracking-tight">Alunos ({alunos.length})</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Todos os alunos de todas as contas, com a turma e a conta de origem.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Turma</th>
              <th className="px-4 py-2 font-medium">Conta</th>
            </tr>
          </thead>
          <tbody>
            {alunos.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum aluno.
                </td>
              </tr>
            ) : (
              alunos.map((a) => (
                <tr key={a.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 font-medium">{a.fullName}</td>
                  <td className="px-4 py-2 text-muted-foreground">{a.className ?? '—'}</td>
                  <td className="px-4 py-2">
                    <a
                      href={`/admin/contas/${a.tenantId}`}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {a.tenantName}
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
