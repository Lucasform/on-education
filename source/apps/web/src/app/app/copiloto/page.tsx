import { isAiConfigured } from '@on-education/module-ia';
import {
  canSeeFinanceValues,
  getFinanceSummary,
  listClasses,
  listStudents,
} from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { CopilotoChat } from '@/components/copiloto-chat';
import { cardClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { listAtRiskStudents } from '@/server/at-risk';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Copiloto da escola · Edu On Way' };

function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default async function CopilotoPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');

  const client = db();
  const aiOn = isAiConfigured();

  const [alunos, turmas, risco, financeiro] = await Promise.all([
    listStudents(client, ctx).catch(() => []),
    listClasses(client, ctx).catch(() => []),
    listAtRiskStudents(client, ctx).catch(() => []),
    // Field-level security: financeiro só entra no contexto para quem responde pela tesouraria.
    (canSeeFinanceValues(ctx) ? getFinanceSummary(client, ctx) : Promise.resolve(null)).catch(
      () => null,
    ),
  ]);

  // Snapshot agregado — sem PII, sem nomes, sem dados pessoais
  const linhasSnapshot: string[] = [
    `Alunos ativos: ${alunos.length}`,
    `Turmas ativas: ${turmas.length}`,
    `Alunos em risco (media baixa ou frequencia abaixo de 75%): ${risco.length}`,
  ];

  if (financeiro) {
    linhasSnapshot.push(
      `Receitas pagas no mes: ${formatBRL(financeiro.receitasPagas)}`,
      `Despesas pagas no mes: ${formatBRL(financeiro.despesasPagas)}`,
      `Resultado do mes (receitas - despesas): ${formatBRL(financeiro.resultado)}`,
      `A receber (mensalidades em aberto): ${formatBRL(financeiro.aReceber)}`,
      `A pagar (despesas em aberto): ${formatBRL(financeiro.aPagar)}`,
    );
  } else {
    linhasSnapshot.push('Dados financeiros: nao disponivel');
  }

  const snapshot = linhasSnapshot.join('\n');

  return (
    <>
      <PageHeader
        title="Copiloto da escola"
        description="Pergunte sobre alunos, turmas e financeiro em linguagem natural. Somente dados agregados, sem informacoes pessoais."
      />

      {/* Painel de snapshot */}
      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Resumo atual da escola</h2>
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-muted px-3 py-2">
            <dt className="text-xs text-muted-foreground">Alunos</dt>
            <dd className="mt-0.5 text-lg font-semibold">{alunos.length}</dd>
          </div>
          <div className="rounded-lg bg-muted px-3 py-2">
            <dt className="text-xs text-muted-foreground">Turmas</dt>
            <dd className="mt-0.5 text-lg font-semibold">{turmas.length}</dd>
          </div>
          <div className="rounded-lg bg-muted px-3 py-2">
            <dt className="text-xs text-muted-foreground">Em risco</dt>
            <dd
              className={`mt-0.5 text-lg font-semibold ${risco.length > 0 ? 'text-warning' : ''}`}
            >
              {risco.length}
            </dd>
          </div>
          {financeiro && (
            <div className="rounded-lg bg-muted px-3 py-2">
              <dt className="text-xs text-muted-foreground">A receber</dt>
              <dd className="mt-0.5 text-lg font-semibold">{formatBRL(financeiro.aReceber)}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Chat ou aviso de IA desligada */}
      {aiOn ? (
        <CopilotoChat snapshot={snapshot} />
      ) : (
        <div className={cardClass}>
          <p className="text-sm text-muted-foreground">
            O Copiloto esta indisponivel. Configure{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">ANTHROPIC_API_KEY</code> ou a
            integracao de IA do tenant para ativar.
          </p>
        </div>
      )}
    </>
  );
}
