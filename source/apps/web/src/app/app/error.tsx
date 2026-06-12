'use client';

import { Button } from '@on-education/ui';

/**
 * Rede de segurança do segmento /app: qualquer erro não tratado numa tela vira uma
 * mensagem amigável com "tentar de novo" em vez do "Application error" cru do Next.
 */
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-lg font-semibold">Algo deu errado ao carregar esta tela.</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Pode ter sido um soluço temporário da conexão. Tente novamente; se persistir, volte ao
        início.
      </p>
      <div className="mt-2 flex gap-2">
        <Button onClick={reset}>Tentar de novo</Button>
        <a href="/app">
          <Button variant="outline">Voltar ao início</Button>
        </a>
      </div>
    </div>
  );
}
