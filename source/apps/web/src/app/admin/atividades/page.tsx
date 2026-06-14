import { listAllActivities } from '@on-education/module-nucleo';

import { db } from '@/server/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Atividades · Admin' };

export default async function AdminAtividadesPage() {
  const atividades = await Promise.race([
    listAllActivities(db()).catch(() => []),
    new Promise<Awaited<ReturnType<typeof listAllActivities>>>((r) => setTimeout(() => r([]), 7000)),
  ]);

  return (
    <>
      <a href="/admin" className="text-xs text-primary underline-offset-4 hover:underline">
        ← Voltar para a visão geral
      </a>
      <h1 className="text-2xl font-semibold tracking-tight">Atividades ({atividades.length})</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Todas as atividades de todas as contas. Clique para abrir o conteúdo completo.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Título</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Disciplina</th>
              <th className="px-4 py-2 font-medium">Conta</th>
              <th className="px-4 py-2 font-medium">Criada</th>
            </tr>
          </thead>
          <tbody>
            {atividades.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhuma atividade.
                </td>
              </tr>
            ) : (
              atividades.map((a) => (
                <tr key={a.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 font-medium">
                    <a
                      href={`/admin/contas/${a.tenantId}/atividade/${a.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {a.title}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{a.kind}</td>
                  <td className="px-4 py-2 text-muted-foreground">{a.subject ?? '—'}</td>
                  <td className="px-4 py-2">
                    <a
                      href={`/admin/contas/${a.tenantId}`}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {a.tenantName}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString('pt-BR')}
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
