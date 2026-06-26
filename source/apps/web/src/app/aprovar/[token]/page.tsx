import { decideApproval, getApprovalByToken } from '@on-education/module-nucleo';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Aprovação · Edu On Way' };

const KIND_LABEL: Record<string, string> = {
  despesa: 'Despesa',
  saida: 'Autorização de saída',
  outro: 'Aprovação',
};
const STATUS_LABEL: Record<string, string> = {
  approved: 'Aprovado',
  rejected: 'Recusado',
};

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function decidirAction(formData: FormData): Promise<void> {
  'use server';
  const token = String(formData.get('token') ?? '');
  const decisao = String(formData.get('decisao') ?? '');
  const nome = String(formData.get('nome') ?? '').trim();
  const motivo = String(formData.get('motivo') ?? '').trim();
  if (decisao !== 'approved' && decisao !== 'rejected') redirect(`/aprovar/${token}`);
  await decideApproval(db(), token, decisao, motivo || null, nome || null);
  revalidatePath(`/aprovar/${token}`);
  redirect(`/aprovar/${token}`);
}

export default async function AprovarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pedido = await getApprovalByToken(db(), token).catch(() => null);

  const wrap =
    'min-h-screen flex items-center justify-center bg-background p-4 text-foreground';
  const card = 'w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl';

  if (!pedido) {
    return (
      <div className={wrap}>
        <div className={card}>
          <h1 className="text-lg font-semibold">Pedido não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este link de aprovação é inválido ou foi removido.
          </p>
        </div>
      </div>
    );
  }

  const titulo = KIND_LABEL[pedido.kind] ?? 'Aprovação';

  return (
    <div className={wrap}>
      <div className={card}>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
        <h1 className="mt-1 text-xl font-semibold leading-tight">{pedido.title}</h1>
        {pedido.tenantName && (
          <p className="mt-1 text-sm text-muted-foreground">{pedido.tenantName}</p>
        )}

        <dl className="mt-4 space-y-2 text-sm">
          {pedido.amountCents != null && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Valor</dt>
              <dd className="font-semibold">{brl(pedido.amountCents)}</dd>
            </div>
          )}
          {pedido.requestedByName && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Solicitado por</dt>
              <dd>{pedido.requestedByName}</dd>
            </div>
          )}
        </dl>

        {pedido.detail && (
          <p className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-background/50 p-3 text-sm text-muted-foreground">
            {pedido.detail}
          </p>
        )}

        {pedido.status !== 'pending' ? (
          <div
            className={`mt-5 rounded-lg border p-3 text-sm ${
              pedido.status === 'approved'
                ? 'border-success/40 bg-success/10 text-success'
                : 'border-danger/40 bg-danger/10 text-danger'
            }`}
          >
            <p className="font-medium">{STATUS_LABEL[pedido.status] ?? pedido.status}</p>
            {pedido.decidedByName && <p className="mt-0.5 text-xs">por {pedido.decidedByName}</p>}
            {pedido.decisionReason && (
              <p className="mt-1 text-xs opacity-90">“{pedido.decisionReason}”</p>
            )}
          </div>
        ) : (
          <form action={decidirAction} className="mt-5 flex flex-col gap-3">
            <input type="hidden" name="token" value={token} />
            <input
              name="nome"
              placeholder="Seu nome"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <input
              name="motivo"
              placeholder="Observação (opcional)"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                name="decisao"
                value="approved"
                className="flex-1 rounded-md bg-success px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Aprovar
              </button>
              <button
                type="submit"
                name="decisao"
                value="rejected"
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                Recusar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
