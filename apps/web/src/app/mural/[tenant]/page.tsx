import { listPublicMural } from '@on-education/module-comunicacao';
import { getPublicTenantBrand } from '@on-education/module-nucleo';
import { notFound } from 'next/navigation';

import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const brand = await getPublicTenantBrand(db(), tenant).catch(() => null);
  return { title: brand ? `Mural · ${brand.name}` : 'Mural' };
}

export default async function MuralPublicoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  // UUID inválido → 404 (evita erro de cast no banco).
  if (!/^[0-9a-f-]{36}$/i.test(tenant)) notFound();

  const client = db();
  const [brand, avisos] = await Promise.all([
    getPublicTenantBrand(client, tenant).catch(() => null),
    listPublicMural(client, tenant).catch(() => []),
  ]);
  if (!brand) notFound();

  const style = brand.themeColor
    ? ({ ['--primary' as string]: brand.themeColor } as React.CSSProperties)
    : undefined;

  return (
    <div className="min-h-screen bg-background" style={style}>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-5">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt="Logo" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <span className="h-10 w-10 rounded-lg bg-primary" />
          )}
          <div>
            <h1 className="text-lg font-bold leading-none">{brand.name}</h1>
            <p className="text-xs text-muted-foreground">Mural de avisos</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        {avisos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aviso publicado no momento.</p>
        ) : (
          <ul className="space-y-4">
            {avisos.map((a) => (
              <li key={a.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-semibold">{a.title}</h2>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                    })}
                  </time>
                </div>
                {a.body && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Mural de {brand.name} · Edu On Way
        </p>
      </main>
    </div>
  );
}
