import { SubmitButton } from '@/components/submit-button';
import { ROLES } from '@on-education/core';
import { listInvitations } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { inviteMemberAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Convites e membros · Edu On Way' };

export default async function ConvitesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const convites = await listInvitations(db(), ctx);

  return (
    <>
      <PageHeader title="Convites e membros" description="Convide professores e equipe." />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Convites ({convites.length})</h2>
          {convites.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum convite ainda.</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {convites.map((c) => (
                <li key={c.id}>
                  {c.email}{' '}
                  <span className="opacity-60">
                    · {c.role} · {c.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Novo convite</h2>
          <form action={inviteMemberAction} className="flex flex-col gap-2">
            <input
              name="email"
              type="email"
              required
              placeholder="E-mail do convidado"
              className={fieldClass}
            />
            <select name="role" className={fieldClass} defaultValue="teacher">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <SubmitButton type="submit" size="sm">
              Convidar
            </SubmitButton>
          </form>
        </div>
      </div>
    </>
  );
}
