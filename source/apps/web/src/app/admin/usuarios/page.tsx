import { listAllUsers } from '@on-education/module-nucleo';

import { db } from '@/server/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Usuários · Admin' };

const ROLE_LABEL: Record<string, string> = {
  owner: 'Dono',
  director: 'Diretor',
  vice_director: 'Vice-diretor',
  coordinator: 'Coordenador',
  staff_secretary: 'Secretário',
  staff_finance: 'Financeiro',
  teacher: 'Professor',
  monitor: 'Monitor',
  guardian: 'Responsável',
  student: 'Aluno',
};

export default async function AdminUsuariosPage() {
  const usuarios = await Promise.race([
    listAllUsers(db()).catch(() => []),
    new Promise<Awaited<ReturnType<typeof listAllUsers>>>((r) => setTimeout(() => r([]), 7000)),
  ]);

  return (
    <>
      <a href="/admin" className="text-xs text-primary underline-offset-4 hover:underline">
        ← Voltar para a visão geral
      </a>
      <h1 className="text-2xl font-semibold tracking-tight">Usuários ({usuarios.length})</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Todos os membros de todas as contas, com o papel e a conta de origem.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">E-mail</th>
              <th className="px-4 py-2 font-medium">Papel</th>
              <th className="px-4 py-2 font-medium">Conta</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum usuário.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={`${u.tenantId}-${u.userId}`} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 font-medium">{u.name ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.email ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <a
                      href={`/admin/contas/${u.tenantId}`}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {u.tenantName}
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
