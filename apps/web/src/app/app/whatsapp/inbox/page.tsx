import { listConversations } from '@on-education/module-nucleo';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AutoRefresh } from '@/components/auto-refresh';
import { cardClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Inbox WhatsApp · Edu On Way' };

export default async function InboxPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const conversas = await listConversations(db(), ctx).catch(() => []);

  return (
    <>
      <AutoRefresh seconds={12} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Inbox do WhatsApp"
          description="Conversas recebidas no número conectado."
        />
        <Link
          href="/app/whatsapp"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Conexão
        </Link>
      </div>

      <div className={cardClass}>
        {conversas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma conversa ainda. Quando alguém enviar mensagem para o número conectado, aparece
            aqui.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {conversas.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/app/whatsapp/inbox/${c.id}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{c.contactName || c.phone}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.lastMessage}
                    </span>
                  </span>
                  {c.unread > 0 && (
                    <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                      {c.unread}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
