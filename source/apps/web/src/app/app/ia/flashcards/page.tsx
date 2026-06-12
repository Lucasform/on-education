import { isAiConfigured } from '@on-education/module-ia';
import { listFlashcardDecks } from '@on-education/module-pedagogico';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SerieFaixaPicker } from '@/components/serie-faixa-picker';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { deleteFlashcardDeckAction, generateFlashcardsAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Flashcards · Edu On Way' };

export default async function FlashcardsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const decks = await listFlashcardDecks(db(), ctx).catch(() => []);
  const aiOn = isAiConfigured();

  return (
    <>
      <PageHeader
        title="Flashcards"
        description="O WayOn cria baralhos de estudo (frente e verso) no seu padrão. Clique para estudar."
      />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Baralhos ({decks.length})</h2>
          {decks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum baralho ainda.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {decks.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/app/ia/flashcards/${d.id}`}
                    className="text-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    {d.title}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {d.cards.length} cards
                    </span>
                  </Link>
                  <form action={deleteFlashcardDeckAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <ConfirmButton size="sm" variant="ghost" message={`Excluir "${d.title}"?`}>
                      Excluir
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cardClass}>
          <h2 className="mb-2 text-sm font-medium">Gerar com o WayOn</h2>
          {aiOn ? (
            <form action={generateFlashcardsAction} className="flex flex-col gap-2">
              <input
                name="topic"
                required
                placeholder="Tema (ex.: verbos irregulares em inglês)"
                className={fieldClass}
              />
              <input name="subject" placeholder="Disciplina (opcional)" className={fieldClass} />
              <SerieFaixaPicker />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Quantidade
                <input
                  name="count"
                  type="number"
                  min={3}
                  max={30}
                  defaultValue={10}
                  className={`${fieldClass} w-20`}
                />
              </label>
              <SubmitButton type="submit" size="sm">
                Gerar flashcards
              </SubmitButton>
            </form>
          ) : (
            <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
              WayOn indisponível. Configure <code>ANTHROPIC_API_KEY</code>.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
