import { HeaderSkeleton, Skeleton } from '@/components/skeleton';

/** Fallback dos dashboards: cabeçalho + 2 cards + 2 gráficos. */
export default function DashboardsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-28 rounded-xl border border-border" />
        <Skeleton className="h-28 rounded-xl border border-border" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-40 rounded-xl border border-border" />
        <Skeleton className="h-40 rounded-xl border border-border" />
      </div>
    </div>
  );
}
