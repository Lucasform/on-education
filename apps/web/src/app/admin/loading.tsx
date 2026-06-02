/** Skeleton do painel admin enquanto as contas e estatísticas carregam. */
export default function AdminLoading() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 p-6 md:p-10">
      <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
    </main>
  );
}
