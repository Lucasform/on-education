import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cardClass } from '@/components/form';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Acesso & segurança · Edu On Way' };

const linkBtn =
  'inline-block rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent';

export default async function SegurancaPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  return (
    <div className="flex flex-col gap-5">
      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Senha</h2>
        <p className="mb-3 text-xs text-muted-foreground">Troque a sua senha de acesso.</p>
        <Link href="/app/alterar-senha" className={linkBtn}>
          Alterar senha
        </Link>
      </div>

      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Verificação em duas etapas (2FA)</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Adicione uma camada extra de proteção com um app autenticador (Google Authenticator,
          Authy). Opcional, mas recomendado.
        </p>
        <Link href="/app/conta/mfa" className={linkBtn}>
          Configurar 2FA
        </Link>
      </div>
    </div>
  );
}
