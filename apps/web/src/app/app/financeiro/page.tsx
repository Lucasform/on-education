import { listGuardians, listInvoices, listStudents } from '@on-education/module-nucleo';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { hojeISO } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  createInvoiceAction,
  deleteInvoiceAction,
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

export default async function FinanceiroPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');

  const client = db();
  const [cobrancas, responsaveis, alunos] = await Promise.all([
    listInvoices(client, ctx),
    listGuardians(client, ctx),
    listStudents(client, ctx),
  ]);
  const nomeResp = new Map(responsaveis.map((g) => [g.id, g.fullName]));
  const nomeAluno = new Map(alunos.map((a) => [a.id, a.fullName]));
  const hoje = hojeISO();

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
        <Kpi label="A receber" value={reais(aReceber)} />
        <Kpi label="Vencido" value={reais(vencido)} cor="text-red-500" />
        <Kpi label="Recebido" value={reais(recebido)} cor="text-emerald-500" />
        <Kpi label="Cobranças" value={String(cobrancas.length)} />
      </section>

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
                              <Button type="submit" size="sm" variant="ghost">
                                Reabrir
                              </Button>
                            </form>
                          ) : (
                            <form action={markInvoicePaidAction}>
                              <input type="hidden" name="id" value={c.id} />
                              <Button type="submit" size="sm">
                                Dar baixa
                              </Button>
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
              <Button type="submit" size="sm">
                Lançar cobrança
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
