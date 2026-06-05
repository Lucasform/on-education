import { getFlashcardDeck } from '@on-education/module-pedagogico';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { PageHeader } from '@/components/form';
import { FlashcardStudy } from '@/components/flashcard-study';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Estudar flashcards · Edu On Way' };

export default async function FlashcardDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const deck = await getFlashcardDeck(db(), ctx, id).catch(() => null);
  if (!deck) notFound();

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
    </>
  );
}
