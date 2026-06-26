import {
  getFinanceSummary,
  isGestao,
  listClasses,
  listStudents,
} from '@on-education/module-nucleo';
import { listCommunications } from '@on-education/module-comunicacao';
import { redirect } from 'next/navigation';

import { KpiCard } from '@/components/kpi-card';
import { PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { listAtRiskStudents } from '@/server/at-risk';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Painel do diretor · Edu On Way' };

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function DiretorPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');

  // Restringe ao perfil de gestão (diretores, coordenadores, proprietários).
  if (!isGestao(ctx)) redirect('/app');

  const client = db();

  const [alunos, turmas, emRisco, comunicados, resumo] = await Promise.all([
    listStudents(client, ctx).catch(() => [] as Awaited<ReturnType<typeof listStudents>>),
    listClasses(client, ctx).catch(() => [] as Awaited<ReturnType<typeof listClasses>>),
    listAtRiskStudents(client, ctx).catch(
      () => [] as Awaited<ReturnType<typeof listAtRiskStudents>>,
    ),
    listCommunications(client, ctx).catch(
      () => [] as Awaited<ReturnType<typeof listCommunications>>,
    ),
    getFinanceSummary(client, ctx).catch(() => null),
  ]);

  // Derivados financeiros a partir de invoices que já estão no resumo.
  const aReceber = resumo?.aReceber ?? null;
  const resultado = resumo?.resultado ?? null;

  // Comunicados: apenas publicados nos últimos 30 dias.
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const comunicadosRecentes = comunicados.filter(
    (c) => c.status === 'published' && c.createdAt >= trintaDiasAtras,
  );

  // Alerta financeiro: vermelho se há vencidos, âmbar se a receber > 0.
  const corAReceber =
    aReceber !== null && aReceber > 0 ? 'text-amber-500' : undefined;
  const corResultado =
    resultado !== null && resultado < 0 ? 'text-red-500' : 'text-emerald-500';
  const corRisco = emRisco.length > 0 ? 'text-amber-500' : undefined;

  return (
    <>
      <PageHeader
        title="Painel do diretor"
        description="Resumo executivo da escola em uma tela. Para detalhes, acesse cada módulo pelo menu lateral."
      />

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {/* KPI 1 — Total de alunos */}
        <KpiCard
          label="Alunos matriculados"
          value={alunos.length}
          href="/app/alunos"
        />

        {/* KPI 2 — Total de turmas */}
        <KpiCard
          label="Turmas ativas"
          value={turmas.length}
          href="/app/turmas"
        />

        {/* KPI 3 — Alunos em risco (âmbar quando > 0) */}
        <KpiCard
          label="Alunos em risco"
          value={emRisco.length}
          cor={corRisco}
          href="/app/risco"
        />

        {/* KPI 4 — Comunicados publicados nos últimos 30 dias */}
        <KpiCard
          label="Comunicados (30 dias)"
          value={comunicadosRecentes.length}
          href="/app/comunicados"
        />

        {/* KPI 5 — A receber (âmbar se há saldo em aberto) */}
        {aReceber !== null && (
          <KpiCard
            label="A receber"
            value={brl(aReceber)}
            cor={corAReceber}
            href="/app/financeiro"
          />
        )}

        {/* KPI 6 — Resultado financeiro (verde/vermelho) */}
        {resultado !== null && (
          <KpiCard
            label="Resultado financeiro"
            value={brl(resultado)}
            cor={corResultado}
            href="/app/financeiro"
          />
        )}
      </section>
    </>
  );
}
