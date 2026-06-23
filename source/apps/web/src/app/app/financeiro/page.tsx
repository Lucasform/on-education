import { KpiCard as Kpi } from '@/components/kpi-card';
import { SubmitButton } from '@/components/submit-button';
import {
  getFinanceSummary,
  isEntitled,
  listExpenses,
  listGuardians,
  listInvoices,
  listStudents,
} from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { UpgradeGate } from '@/components/upgrade-gate';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { TabPanel, Tabs } from '@/components/section-tabs';
import { hojeISO } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import Link from 'next/link';

import {
  createExpenseAction,
  createInvoiceAction,
  deleteExpenseAction,
  deleteInvoiceAction,
  generateMonthlyInvoicesAction,
  markExpensePaidAction,
  markInvoicePaidAction,
  reopenInvoiceAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Financeiro · Edu On Way' };

const reais = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ resp?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');

  const { resp } = await searchParams;
  const client = db();
  if (!await isEntitled(client, ctx.tenantId, 'finance.institutional')) {
    return <UpgradeGate feature="finance.institutional" tenantType={ctx.tenantType} />;
  }
  const [todas, responsaveis, alunos, despesas, resumo] = await Promise.all([
    listInvoices(client, ctx).catch(() => []),
    listGuardians(client, ctx).catch(() => []),
    listStudents(client, ctx).catch(() => []),
    listExpenses(client, ctx).catch(() => []),
    getFinanceSummary(client, ctx).catch(() => null),
  ]);
  const nomeResp = new Map(responsaveis.map((g) => [g.id, g.fullName]));
  const nomeAluno = new Map(alunos.map((a) => [a.id, a.fullName]));
  const hoje = hojeISO();

  // Extrato por responsável (item 5.1.1): filtra as cobranças do responsável escolhido.
  const cobrancas = resp ? todas.filter((c) => c.guardianId === resp) : todas;

  // Totais: aberto (a receber), vencido (aberto + venc < hoje), pago.
  const aReceber = cobrancas
    .filter((c) => c.status === 'aberto')
    .reduce((s, c) => s + c.amountCents, 0);
  const vencido = cobrancas
    .filter((c) => c.status === 'aberto' && c.dueDate < hoje)
    .reduce((s, c) => s + c.amountCents, 0);
  const recebido = cobrancas
    .filter((c) => c.status === 'pago')
    .reduce((s, c) => s + c.amountCents, 0);

  const situacao = (c: (typeof cobrancas)[number]) => {
    if (c.status === 'pago') return { txt: 'Pago', cls: 'bg-emerald-500/10 text-emerald-500' };
    if (c.status === 'cancelado')
      return { txt: 'Cancelado', cls: 'bg-muted text-muted-foreground' };
    if (c.dueDate < hoje) return { txt: 'Vencido', cls: 'bg-red-500/10 text-red-500' };
    return { txt: 'Em aberto', cls: 'bg-amber-500/10 text-amber-500' };
  };

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Mensalidades e cobranças por aluno/responsável. Controle interno (boleto/PIX virá depois)."
      />
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label={resp ? 'A receber (resp.)' : 'A receber'} value={reais(aReceber)} />
        <Kpi label="Vencido" value={reais(vencido)} cor="text-red-500" />
        <Kpi label="Recebido" value={reais(recebido)} cor="text-emerald-500" />
        <Kpi label="Cobranças" value={String(cobrancas.length)} />
      </section>

      <Tabs
        tabs={[
          { id: 'cobrancas', label: 'Cobranças' },
          { id: 'despesas', label: 'Despesas' },
          { id: 'resumo', label: 'Resumo (fluxo e DRE)' },
        ]}
      >
        <TabPanel id="resumo">
          {/* Resumo: fluxo de caixa e DRE simples */}
          {resumo && (
        <section className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Resumo financeiro (fluxo de caixa e DRE)</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi label="Receitas (pagas)" value={brl(resumo.receitasPagas)} cor="text-emerald-500" />
            <Kpi label="Despesas (pagas)" value={brl(resumo.despesasPagas)} cor="text-red-500" />
            <Kpi
              label="Resultado"
              value={brl(resumo.resultado)}
              cor={resumo.resultado >= 0 ? 'text-emerald-500' : 'text-red-500'}
            />
            <Kpi label="A receber / a pagar" value={`${brl(resumo.aReceber)} / ${brl(resumo.aPagar)}`} />
          </div>
          {resumo.porMes.length > 0 && (
            <table className="mt-4 w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1.5 font-medium">Mês</th>
                  <th className="py-1.5 text-right font-medium">Receita</th>
                  <th className="py-1.5 text-right font-medium">Despesa</th>
                  <th className="py-1.5 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {resumo.porMes.map((m) => (
                  <tr key={m.competencia} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5">{m.competencia}</td>
                    <td className="py-1.5 text-right text-emerald-500">{brl(m.receita)}</td>
                    <td className="py-1.5 text-right text-red-500">{brl(m.despesa)}</td>
                    <td className={`py-1.5 text-right font-medium ${m.saldo < 0 ? 'text-red-500' : ''}`}>
                      {brl(m.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
          )}
        </TabPanel>

        <TabPanel id="despesas">
      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Despesas ({despesas.length})</h2>
        <form action={createExpenseAction} className="mb-4 flex flex-wrap items-end gap-2">
          <input
            name="description"
            placeholder="Descrição"
            className={`${fieldClass} min-w-[10rem] flex-1`}
          />
          <select name="category" className={fieldClass} defaultValue="outros">
            <option value="pessoal">Pessoal</option>
            <option value="aluguel">Aluguel</option>
            <option value="materiais">Materiais</option>
            <option value="servicos">Serviços</option>
            <option value="impostos">Impostos</option>
            <option value="outros">Outros</option>
          </select>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="Valor"
            className={`${fieldClass} w-28`}
          />
          <input name="competencia" type="month" defaultValue={hoje.slice(0, 7)} className={fieldClass} />
          <select name="status" className={fieldClass} defaultValue="pago">
            <option value="pago">Pago</option>
            <option value="aberto">A pagar</option>
          </select>
          <SubmitButton type="submit" size="sm">
            Adicionar despesa
          </SubmitButton>
        </form>
        {despesas.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1.5 font-medium">Descrição</th>
                <th className="py-1.5 font-medium">Categoria</th>
                <th className="py-1.5 font-medium">Competência</th>
                <th className="py-1.5 text-right font-medium">Valor</th>
                <th className="py-1.5 font-medium">Status</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {despesas.map((e) => (
                <tr key={e.id} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5">{e.description}</td>
                  <td className="py-1.5 capitalize text-muted-foreground">{e.category}</td>
                  <td className="py-1.5 text-muted-foreground">{e.competencia}</td>
                  <td className="py-1.5 text-right">{reais(e.amountCents)}</td>
                  <td className="py-1.5">{e.status === 'pago' ? 'Pago' : 'A pagar'}</td>
                  <td className="py-1.5">
                    <span className="flex justify-end gap-1">
                      {e.status !== 'pago' && (
                        <form action={markExpensePaidAction}>
                          <input type="hidden" name="id" value={e.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-accent"
                          >
                            Pagar
                          </button>
                        </form>
                      )}
                      <form action={deleteExpenseAction}>
                        <input type="hidden" name="id" value={e.id} />
                        <ConfirmButton size="sm" variant="ghost" message="Excluir despesa?">
                          Excluir
                        </ConfirmButton>
                      </form>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
        </TabPanel>

        <TabPanel id="cobrancas">
      {responsaveis.length > 0 && (
        <form method="get" className={`${cardClass} flex flex-wrap items-end gap-3`}>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Extrato por responsável</span>
            <select name="resp" defaultValue={resp ?? ''} className={`${fieldClass} sm:w-64`}>
              <option value="">Todos os responsáveis</option>
              {responsaveis.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.fullName}
                </option>
              ))}
            </select>
          </label>
          <SubmitButton type="submit" size="sm" variant="outline">
            Ver extrato
          </SubmitButton>
          {resp && (
            <Link
              href="/app/financeiro"
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              limpar
            </Link>
          )}
        </form>
      )}

      {responsaveis.length === 0 ? (
        <div className={cardClass}>
          <p className="text-sm text-muted-foreground">
            Cadastre responsáveis primeiro para lançar cobranças.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <div className={`${cardClass} overflow-x-auto p-0`}>
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Descrição</th>
                  <th className="px-4 py-2 font-medium">Responsável</th>
                  <th className="px-4 py-2 font-medium">Venc.</th>
                  <th className="px-4 py-2 font-medium">Valor</th>
                  <th className="px-4 py-2 font-medium">Situação</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {cobrancas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      Nenhuma cobrança lançada.
                    </td>
                  </tr>
                )}
                {cobrancas.map((c) => {
                  const s = situacao(c);
                  return (
                    <tr key={c.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2">
                        <span className="font-medium">{c.description}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.competencia}
                          {c.studentId ? ` · ${nomeAluno.get(c.studentId) ?? 'Aluno'}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {c.guardianId ? (nomeResp.get(c.guardianId) ?? 'Responsável') : '—'}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {c.dueDate.split('-').reverse().join('/')}
                      </td>
                      <td className="px-4 py-2 font-medium">{reais(c.amountCents)}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${s.cls}`}>
                          {s.txt}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          {c.status === 'pago' ? (
                            <form action={reopenInvoiceAction}>
                              <input type="hidden" name="id" value={c.id} />
                              <SubmitButton type="submit" size="sm" variant="ghost">
                                Reabrir
                              </SubmitButton>
                            </form>
                          ) : (
                            <form action={markInvoicePaidAction}>
                              <input type="hidden" name="id" value={c.id} />
                              <SubmitButton type="submit" size="sm">
                                Dar baixa
                              </SubmitButton>
                            </form>
                          )}
                          <form action={deleteInvoiceAction}>
                            <input type="hidden" name="id" value={c.id} />
                            <ConfirmButton
                              size="sm"
                              variant="ghost"
                              message={`Excluir a cobrança "${c.description}"?`}
                            >
                              Excluir
                            </ConfirmButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-5">
            <div className={cardClass}>
              <h2 className="mb-1 text-sm font-medium" data-tour="financeiro-gerar">Gerar mensalidades do mês</h2>
              <p className="mb-2 text-xs text-muted-foreground">
                Cria uma cobrança para cada aluno (no responsável financeiro), pulando quem já tem
                na competência.
              </p>
              <form action={generateMonthlyInvoicesAction} className="flex flex-col gap-2">
                <input
                  name="description"
                  placeholder="Descrição (padrão: Mensalidade)"
                  className={fieldClass}
                />
                <div className="flex gap-2">
                  <input
                    name="competencia"
                    type="month"
                    required
                    defaultValue={hoje.slice(0, 7)}
                    className={fieldClass}
                    aria-label="Competência"
                  />
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Valor R$"
                    className={fieldClass}
                  />
                </div>
                <input
                  name="dueDate"
                  type="date"
                  required
                  defaultValue={hoje}
                  className={fieldClass}
                  aria-label="Vencimento"
                />
                <SubmitButton type="submit" size="sm" variant="outline">
                  Gerar em lote
                </SubmitButton>
              </form>
            </div>

            <div className={cardClass}>
              <h2 className="mb-3 text-sm font-medium">Nova cobrança</h2>
              <form action={createInvoiceAction} className="flex flex-col gap-2">
                <select name="guardianId" required className={fieldClass} defaultValue="">
                  <option value="" disabled>
                    Responsável (pagador)
                  </option>
                  {responsaveis.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.fullName}
                    </option>
                  ))}
                </select>
                <select name="studentId" className={fieldClass} defaultValue="">
                  <option value="">Aluno (opcional)</option>
                  {alunos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.fullName}
                    </option>
                  ))}
                </select>
                <input
                  name="description"
                  required
                  placeholder="Descrição (ex.: Mensalidade)"
                  className={fieldClass}
                />
                <div className="flex gap-2">
                  <input
                    name="competencia"
                    type="month"
                    required
                    defaultValue={hoje.slice(0, 7)}
                    className={fieldClass}
                    aria-label="Competência"
                  />
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Valor R$"
                    className={fieldClass}
                  />
                </div>
                <input
                  name="dueDate"
                  type="date"
                  required
                  defaultValue={hoje}
                  className={fieldClass}
                  aria-label="Vencimento"
                />
                <SubmitButton type="submit" size="sm">
                  Lançar cobrança
                </SubmitButton>
              </form>
            </div>
          </div>
        </div>
      )}
        </TabPanel>
      </Tabs>
    </>
  );
}
