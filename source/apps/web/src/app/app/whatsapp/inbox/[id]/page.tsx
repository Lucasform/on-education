import {
  getConversation,
  listConversationMessages,
  markConversationRead,
} from '@on-education/module-nucleo';
import { notFound, redirect } from 'next/navigation';

import { AutoRefresh } from '@/components/auto-refresh';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { replyWhatsappAction } from '../../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Conversa · Edu On Way' };

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const conv = await getConversation(db(), ctx, id);
  if (!conv) notFound();
  const mensagens = await listConversationMessages(db(), ctx, id).catch(() => []);
  // Abrir a conversa marca como lida.
  await markConversationRead(db(), ctx, id).catch(() => {});

  return (
    <>
      <AutoRefresh seconds={8} />
      <PageHeader
        title={conv.contactName || conv.phone}
        back={{ href: '/app/whatsapp/inbox', label: 'Voltar para o inbox' }}
      />

      <div className={`${cardClass} flex max-h-[55vh] flex-col gap-2 overflow-y-auto`}>
        {mensagens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem mensagens.</p>
        ) : (
          mensagens.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                m.direction === 'out'
                  ? 'self-end bg-primary text-white'
                  : 'self-start bg-muted text-foreground'
              }`}
            >
              {m.body}
            </div>
          ))
        )}
      </div>

      <form action={replyWhatsappAction} className={`${cardClass} flex flex-col gap-2`}>
        <input type="hidden" name="conversationId" value={conv.id} />
        <textarea name="body" rows={2} required placeholder="Responder…" className={fieldClass} />
        <div>
          <SubmitButton type="submit" size="sm">
            Enviar
          </SubmitButton>
        </div>
      </form>
    </>
  );
}
