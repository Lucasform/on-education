import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import { listEquipment, listEquipmentLoans } from '@on-education/module-nucleo';
import { notFound, redirect } from 'next/navigation';

import { createEquipmentLoanAction, returnEquipmentLoanAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Equipamento · Edu On Way' };

const STATUS_BADGE: Record<string, string> = {
  available: 'bg-emerald-500/10 text-emerald-500',
  loaned: 'bg-orange-500/10 text-orange-500',
  maintenance: 'bg-amber-500/10 text-amber-500',
};

const STATUS_LABEL: Record<string, string> = {
  available: 'Disponível',
  loaned: 'Emprestado',
  maintenance: 'Manutenção',
};

export default async function EquipamentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [equipamentos, emprestimos] = await Promise.all([
    listEquipment(client, ctx).catch(() => []),
    listEquipmentLoans(client, ctx, id).catch(() => []),
  ]);
  const eq = equipamentos.find((e) => e.id === id);
  if (!eq) notFound();

  const activeLoan = emprestimos.find((l) => l.returnedAt === null);
  const sortedLoans = [...emprestimos].sort(
    (a, b) => new Date(b.loanedAt).getTime() - new Date(a.loanedAt).getTime(),
  );

  return (
    <>
      <PageHeader
        title={eq.name}
        description="Detalhes e histórico de empréstimos."
        back={{ href: '/app/inventario', label: 'Inventário' }}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Informações</h2>
            <dl className="space-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_BADGE[eq.status] ?? STATUS_BADGE.available}`}
                  >
                    {STATUS_LABEL[eq.status] ?? eq.status}
                  </span>
                </dd>
              </div>
              {eq.category && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Categoria</dt>
                  <dd>{eq.category}</dd>
                </div>
              )}
              {eq.serialNumber && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">S/N</dt>
                  <dd>{eq.serialNumber}</dd>
                </div>
              )}
              {eq.description && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Descrição</dt>
                  <dd>{eq.description}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">
              Histórico de empréstimos ({sortedLoans.length})
            </h2>
            {sortedLoans.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum empréstimo registrado.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {sortedLoans.map((loan) => (
                  <li key={loan.id} className="rounded-md border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{loan.loanedTo}</p>
                        <p className="text-xs text-muted-foreground">
                          Saída:{' '}
                          {new Date(loan.loanedAt).toLocaleDateString('pt-BR')}
                          {loan.expectedReturn
                            ? ` · Retorno previsto: ${loan.expectedReturn.split('-').reverse().join('/')}`
                            : ''}
                        </p>
                        {loan.notes && (
                          <p className="mt-1 text-muted-foreground">{loan.notes}</p>
                        )}
                      </div>
                      {loan.returnedAt ? (
                        <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-500">
                          Devolvido
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-500">
                          Em posse
                        </span>
                      )}
                    </div>
                    {loan.returnedAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Devolvido em: {new Date(loan.returnedAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {activeLoan && (
            <div className={cardClass}>
              <h2 className="mb-3 text-sm font-medium">Empréstimo ativo</h2>
              <p className="mb-3 text-sm">
                Este equipamento está com <strong>{activeLoan.loanedTo}</strong> desde{' '}
                {new Date(activeLoan.loanedAt).toLocaleDateString('pt-BR')}.
              </p>
              <form action={returnEquipmentLoanAction}>
                <input type="hidden" name="loanId" value={activeLoan.id} />
                <input type="hidden" name="equipmentId" value={eq.id} />
                <SubmitButton size="sm" variant="outline">
                  Registrar devolução
                </SubmitButton>
              </form>
            </div>
          )}

          {eq.status !== 'loaned' && (
            <div className={cardClass}>
              <h2 className="mb-3 text-sm font-medium">Registrar empréstimo</h2>
              <form action={createEquipmentLoanAction} className="flex flex-col gap-2">
                <input type="hidden" name="equipmentId" value={eq.id} />
                <input
                  name="loanedTo"
                  required
                  placeholder="Emprestado para"
                  className={fieldClass}
                />
                <input
                  name="expectedReturn"
                  type="date"
                  placeholder="Retorno previsto (opcional)"
                  className={fieldClass}
                />
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Observações (opcional)"
                  className={fieldClass}
                />
                <SubmitButton type="submit" size="sm">
                  Registrar empréstimo
                </SubmitButton>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
