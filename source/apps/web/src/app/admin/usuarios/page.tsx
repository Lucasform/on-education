import { listAllUsers } from '@on-education/module-nucleo';

import { ConfirmButton } from '@/components/confirm-button';
import { db } from '@/server/db';
import { isEmailConfigured } from '@/server/email';

import { removeUserAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Usuários · Admin' };

const ROLE_LABEL: Record<string, string> = {
  owner: 'Dono',
  director: 'Diretor',
  vice_director: 'Vice-diretor',
  coordinator: 'Coordenador',
  staff_secretary: 'Secretário',
  staff_finance: 'Financeiro',
  teacher: 'Professor',
  monitor: 'Monitor',
  guardian: 'Responsável',
  student: 'Aluno',
};

export default async function AdminUsuariosPage() {
  const usuarios = await Promise.race([
    listAllUsers(db()).catch(() => []),
    new Promise<Awaited<ReturnType<typeof listAllUsers>>>((r) => setTimeout(() => r([]), 7000)),
  ]);
  const emailOn = isEmailConfigured();

  return (
    <>
      <a href="/admin" className="text-xs text-primary underline-offset-4 hover:underline">
        ← Voltar para a visão geral
      </a>
      <h1 className="text-2xl font-semibold tracking-tight">Usuários ({usuarios.length})</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Todos os membros de todas as contas, com o papel e a conta de origem.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">E-mail</th>
              <th className="px-4 py-2 font-medium">Papel</th>
              <th className="px-4 py-2 font-medium">Conta</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum usuário.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={`${u.tenantId}-${u.userId}`} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 font-medium">{u.name ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.email ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <a
                      href={`/admin/contas/${u.tenantId}`}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {u.tenantName}
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    {u.role === 'owner' ? (
                      <span className="block text-right text-[11px] text-muted-foreground">
                        dono (não removível)
                      </span>
                    ) : (
                      <form
                        action={removeUserAction}
                        className="flex flex-wrap items-center justify-end gap-2"
                      >
                        <input type="hidden" name="tenantId" value={u.tenantId} />
                        <input type="hidden" name="userId" value={u.userId} />
                        <input type="hidden" name="email" value={u.email ?? ''} />
                        <input type="hidden" name="name" value={u.name ?? ''} />
                        <input type="hidden" name="tenantName" value={u.tenantName} />
                        {emailOn && u.email && (
                          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <input type="checkbox" name="notify" className="h-3 w-3" />
                            avisar por e-mail
                          </label>
                        )}
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          message={`Remover o acesso de ${u.name ?? u.email ?? 'este usuário'} a ${u.tenantName}? A conta de login não é apagada; apenas o acesso a esta escola.`}
                        >
                          Excluir
                        </ConfirmButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Excluir remove o acesso do usuário àquela conta (não apaga o login do Supabase, que é
        compartilhado). O dono da conta não pode ser removido aqui; para isso, exclua a conta
        inteira em Contas.
        {!emailOn && ' O aviso por e-mail aparece quando o envio (Resend) estiver configurado.'}
      </p>
    </>
  );
}
