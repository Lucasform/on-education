import { listAllTenants } from '@on-education/module-nucleo';
import { Button } from '@on-education/ui';

import { ConfirmButton } from '@/components/confirm-button';
import { fieldClass } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';

import {
  enterTenantAction,
  purgeTenantAction,
  restoreTenantAction,
  softDeleteTenantAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Contas · Admin' };

export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  const showDeleted = deleted === '1';
  const tenants = await listAllTenants(db(), { includeDeleted: showDeleted }).catch(() => []);
  const lista = showDeleted ? tenants.filter((t) => t.deletedAt) : tenants;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {showDeleted ? 'Lixeira de contas' : 'Contas'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lista.length} {showDeleted ? 'excluída(s)' : 'ativa(s)'}. Entre em qualquer uma para
            usar o app daquela escola.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={showDeleted ? '/admin/contas' : '/admin/contas?deleted=1'}>
            <Button size="sm" variant="ghost">
              {showDeleted ? 'Ver ativas' : 'Ver excluídas'}
            </Button>
          </a>
          <a href="/signup">
            <Button size="sm" variant="outline">
              + Professor
            </Button>
          </a>
          <a href="/signup/escola">
            <Button size="sm" variant="outline">
              + Escola
            </Button>
          </a>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Membros</th>
              <th className="px-4 py-2 font-medium">Alunos</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  {showDeleted ? 'Nenhuma conta excluída.' : 'Nenhuma conta ainda.'}
                </td>
              </tr>
            )}
            {lista.map((t) => (
              <tr key={t.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2 font-medium">
                  {showDeleted ? (
                    t.name
                  ) : (
                    <a href={`/admin/contas/${t.id}`} className="hover:underline">
                      {t.name}
                    </a>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                    {t.tenantType === 'organization' ? '🏫 escola' : '👤 professor'}
                  </span>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{t.members}</td>
                <td className="px-4 py-2 text-muted-foreground">{t.students}</td>
                <td className="px-4 py-2">
                  {showDeleted ? (
                    <div className="flex flex-col items-end gap-2">
                      <form action={restoreTenantAction}>
                        <input type="hidden" name="tenantId" value={t.id} />
                        <SubmitButton type="submit" size="sm" variant="outline">
                          Restaurar
                        </SubmitButton>
                      </form>
                      <form action={purgeTenantAction} className="flex items-center gap-1">
                        <input type="hidden" name="tenantId" value={t.id} />
                        <input type="hidden" name="tenantName" value={t.name} />
                        <input
                          name="confirmName"
                          placeholder={`digite "${t.name}"`}
                          aria-label="Confirmar nome da escola"
                          className={`${fieldClass} h-8 w-40`}
                        />
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          message={`Excluir DEFINITIVAMENTE "${t.name}" e todos os seus dados? Não dá para desfazer.`}
                        >
                          Excluir definitivo
                        </ConfirmButton>
                      </form>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <form action={enterTenantAction}>
                        <input type="hidden" name="tenantId" value={t.id} />
                        <input type="hidden" name="tenantType" value={t.tenantType} />
                        <SubmitButton type="submit" size="sm">
                          Entrar como
                        </SubmitButton>
                      </form>
                      <form action={softDeleteTenantAction}>
                        <input type="hidden" name="tenantId" value={t.id} />
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          message={`Excluir "${t.name}"? Vai para a lixeira e pode ser restaurada.`}
                        >
                          Excluir
                        </ConfirmButton>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
