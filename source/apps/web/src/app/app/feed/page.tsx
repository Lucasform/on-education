import {
  listActiveStories,
  listCommentsFor,
  listFeed,
} from '@on-education/module-comunicacao';
import { getPublicTenantBrand, listClasses } from '@on-education/module-nucleo';
import { Heart, ImagePlus, MessageCircle, Plus, Send, Trash2 } from 'lucide-react';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { ProductTour } from '@/components/product-tour';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  addCommentAction,
  createPostAction,
  createStoryAction,
  deletePostAction,
  deleteStoryAction,
  toggleLikeAction,
} from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mural & feed · Edu On Way' };

function quando(d: Date | string) {
  return new Date(d).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function FeedPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();

  const [brand, classes, stories, feed] = await Promise.all([
    getPublicTenantBrand(client, ctx.tenantId).catch(() => null),
    listClasses(client, ctx).catch(() => []),
    listActiveStories(client, ctx).catch(() => []),
    listFeed(client, ctx).catch(() => []),
  ]);
  const comentarios = await listCommentsFor(client, ctx, feed.map((p) => p.id)).catch(() => []);
  const porPost = new Map<string, typeof comentarios>();
  for (const c of comentarios) {
    const arr = porPost.get(c.postId) ?? [];
    arr.push(c);
    porPost.set(c.postId, arr);
  }
  const escola = brand?.name ?? 'Escola';

  return (
    <>
      <PageHeader
        title="Mural & feed"
        description="Poste novidades com foto, publique stories e converse com a comunidade."
      />
      <ProductTour
        id="feed"
        steps={[
          { selector: '[data-tour="feed-story"]', title: 'Stories', body: 'Publique destaques rápidos com foto. Eles somem sozinhos em 24h.' },
          { selector: '[data-tour="feed-post"]', title: 'Postar no mural', body: 'Compartilhe um aviso ou novidade com foto; a comunidade curte e comenta.' },
        ]}
      />

      {/* stories */}
      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Stories (24h)</h2>
        <div className="flex gap-4 overflow-x-auto pb-1">
          {/* adicionar story */}
          <form
            action={createStoryAction}
            data-tour="feed-story"
            className="flex w-20 shrink-0 flex-col items-center gap-1"
          >
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <Plus className="h-5 w-5" />
              <span className="mt-0.5 text-[10px]">foto</span>
              <input
                type="file"
                name="image"
                accept="image/png,image/jpeg,image/webp"
                required
                className="hidden"
              />
            </label>
            <SubmitButton type="submit" size="sm" variant="outline" className="h-6 px-2 text-[11px]">
              Enviar
            </SubmitButton>
          </form>

          {stories.map((s) => (
            <div key={s.id} className="flex w-20 shrink-0 flex-col items-center gap-1">
              <a
                href={s.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="block h-20 w-20 overflow-hidden rounded-full ring-2 ring-primary ring-offset-2 ring-offset-card"
              >
                <img src={s.imageUrl} alt={s.caption ?? 'Story'} className="h-full w-full object-cover" />
              </a>
              <form action={deleteStoryAction}>
                <input type="hidden" name="id" value={s.id} />
                <button
                  type="submit"
                  className="text-[11px] text-muted-foreground hover:text-danger"
                >
                  remover
                </button>
              </form>
            </div>
          ))}
          {stories.length === 0 && (
            <p className="self-center text-sm text-muted-foreground">
              Nenhum story ativo. Toque em “Novo”.
            </p>
          )}
        </div>
      </section>

      {/* novo post */}
      <section className={cardClass} data-tour="feed-post">
        <h2 className="mb-3 text-sm font-medium">Publicar no mural</h2>
        <form action={createPostAction} className="flex flex-col gap-3">
          <textarea
            name="body"
            rows={3}
            placeholder="Escreva uma novidade, aviso ou recado para a comunidade…"
            className={`${fieldClass} resize-none`}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <ImagePlus className="h-4 w-4" />
              Foto
              <input type="file" name="image" accept="image/png,image/jpeg,image/webp" className="hidden" />
            </label>
            {classes.length > 0 && (
              <select name="classId" className={`${fieldClass} w-auto`} defaultValue="">
                <option value="">Toda a escola</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <SubmitButton type="submit" size="sm" className="ml-auto">
              Publicar
            </SubmitButton>
          </div>
        </form>
      </section>

      {/* feed */}
      {feed.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada publicado ainda. Comece pelo primeiro post.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {feed.map((p) => {
            const turma = p.classId ? classes.find((c) => c.id === p.classId)?.name : null;
            const cmts = porPost.get(p.id) ?? [];
            return (
              <article key={p.id} className={cardClass}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {(p.authorName ?? escola).slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <div className="text-sm font-semibold leading-none">{p.authorName ?? escola}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {quando(p.createdAt)}
                        {turma ? ` · ${turma}` : ' · toda a escola'}
                      </div>
                    </div>
                  </div>
                  <form action={deletePostAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" aria-label="Excluir" className="text-muted-foreground hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>

                {p.body && <p className="mt-3 whitespace-pre-wrap text-sm">{p.body}</p>}
                {p.imageUrl && (
                  <img
                    src={p.imageUrl}
                    alt="Imagem do post"
                    className="mt-3 max-h-[28rem] w-full rounded-xl border border-border object-cover"
                  />
                )}

                <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                  <form action={toggleLikeAction}>
                    <input type="hidden" name="postId" value={p.id} />
                    <button
                      type="submit"
                      className={`inline-flex items-center gap-1.5 transition-colors hover:text-primary ${p.likedByMe ? 'text-primary' : ''}`}
                    >
                      <Heart className={`h-4 w-4 ${p.likedByMe ? 'fill-current' : ''}`} />
                      {p.likes}
                    </button>
                  </form>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" />
                    {p.comments}
                  </span>
                </div>

                {cmts.length > 0 && (
                  <ul className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
                    {cmts.map((c) => (
                      <li key={c.id}>
                        <span className="font-medium">{c.authorName ?? escola}: </span>
                        <span className="text-muted-foreground">{c.body}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <form action={addCommentAction} className="mt-3 flex items-center gap-2">
                  <input type="hidden" name="postId" value={p.id} />
                  <input
                    name="body"
                    placeholder="Escreva um comentário…"
                    className={`${fieldClass} flex-1`}
                  />
                  <button
                    type="submit"
                    aria-label="Comentar"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
