import { getWhatsappConnection, isEntitled, listGuardians, listInvoices } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { UpgradeGate } from '@/components/upgrade-gate';

import { cardClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { hojeISO } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { cobrarInadimplenteWhatsappAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Inadimplência · Edu On Way' };

const reais = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function diasAtraso(dataISO: string, hoje: string): number {
  const ms = new Date(hoje).getTime() - new Date(dataISO).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export default async function InadimplenciaPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');

  const client = db();
  if (!await isEntitled(client, ctx.tenantId, 'finance.institutional')) {
    return <UpgradeGate feature="finance.institutional" tenantType={ctx.tenantType} />;
  }
  const hoje = hojeISO();
  const [todas, responsaveis, wa] = await Promise.all([
    listInvoices(client, ctx).catch(() => []),
    listGuardians(client, ctx).catch(() => []),
    getWhatsappConnection(client, ctx).catch(() => null),
  ]);
  const nomeResp = new Map(responsaveis.map((g) => [g.id, g.fullName]));
  const phoneResp = new Map(responsaveis.map((g) => [g.id, g.phone]));

  // Vencidas = aberto + venc < hoje, agrupadas por responsável.
  const vencidas = todas.filter((c) => c.status === 'aberto' && c.dueDate < hoje);
  const porResp = new Map<string, { total: number; qtd: number; maisAntiga: string }>();
  for (const c of vencidas) {
    const key = c.guardianId ?? 'sem';
    const cur = porResp.get(key) ?? { total: 0, qtd: 0, maisAntiga: c.dueDate };
    cur.total += c.amountCents;
    cur.qtd += 1;
    if (c.dueDate < cur.maisAntiga) cur.maisAntiga = c.dueDate;
    porResp.set(key, cur);
  }
  const linhas = [...porResp.entries()]
    .map(([guardianId, v]) => ({ guardianId, ...v, atraso: diasAtraso(v.maisAntiga, hoje) }))
    .sort((a, b) => b.total - a.total);
  const totalVencido = linhas.reduce((s, l) => s + l.total, 0);

  return (
    <>
      <PageHeader
        title="Inadimplência"
        description="Responsáveis com mensalidades vencidas. Cobre com um toque pelo WhatsApp."
      />

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <div className="text-2xl font-semibold text-danger">{reais(totalVencido)}</div>
          <div className="text-xs text-muted-foreground">Total vencido</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{linhas.length}</div>
          <div className="text-xs text-muted-foreground">Responsáveis</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{vencidas.length}</div>
          <div className="text-xs text-muted-foreground">Cobranças vencidas</div>
        </div>
      </section>

      <div className={`${cardClass} overflow-x-auto p-0`}>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Responsável</th>
              <th className="px-4 py-2 font-medium">Vencido</th>
              <th className="px-4 py-2 font-medium">Cobranças</th>
              <th className="px-4 py-2 font-medium">Atraso</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhuma inadimplência. Tudo em dia. 🎉
                </td>
              </tr>
            )}
            {linhas.map((l) => {
              const phone = l.guardianId !== 'sem' ? phoneResp.get(l.guardianId) : null;
              return (
                <tr key={l.guardianId} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 font-medium">
                    {l.guardianId !== 'sem' ? (nomeResp.get(l.guardianId) ?? 'Responsável') : '—'}
                  </td>
                  <td className="px-4 py-2 font-medium text-danger">{reais(l.total)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{l.qtd}</td>
                  <td className="px-4 py-2 text-muted-foreground">{l.atraso} dia(s)</td>
                  <td className="px-4 py-2 text-right">
                    {wa?.active && phone ? (
                      <form action={cobrarInadimplenteWhatsappAction}>
                        <input type="hidden" name="guardianId" value={l.guardianId} />
                        <SubmitButton type="submit" size="sm" variant="outline">
                          Cobrar no WhatsApp
                        </SubmitButton>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {phone ? 'WhatsApp off' : 'sem telefone'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
