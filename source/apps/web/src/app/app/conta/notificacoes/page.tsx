import { redirect } from 'next/navigation';

import { cardClass } from '@/components/form';
import { PushToggle } from '@/components/push-toggle';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notificações · Edu On Way' };

export default async function NotificacoesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  return (
    <div className={cardClass}>
      <h2 className="mb-1 text-sm font-medium">Notificações push</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Receba avisos do app neste aparelho. Precisa permitir no navegador; no iPhone, instale o app
        na tela inicial primeiro.
      </p>
      <PushToggle />
    </div>
  );
}
