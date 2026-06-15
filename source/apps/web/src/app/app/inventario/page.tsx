import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import { listEquipment, listEquipmentLoans } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import {
  createEquipmentAction,
  createEquipmentLoanAction,
  deleteEquipmentAction,
  returnEquipmentLoanAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Inventário · Edu On Way' };

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

export default async function InventarioPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [equipamentos, emprestimos] = await Promise.all([
    listEquipment(client, ctx).catch(() => []),
    listEquipmentLoans(client, ctx).catch(() => []),
  ]);

  const activeLoanByEquipment = new Map(
    emprestimos
      .filter((l) => l.returnedAt === null)
      .map((l) => [l.equipmentId, l]),
  );

  return (
    <>
      <PageHeader
        title="Inventário de Equipamentos"
        description="Controle de materiais e empréstimos."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Equipamentos ({equipamentos.length})</h2>
          {equipamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {equipamentos.map((eq) => {
                const activeLoan = activeLoanByEquipment.get(eq.id);
                return (
                  <li key={eq.id} className="rounded-md border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{eq.name}</p>
                        {eq.category && (
                          <p className="text-xs text-muted-foreground">{eq.category}</p>
                        )}
                        {eq.serialNumber && (
                          <p className="text-xs text-muted-foreground">S/N: {eq.serialNumber}</p>
                        )}
                        {activeLoan && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Com: {activeLoan.loanedTo}
                            {activeLoan.expectedReturn
                              ? ` · Retorno: ${activeLoan.expectedReturn.split('-').reverse().join('/')}`
                              : ''}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${STATUS_BADGE[eq.status] ?? STATUS_BADGE.available}`}
                      >
                        {STATUS_LABEL[eq.status] ?? eq.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {eq.status === 'available' && (
                        <a
                          href={`/app/inventario/${eq.id}`}
                          className="text-xs text-primary underline-offset-2 hover:underline"
                        >
                          Registrar empréstimo
                        </a>
                      )}
                      {eq.status === 'loaned' && activeLoan && (
                        <form action={returnEquipmentLoanAction}>
                          <input type="hidden" name="loanId" value={activeLoan.id} />
                          <input type="hidden" name="equipmentId" value={eq.id} />
                          <SubmitButton size="sm" variant="outline">
                            Devolver
                          </SubmitButton>
                        </form>
                      )}
                      <form action={deleteEquipmentAction}>
                        <input type="hidden" name="id" value={eq.id} />
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          message={`Excluir "${eq.name}"?`}
                        >
                          Excluir
                        </ConfirmButton>
                      </form>
                    </div>
                    {eq.status === 'available' && (
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Registrar empréstimo rápido
                        </summary>
                        <form
                          action={createEquipmentLoanAction}
                          className="mt-2 flex flex-col gap-2"
                        >
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
                            placeholder="Retorno previsto"
                            className={fieldClass}
                          />
                          <SubmitButton size="sm">Registrar</SubmitButton>
                        </form>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Cadastrar equipamento</h2>
          <form action={createEquipmentAction} className="flex flex-col gap-2">
            <input name="name" required placeholder="Nome do equipamento" className={fieldClass} />
            <select name="category" className={fieldClass}>
              <option value="">Categoria (opcional)</option>
              <option value="Tablet">Tablet</option>
              <option value="Projetor">Projetor</option>
              <option value="Notebook">Notebook</option>
              <option value="Livro">Livro</option>
              <option value="Outro">Outro</option>
            </select>
            <input
              name="serialNumber"
              placeholder="Número de série (opcional)"
              className={fieldClass}
            />
            <textarea
              name="description"
              rows={2}
              placeholder="Descrição (opcional)"
              className={fieldClass}
            />
            <SubmitButton type="submit" size="sm">
              Cadastrar
            </SubmitButton>
          </form>
        </div>
      </div>
    </>
  );
}
