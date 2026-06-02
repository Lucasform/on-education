import { Hammer } from 'lucide-react';

import { cardClass, PageHeader } from '@/components/form';
import { SOON_LABELS } from '@/lib/nav';

export const dynamic = 'force-dynamic';

export default async function EmBrevePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const label = SOON_LABELS[slug] ?? 'Funcionalidade';

  return (
    <>
      <PageHeader title={label} description="Esta área faz parte do roadmap." />
      <div className={`${cardClass} flex flex-col items-center gap-3 py-12 text-center`}>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Hammer className="h-6 w-6" />
        </span>
        <p className="text-sm font-medium">Em construção</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Estamos preparando esta funcionalidade. Ela já está mapeada e aparece aqui para você ver o
          caminho completo do produto.
        </p>
      </div>
    </>
  );
}
