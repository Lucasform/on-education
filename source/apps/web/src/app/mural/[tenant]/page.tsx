import { listPublicFeed, listPublicMural, listPublicStories } from '@on-education/module-comunicacao';
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
  const [brand, avisos, stories, posts] = await Promise.all([
    getPublicTenantBrand(client, tenant).catch(() => null),
    listPublicMural(client, tenant).catch(() => []),
    listPublicStories(client, tenant).catch(() => []),
    listPublicFeed(client, tenant).catch(() => []),
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
        {/* stories */}
        {stories.length > 0 && (
          <div className="mb-6 flex gap-4 overflow-x-auto pb-1">
            {stories.map((s) => (
              <a
                key={s.id}
                href={s.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-20 shrink-0 flex-col items-center gap-1"
              >
                <span className="block h-20 w-20 overflow-hidden rounded-full ring-2 ring-primary ring-offset-2 ring-offset-background">
                  <img src={s.imageUrl} alt={s.caption ?? 'Story'} className="h-full w-full object-cover" />
                </span>
                {s.caption && (
                  <span className="line-clamp-1 text-center text-[11px] text-muted-foreground">
                    {s.caption}
                  </span>
                )}
              </a>
            ))}
          </div>
        )}

        {/* posts do feed */}
        {posts.length > 0 && (
          <div className="mb-8 space-y-4">
            {posts.map((p) => (
              <article key={p.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{p.authorName ?? brand.name}</span>
                  <time className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                    })}
                  </time>
                </div>
                {p.body && <p className="mt-2 whitespace-pre-wrap text-sm">{p.body}</p>}
                {p.imageUrl && (
                  <img
                    src={p.imageUrl}
                    alt="Imagem do post"
                    className="mt-3 w-full rounded-lg border border-border object-cover"
                  />
                )}
                {p.likes > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">❤ {p.likes}</div>
                )}
              </article>
            ))}
          </div>
        )}

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
