import { listApiKeys } from '@on-education/module-nucleo';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createApiKeyAction, revokeApiKeyAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'API aberta · Edu On Way' };

export default async function ApiPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');

  const chaves = await listApiKeys(db(), ctx).catch(() => []);
  const novaChave = (await cookies()).get('oe_apikey_flash')?.value ?? null;

  return (
    <>
      <PageHeader
        title="API aberta"
        description="Chaves para sistemas externos lerem dados da escola via API REST."
      />

      {novaChave && (
        <div className="rounded-lg border border-success/40 bg-success/10 p-4">
          <p className="text-sm font-medium text-success">Chave criada — copie agora!</p>
          <p className="mb-2 text-xs text-muted-foreground">
            Por segurança, ela não será mostrada de novo.
          </p>
          <code className="block break-all rounded-md bg-background px-3 py-2 text-sm">
            {novaChave}
          </code>
        </div>
      )}

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Nova chave</h2>
        <form action={createApiKeyAction} className="flex flex-wrap items-end gap-2">
          <input name="name" placeholder="Nome (ex.: ERP da escola)" className={fieldClass} />
          <SubmitButton type="submit" size="sm">
            Gerar chave
          </SubmitButton>
        </form>
      </div>

      <div className={`${cardClass} overflow-x-auto p-0`}>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Chave</th>
              <th className="px-4 py-2 font-medium">Último uso</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {chaves.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhuma chave ainda.
                </td>
              </tr>
            )}
            {chaves.map((k) => (
              <tr key={k.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2 font-medium">{k.name}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                  {k.tokenPrefix}…
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString('pt-BR') : 'nunca'}
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={revokeApiKeyAction}>
                    <input type="hidden" name="id" value={k.id} />
                    <ConfirmButton
                      size="sm"
                      variant="ghost"
                      message={`Revogar a chave "${k.name}"? Quem usa ela perde o acesso.`}
                    >
                      Revogar
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={cardClass}>
        <h2 className="mb-2 text-sm font-medium">Como usar</h2>
        <p className="mb-2 text-xs text-muted-foreground">
          Envie a chave no header <code>Authorization: Bearer SUA_CHAVE</code>. Read-only.
        </p>
        <pre className="overflow-x-auto rounded-md bg-background p-3 text-xs">
          {`curl -H "Authorization: Bearer SUA_CHAVE" \\
  https://eduonway.com/api/v1/students

# Recursos: /api/v1/students  ·  /api/v1/classes`}
        </pre>
      </div>
    </>
  );
}
