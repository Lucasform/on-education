import { SubmitButton } from '@/components/submit-button';
import { listGuardians, listInvoices, listStudents } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { hojeISO } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import Link from 'next/link';

import {
  createInvoiceAction,
  deleteInvoiceAction,
  generateMonthlyInvoicesAction,
  markInvoicePaidAction,
  reopenInvoiceAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Financeiro · On Way Education' };

const reais = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function Kpi({ label, value, cor }: { label: string; value: string; cor?: string }) {
  return (
    <div className={cardClass}>
      <div className={`text-2xl font-semibold ${cor ?? ''}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

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
  const [todas, responsaveis, alunos] = await Promise.all([
    listInvoices(client, ctx),
    listGuardians(client, ctx),
    listStudents(client, ctx),
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
              <h2 className="mb-1 text-sm font-medium">Gerar mensalidades do mês</h2>
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
    </>
  );
}
