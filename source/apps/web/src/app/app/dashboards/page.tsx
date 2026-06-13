import { isEntitled, listInvoices } from '@on-education/module-nucleo';
import { listAttendance, listGrades } from '@on-education/module-sala-de-aula';
import { redirect } from 'next/navigation';

import { UpgradeGate } from '@/components/upgrade-gate';

import { cardClass, PageHeader } from '@/components/form';
import { TrendChart, type TrendPoint } from '@/components/trend-chart';
import { hojeISO } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboards · Edu On Way' };

const reais = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function Bar({ value, max, tone }: { value: number; max: number; tone: string }) {
  const w = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${w}%` }} />
    </div>
  );
}

export default async function DashboardsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');

  const client = db();
  if (!await isEntitled(client, ctx.tenantId, 'analytics.director')) {
    return <UpgradeGate feature="analytics.director" tenantType={ctx.tenantType} />;
  }
  const hoje = hojeISO();
  const [invoices, grades, presencas] = await Promise.all([
    listInvoices(client, ctx).catch(() => []),
    listGrades(client, ctx).catch(() => []),
    listAttendance(client, ctx).catch(() => []),
  ]);

  // Financeiro
  const aReceber = invoices
    .filter((i) => i.status === 'aberto')
    .reduce((s, i) => s + i.amountCents, 0);
  const vencido = invoices
    .filter((i) => i.status === 'aberto' && i.dueDate < hoje)
    .reduce((s, i) => s + i.amountCents, 0);
  const recebido = invoices
    .filter((i) => i.status === 'pago')
    .reduce((s, i) => s + i.amountCents, 0);
  const inadimplencia = aReceber > 0 ? Math.round((vencido / aReceber) * 100) : 0;

  // Distribuição de notas (faixas) — só notas numéricas (ignora participação/anotação).
  const notas = grades.map((g) => g.value).filter((v): v is number => v !== null);
  const faixas = [
    { label: 'Abaixo de 6', n: notas.filter((v) => v < 6).length, tone: 'bg-danger' },
    { label: '6 a 8', n: notas.filter((v) => v >= 6 && v < 8).length, tone: 'bg-warning' },
    { label: '8 a 10', n: notas.filter((v) => v >= 8).length, tone: 'bg-success' },
  ];
  const maxFaixa = Math.max(1, ...faixas.map((f) => f.n));

  // Frequência geral
  const presentes = presencas.filter((p) => p.present).length;
  const freqGeral = presencas.length > 0 ? Math.round((presentes / presencas.length) * 100) : null;

  // Evolução nos últimos 6 meses (tendência de média e de frequência).
  const MESES = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ];
  const ref = new Date(`${hoje}T00:00:00Z`);
  const buckets: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - i, 1));
    buckets.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      label: MESES[d.getUTCMonth()]!,
    });
  }
  const mesDaData = (s: string) => s.slice(0, 7); // 'YYYY-MM'
  const mediaPorMes: TrendPoint[] = buckets.map((b) => {
    const vals = grades
      .filter((g) => g.value !== null && mesDaData(new Date(g.createdAt).toISOString()) === b.key)
      .map((g) => g.value as number);
    const media = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    return { label: b.label, value: media === null ? null : Math.round(media * 10) / 10 };
  });
  const freqPorMes: TrendPoint[] = buckets.map((b) => {
    const doMes = presencas.filter((p) => mesDaData(p.date) === b.key);
    const pct = doMes.length
      ? Math.round((doMes.filter((p) => p.present).length / doMes.length) * 100)
      : null;
    return { label: b.label, value: pct };
  });
  const temEvolucao =
    mediaPorMes.some((p) => p.value !== null) || freqPorMes.some((p) => p.value !== null);

  return (
    <>
      <PageHeader
        title="Dashboards"
        description="Indicadores consolidados da escola: financeiro, notas e frequência."
      />

      <section className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Financeiro</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xl font-semibold">{reais(aReceber)}</div>
              <div className="text-xs text-muted-foreground">A receber</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-danger">{reais(vencido)}</div>
              <div className="text-xs text-muted-foreground">Vencido</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-success">{reais(recebido)}</div>
              <div className="text-xs text-muted-foreground">Recebido</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Inadimplência: <span className="font-medium text-danger">{inadimplencia}%</span> do a
            receber está vencido.
          </p>
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Frequência geral</h2>
          <div className="text-3xl font-semibold">{freqGeral === null ? '—' : `${freqGeral}%`}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {presencas.length} registros de presença/falta.
          </p>
        </div>
      </section>

      {temEvolucao && (
        <section className="grid gap-5 md:grid-cols-2">
          <div className={cardClass}>
            <h2 className="mb-2 text-sm font-medium">Média da escola (6 meses)</h2>
            <TrendChart points={mediaPorMes} max={10} />
          </div>
          <div className={cardClass}>
            <h2 className="mb-2 text-sm font-medium">Frequência (6 meses)</h2>
            <TrendChart points={freqPorMes} max={100} suffix="%" />
          </div>
        </section>
      )}

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Distribuição de notas ({notas.length})</h2>
        {notas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem notas lançadas ainda.</p>
        ) : (
          <ul className="space-y-3">
            {faixas.map((f) => (
              <li key={f.label} className="text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span>{f.label}</span>
                  <span className="text-muted-foreground">{f.n}</span>
                </div>
                <Bar value={f.n} max={maxFaixa} tone={f.tone} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
