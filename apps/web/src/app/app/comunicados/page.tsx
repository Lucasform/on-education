import { SubmitButton } from '@/components/submit-button';
import { isAiConfigured } from '@on-education/module-ia';
import { listCommunications } from '@on-education/module-comunicacao';
import { getWhatsappConnection } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  broadcastComunicadoWhatsappAction,
  createCommunicationAction,
  deleteCommunicationAction,
  generateCommunicationAction,
  publishCommunicationAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Comunicados · Edu On Way' };

export default async function ComunicadosPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const comunicados = await listCommunications(db(), ctx);
  const aiOn = isAiConfigured();
  const wa = await getWhatsappConnection(db(), ctx).catch(() => null);

  return (
    <>
      <PageHeader title="Comunicados" description="Escreva ou gere comunicados e publique." />

      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Novo comunicado</h2>
          <form action={createCommunicationAction} className="flex flex-col gap-2">
            <input name="title" required placeholder="Título" className={fieldClass} />
            <textarea
              name="body"
              rows={5}
              placeholder="Texto do comunicado"
              className={fieldClass}
            />
            <SubmitButton type="submit" size="sm">
              Salvar rascunho
            </SubmitButton>
          </form>
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Gerar com o WayOn</h2>
          {aiOn ? (
            <form action={generateCommunicationAction} className="flex flex-col gap-2">
              <textarea
                name="prompt"
                required
                rows={5}
                placeholder="Descreva o comunicado (ex.: reunião de pais dia 20/06 às 19h no auditório)"
                className={fieldClass}
              />
              <SubmitButton type="submit" size="sm">
                Gerar rascunho
              </SubmitButton>
            </form>
          ) : (
            <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
              WayOn indisponível. Configure <code>ANTHROPIC_API_KEY</code> para gerar comunicados.
            </p>
          )}
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Comunicados ({comunicados.length})</h2>
        {comunicados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum comunicado ainda.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {comunicados.map((c) => (
              <li key={c.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {c.title}{' '}
                    <span className="text-muted-foreground">
                      · {c.status === 'published' ? 'publicado' : 'rascunho'}
                      {c.aiGenerated ? ' · WayOn' : ''}
                    </span>
                  </span>
                  <span className="flex gap-2">
                    {c.status !== 'published' && (
                      <form action={publishCommunicationAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <SubmitButton type="submit" size="sm">
                          Publicar
                        </SubmitButton>
                      </form>
                    )}
                    {wa?.active && c.status === 'published' && (
                      <form action={broadcastComunicadoWhatsappAction}>
                        <input type="hidden" name="title" value={c.title} />
                        <input type="hidden" name="body" value={c.body ?? ''} />
                        <ConfirmButton
                          size="sm"
                          variant="outline"
                          message="Enviar este comunicado no WhatsApp para TODOS os responsáveis com telefone? Envio em LOTE pode levar a bloqueio/ban do número pela Meta. Use com moderação."
                        >
                          WhatsApp a todos
                        </ConfirmButton>
                      </form>
                    )}
                    <form action={deleteCommunicationAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmButton
                        size="sm"
                        variant="outline"
                        message={`Excluir o comunicado "${c.title}"? Vai para a Lixeira.`}
                      >
                        Excluir
                      </ConfirmButton>
                    </form>
                  </span>
                </div>
                {c.body && (
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{c.body}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
