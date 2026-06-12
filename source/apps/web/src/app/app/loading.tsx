/**
 * Fallback de carregamento do segmento /app. Aparece instantaneamente ao navegar entre
 * itens do menu, enquanto o servidor resolve a página (sensação de clique responsivo).
 */
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted/70" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />
    </div>
  );
}
