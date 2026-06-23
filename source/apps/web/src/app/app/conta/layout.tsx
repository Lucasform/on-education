import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/form';
import { TabNav, type TabItem } from '@/components/tab-nav';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Casca da área "Meu perfil" com abas (Perfil · Acesso & segurança · Notificações · Conta). */
export default async function ContaLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const individual = ctx.tenantType === 'individual';

  const tabs: TabItem[] = [
    ...(individual ? [{ href: '/app/conta/perfil', label: 'Perfil' }] : []),
    { href: '/app/conta/seguranca', label: 'Acesso & segurança', match: ['/app/conta/mfa'] },
    { href: '/app/conta/notificacoes', label: 'Notificações' },
    ...(individual ? [{ href: '/app/conta/configuracoes', label: 'Conta' }] : []),
  ];

  return (
    <>
      <PageHeader title="Meu perfil" description="Seus dados, contato e segurança." />
      <TabNav tabs={tabs} />
      {children}
    </>
  );
}
