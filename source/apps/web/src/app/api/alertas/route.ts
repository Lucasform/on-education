import { countPendingDrafts } from '@on-education/module-ia';
import { isGestao, listWorkRequests } from '@on-education/module-nucleo';

import { listAtRiskStudents } from '@/server/at-risk';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

type Alerta = { label: string; href: string; count: number; tone: 'info' | 'warn' };

/**
 * Sino de alertas: calcula em tempo real (sem tabela, sem cron) o que precisa de atenção agora,
 * a partir de dados que já existem. Cada alerta só aparece se houver algo (count > 0).
 */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return Response.json({ alertas: [] as Alerta[] });
  const client = db();
  const alertas: Alerta[] = [];

  // Rascunhos do WayOn aguardando revisão (vale para professor e escola).
  const drafts = await countPendingDrafts(client, ctx).catch(() => 0);
  if (drafts > 0) {
    alertas.push({ label: 'Rascunhos do WayOn para revisar', href: '/app/ia', count: drafts, tone: 'info' });
  }

  // Itens da escola (organization + gestão).
  if (ctx.tenantType === 'organization' && isGestao(ctx)) {
    const [risco, solicitacoes] = await Promise.all([
      listAtRiskStudents(client, ctx)
        .then((r) => r.length)
        .catch(() => 0),
      listWorkRequests(client, ctx)
        .then((r) => r.filter((s) => s.status === 'enviada').length)
        .catch(() => 0),
    ]);
    if (risco > 0) {
      alertas.push({ label: 'Alunos em risco', href: '/app/risco', count: risco, tone: 'warn' });
    }
    if (solicitacoes > 0) {
      alertas.push({
        label: 'Solicitações no painel de trabalho',
        href: '/app/painel',
        count: solicitacoes,
        tone: 'info',
      });
    }
  }

  return Response.json({ alertas, total: alertas.reduce((s, a) => s + a.count, 0) });
}
