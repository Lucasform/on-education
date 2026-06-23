import { getTenantSettings, getTenantSlug } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass } from '@/components/form';
import { LogoUpload } from '@/components/logo-upload';
import { SlugCard } from '@/components/slug-field';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { updateTenantSettingsAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Perfil · Edu On Way' };

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ slugOk?: string; slugErro?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'individual') redirect('/app/escola/personalizacao');

  const { slugOk, slugErro } = await searchParams;
  const settings = await getTenantSettings(db(), ctx).catch(() => null);
  const slug = await getTenantSlug(db(), ctx.tenantId).catch(() => null);

  return (
    <div className="flex flex-col gap-5">
      <form action={updateTenantSettingsAction}>
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Identidade</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
              Nome de exibição
              <input
                name="profileName"
                maxLength={120}
                defaultValue={settings?.profileName ?? ''}
                placeholder="Prof. Lucas Carvalho"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Telefone <span className="text-muted-foreground/70">(WhatsApp ou celular)</span>
              <input
                name="profilePhone"
                maxLength={40}
                defaultValue={settings?.profilePhone ?? ''}
                placeholder="(11) 99999-9999"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              E-mail de contato
              <input
                name="profileEmail"
                type="email"
                maxLength={120}
                defaultValue={settings?.profileEmail ?? ''}
                placeholder="contato@exemplo.com"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
              Endereço
              <input
                name="profileAddress"
                maxLength={200}
                defaultValue={settings?.profileAddress ?? ''}
                placeholder="Rua, número, cidade"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              CNPJ / CPF <span className="text-muted-foreground/70">(opcional)</span>
              <input
                name="profileCnpj"
                maxLength={40}
                defaultValue={settings?.profileCnpj ?? ''}
                className={fieldClass}
              />
            </label>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Aparece no cabeçalho das atividades e documentos que você imprime.
          </p>
          <div className="mt-4">
            <SubmitButton type="submit">Salvar alterações</SubmitButton>
          </div>
        </div>
      </form>

      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Seu logo</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Aparece no topo do sistema e no cabeçalho das atividades, no lugar do logo padrão.
        </p>
        <LogoUpload currentUrl={settings?.logoUrl ?? null} />
      </div>

      <SlugCard current={slug} ok={slugOk} erro={slugErro} />
    </div>
  );
}
