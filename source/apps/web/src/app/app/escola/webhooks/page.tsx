import { SubmitButton } from '@/components/submit-button';
import { isEntitled, listWebhookEndpoints } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { UpgradeGate } from '@/components/upgrade-gate';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  createWebhookEndpointAction,
  deleteWebhookEndpointAction,
  toggleWebhookEndpointAction,
} from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notificações (webhooks) · Edu On Way' };

const EVENTOS_DISPONIVEIS = [
  { value: 'student.created', label: 'Aluno criado' },
  { value: 'grade.posted', label: 'Nota lancada' },
  { value: 'attendance.recorded', label: 'Frequencia registrada' },
  { value: 'payment.received', label: 'Pagamento recebido' },
  { value: 'occurrence.created', label: 'Ocorrencia registrada' },
];

export default async function WebhooksPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  if (!(await isEntitled(db(), ctx.tenantId, 'integrations.api'))) {
    return (
      <>
        <PageHeader
          title="Notificações (webhooks)"
          description="Avise sistemas externos automaticamente quando algo acontece na escola."
        />
        <UpgradeGate feature="integrations.api" tenantType={ctx.tenantType} />
      </>
    );
  }
  const endpoints = await listWebhookEndpoints(db(), ctx).catch(() => []);

  return (
    <>
      <PageHeader
        title="Notificações (webhooks)"
        description="Avise sistemas externos automaticamente quando algo acontece na escola."
      />

      <div className={cardClass}>
        <h2 className="mb-2 text-sm font-medium">O que é</h2>
        <p className="text-sm text-muted-foreground">
          Um webhook é um aviso automático: quando algo acontece na escola (uma matrícula, uma
          nota lançada, um pagamento recebido), a plataforma envia uma mensagem na hora para o
          endereço (URL) de outro sistema seu. É o caminho inverso da API: em vez de o outro
          sistema perguntar, a plataforma avisa sozinha.
        </p>
        <h2 className="mb-2 mt-4 text-sm font-medium">Como funciona</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Você cadastra a URL do seu sistema e escolhe quais eventos quer receber.</li>
          <li>Quando um desses eventos ocorre, enviamos os dados dele para a sua URL.</li>
          <li>
            O segredo HMAC (opcional) permite ao seu sistema confirmar que a mensagem veio
            mesmo da plataforma, e não de um impostor.
          </li>
          <li>Pode pausar (Ativo/Inativo) ou excluir um endpoint quando quiser.</li>
        </ol>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Endpoints ({endpoints.length})</h2>
          {endpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum webhook configurado.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {endpoints.map((e) => (
                <li key={e.id} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs">{e.url}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {e.events.map((ev) => (
                          <span
                            key={ev}
                            className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <form action={toggleWebhookEndpointAction}>
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="active" value={e.active ? 'false' : 'true'} />
                        <button
                          type="submit"
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            e.active
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {e.active ? 'Ativo' : 'Inativo'}
                        </button>
                      </form>
                      <form action={deleteWebhookEndpointAction}>
                        <input type="hidden" name="id" value={e.id} />
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          message="Excluir este webhook?"
                        >
                          Excluir
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Novo endpoint</h2>
          <form action={createWebhookEndpointAction} className="flex flex-col gap-3">
            <input
              name="url"
              type="url"
              required
              placeholder="https://seu-sistema.com/webhook"
              className={fieldClass}
            />
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Eventos a notificar</p>
              <div className="flex flex-col gap-1">
                {EVENTOS_DISPONIVEIS.map((ev) => (
                  <label key={ev.value} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="events" value={ev.value} />
                    {ev.label}
                  </label>
                ))}
              </div>
            </div>
            <input
              name="secret"
              placeholder="Secret HMAC (opcional)"
              className={fieldClass}
            />
            <SubmitButton type="submit" size="sm">
              Adicionar webhook
            </SubmitButton>
          </form>
        </div>
      </div>
    </>
  );
}
