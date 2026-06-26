import { SubmitButton } from '@/components/submit-button';
import { listInvitations } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { CopyLink } from '@/components/copy-link';
import { inviteStatusLabel, roleLabel, STAFF_ROLES } from '@/lib/roles';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { inviteMemberAction } from '../../actions';
import { createMemberDirectAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Convites e membros · Edu On Way' };

export default async function ConvitesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const convites = await listInvitations(db(), ctx).catch(() => [] as Awaited<ReturnType<typeof listInvitations>>);

  return (
    <>
      <PageHeader
        title="Convites e membros"
        description="Convide professores por e-mail ou cadastre diretamente com senha."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {/* Lista de convites enviados */}
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Convites enviados ({convites.length})</h2>
          {convites.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum convite ainda.</p>
          ) : (
            <ul className="space-y-3">
              {convites.map((c) => (
                <li key={c.id} className="rounded-lg border border-border p-2.5">
                  <div className="flex flex-wrap items-center gap-x-2 text-sm">
                    <span className="font-medium">{c.email}</span>
                    <span className="text-xs text-muted-foreground">
                      · {roleLabel(c.role)} · {inviteStatusLabel(c.status)}
                    </span>
                  </div>
                  {c.status === 'pending' && (
                    <div className="mt-2">
                      <p className="mb-1 text-[11px] text-muted-foreground">
                        Link para a pessoa criar a senha (envie por WhatsApp ou e-mail):
                      </p>
                      <CopyLink path={`/convite/${c.token}`} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Convite por e-mail (fluxo existente) */}
        <div className={cardClass}>
          <h2 className="mb-1 text-sm font-medium">Convidar por e-mail</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            O convidado recebe um link para criar a própria conta.
          </p>
          <form action={inviteMemberAction} className="flex flex-col gap-2">
            <input
              name="email"
              type="email"
              required
              placeholder="E-mail do convidado"
              className={fieldClass}
            />
            <select name="role" className={fieldClass} defaultValue="teacher">
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
            <SubmitButton type="submit" size="sm">
              Convidar
            </SubmitButton>
          </form>
        </div>

        {/* Cadastro direto com senha */}
        <div className={`${cardClass} md:col-span-2`}>
          <h2 className="mb-1 text-sm font-medium">Cadastrar membro com senha</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Cria a conta imediatamente. O membro deverá trocar a senha no primeiro acesso.
          </p>
          <form action={createMemberDirectAction} className="grid gap-2 sm:grid-cols-4">
            <input
              name="name"
              placeholder="Nome completo"
              className={fieldClass}
            />
            <input
              name="email"
              type="email"
              required
              placeholder="E-mail"
              className={fieldClass}
            />
            <input
              name="password"
              type="text"
              required
              minLength={6}
              placeholder="Senha temporária (mín. 6 car.)"
              className={fieldClass}
            />
            <select name="role" className={fieldClass} defaultValue="teacher">
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
            <div className="sm:col-span-4">
              <SubmitButton type="submit" size="sm">
                Criar conta e adicionar à equipe
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
