import { listCollective } from '@on-education/module-pedagogico';

import { BulkCheckbox, BulkDeleteForm } from '@/components/bulk-delete-form';
import { db } from '@/server/db';

import { bulkDeleteCollectiveAdminAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Banco coletivo · Admin' };

const ROTULO: Record<string, string> = {
  EI: 'Ed. Infantil',
  EF1: 'Fund. I',
  EF2: 'Fund. II',
  EM: 'Ensino Médio',
  outro: 'Outro',
};

export default async function AdminColetivoPage() {
  const itens = await listCollective(db()).catch(() => []);

  return (
    <>
      <a href="/admin" className="text-xs text-primary underline-offset-4 hover:underline">
        ← Voltar para a visão geral
      </a>
      <h1 className="text-2xl font-semibold tracking-tight">Banco coletivo ({itens.length})</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Atividades compartilhadas por todos os professores. Selecione para excluir.
      </p>

      <div className="mt-4">
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada compartilhado ainda.</p>
        ) : (
          <BulkDeleteForm action={bulkDeleteCollectiveAdminAction} itemLabel="itens">
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="w-10 px-4 py-2"></th>
                    <th className="px-4 py-2 font-medium">Título</th>
                    <th className="px-4 py-2 font-medium">Faixa</th>
                    <th className="px-4 py-2 font-medium">Matéria</th>
                    <th className="px-4 py-2 font-medium">Criado</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((c) => (
                    <tr key={c.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2">
                        <BulkCheckbox value={c.id} />
                      </td>
                      <td className="px-4 py-2 font-medium">{c.title}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {ROTULO[c.ageRange ?? 'outro'] ?? c.ageRange}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{c.subject ?? '—'}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BulkDeleteForm>
        )}
      </div>
    </>
  );
}
