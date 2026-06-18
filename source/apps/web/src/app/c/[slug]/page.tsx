import { Button } from '@on-education/ui';
import { getTenantBrandBySlug, normalizeSlug } from '@on-education/module-nucleo';
import { notFound, redirect } from 'next/navigation';

import { Field, fieldClass } from '@/components/form';
import { ThemeToggle } from '@/components/theme-toggle';
import { loginAction } from '@/app/login/actions';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

/**
 * Tela de login da MARCA da escola/professor: eduonway.com/c/<slug>. Resolve o tenant pelo
 * slug e aplica logo + cor + nome ANTES do login. Não escopa o acesso (isso vem do vínculo
 * do usuário); é o ponto de entrada personalizado, no padrão do app de condomínio.
 */
export default async function BrandLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { slug } = await params;
  const { erro } = await searchParams;

  // Já autenticado? Vai direto pra área de trabalho.
  const ctx = await getAuthContext();
  if (ctx) redirect('/app');

  const brand = await getTenantBrandBySlug(db(), slug).catch(() => null);
  if (!brand) notFound();

  const clean = normalizeSlug(slug);
  const themeStyle = brand.themeColor
    ? `:root{--primary:${brand.themeColor};--ring:${brand.themeColor}}`
    : null;

  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      {themeStyle && <style dangerouslySetInnerHTML={{ __html: themeStyle }} />}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          {brand.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt={brand.name}
              className="h-16 w-16 rounded-xl object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
              {brand.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="text-xl font-semibold">{brand.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Entrar na sua área de trabalho.</p>
          </div>
        </div>

        {erro && (
          <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-center text-sm text-danger">
            E-mail ou senha inválidos. Tente novamente.
          </p>
        )}

        <form action={loginAction} className="flex flex-col gap-4">
          <input type="hidden" name="returnTo" value={`/c/${clean}`} />
          <Field label="E-mail">
            <input name="email" type="email" required className={fieldClass} />
          </Field>
          <Field label="Senha">
            <input name="password" type="password" required className={fieldClass} />
          </Field>
          <div className="text-right">
            <a
              href="/esqueci-senha"
              className="rounded-sm text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Esqueci a senha
            </a>
          </div>
          <Button type="submit" className="mt-2 w-full">
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Powered by Edu On Way
        </p>
      </div>
    </div>
  );
}
