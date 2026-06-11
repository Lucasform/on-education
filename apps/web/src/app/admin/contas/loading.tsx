import { HeaderSkeleton, TableSkeleton } from '@/components/skeleton';

/** Fallback da lista de contas: cabeçalho + tabela (mesma forma da página). */
export default function ContasLoading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
