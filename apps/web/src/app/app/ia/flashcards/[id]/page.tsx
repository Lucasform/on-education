import { imagesLeftForTenant, isImageConfigured } from '@on-education/module-ia';
import { getFlashcardDeck } from '@on-education/module-pedagogico';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { cardClass, PageHeader } from '@/components/form';
import { FlashcardStudy } from '@/components/flashcard-study';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { illustrateFlashcardCardAction } from '../../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Estudar flashcards · Edu On Way' };

export default async function FlashcardDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const deck = await getFlashcardDeck(db(), ctx, id).catch(() => null);
  if (!deck) notFound();

  const podeImagem = isImageConfigured();
  const restantes = podeImagem ? await imagesLeftForTenant(db(), ctx).catch(() => 0) : 0;

  return (
    <>
      <Link
        href="/app/ia/flashcards"
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        ← Voltar aos baralhos
      </Link>
      <PageHeader
        title={deck.title}
        description={[deck.subject, deck.gradeLevel, deck.ageBand && `${deck.ageBand} anos`]
          .filter(Boolean)
          .join(' · ')}
      />
      <FlashcardStudy cards={deck.cards} />

      {podeImagem && (
        <div className={cardClass}>
          <h2 className="mb-1 text-sm font-medium">Ilustrar os cards</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Gera uma figura para a criança ver (1 imagem por card). Restantes este mês:{' '}
            <span className="font-medium">{restantes === Infinity ? 'ilimitadas' : restantes}</span>
          </p>
          <ul className="space-y-2">
            {deck.cards.map((c, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-2 text-sm"
              >
                <span className="flex items-center gap-3">
                  {c.image ? (
                    <img src={c.image} alt={c.front} className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                      sem img
                    </span>
                  )}
                  <span>{c.front}</span>
                </span>
                <form action={illustrateFlashcardCardAction}>
                  <input type="hidden" name="deckId" value={deck.id} />
                  <input type="hidden" name="index" value={i} />
                  <SubmitButton type="submit" size="sm" variant="outline">
                    {c.image ? 'Refazer' : 'Gerar imagem'}
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
