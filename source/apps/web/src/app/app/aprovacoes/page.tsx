import { isGestao, listApprovals } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { CopyLink } from '@/components/copy-link';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { criarAprovacaoAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Aprovações · Edu On Way' };

const KIND_LABEL: Record<string, string> = {
  despesa: 'Despesa',
  saida: 'Autorização de saída',
  outro: 'Aprovação',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando',
  approved: 'Aprovado',
  rejected: 'Recusado',
};
const STATUS_CLS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-600',
  approved: 'bg-emerald-500/15 text-emerald-600',
  rejected: 'bg-red-500/15 text-red-600',
};

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function AprovacoesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization' || !isGestao(ctx)) redirect('/app');

  const pedidos = await listApprovals(db(), ctx).catch(
    () => [] as Awaited<ReturnType<typeof listApprovals>>,
  );

  return (
    <>
      <PageHeader
        title="Aprovações por link"
        description="Crie um pedido (despesa, autorização de saída) e envie o link; a pessoa aprova pelo celular, sem login."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <form action={criarAprovacaoAction} className={`${cardClass} flex flex-col gap-3`}>
          <h2 className="text-sm font-medium">Novo pedido</h2>
          <select name="kind" defaultValue="despesa" className={fieldClass}>
            <option value="despesa">Despesa</option>
            <option value="saida">Autorização de saída</option>
            <option value="outro">Outro</option>
          </select>
          <input name="title" required placeholder="Título (ex.: Compra de material)" className={fieldClass} />
          <textarea name="detail" rows={3} placeholder="Detalhes (opcional)" className={`${fieldClass} resize-none`} />
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="Valor em R$ (opcional)"
            className={fieldClass}
          />
          <SubmitButton type="submit">Criar e gerar link</SubmitButton>
        </form>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Pedidos ({pedidos.length})</h2>
          {pedidos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>
          ) : (
            <ul className="space-y-3">
              {pedidos.map((p) => (
                <li key={p.id} className="rounded-lg border border-border p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{p.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[p.status] ?? 'bg-muted'}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {KIND_LABEL[p.kind] ?? p.kind}
                    {p.amountCents != null ? ` · ${brl(p.amountCents)}` : ''}
                    {p.decidedByName ? ` · por ${p.decidedByName}` : ''}
                  </div>
                  {p.status === 'pending' && (
                    <div className="mt-2">
                      <p className="mb-1 text-[11px] text-muted-foreground">
                        Link para o aprovador (envie por WhatsApp ou e-mail):
                      </p>
                      <CopyLink path={`/aprovar/${p.token}`} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
