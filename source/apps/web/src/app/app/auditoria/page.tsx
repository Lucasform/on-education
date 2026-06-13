import { isEntitled, listAudit } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { UpgradeGate } from '@/components/upgrade-gate';

import { cardClass, PageHeader, tableWrapClass } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Auditoria · Edu On Way' };

const ACTION_LABEL: Record<string, string> = {
  'grade.record': 'Nota lançada/alterada',
  'student.delete': 'Aluno excluído',
  'class.delete': 'Turma excluída',
  'invoice.paid': 'Mensalidade baixada',
  'invoice.delete': 'Mensalidade excluída',
};

function fmtDate(d: Date): string {
  const iso = new Date(d).toISOString();
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)} ${iso.slice(11, 16)}`;
}

export default async function AuditoriaPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const client = db();
  if (!await isEntitled(client, ctx.tenantId, 'analytics.director')) {
    return <UpgradeGate feature="analytics.director" tenantType={ctx.tenantType} />;
  }
  const eventos = await listAudit(client, ctx, 200).catch(() => []);

  return (
    <>
      <PageHeader
        title="Auditoria"
        description="Registro das operações sensíveis (notas, exclusões, financeiro). Mais recentes primeiro."
      />
      <div className={cardClass}>
        {eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
        ) : (
          <div className={tableWrapClass}>
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-4 font-medium">Quando</th>
                  <th className="py-1.5 pr-4 font-medium">Ação</th>
                  <th className="py-1.5 font-medium">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 last:border-0">
                    <td className="whitespace-nowrap py-1.5 pr-4 text-muted-foreground">
                      {fmtDate(e.createdAt)}
                    </td>
                    <td className="py-1.5 pr-4">{ACTION_LABEL[e.action] ?? e.action}</td>
                    <td className="py-1.5 text-xs text-muted-foreground">
                      {e.metadata ? JSON.stringify(e.metadata) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
