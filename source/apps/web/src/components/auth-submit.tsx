'use client';

import { useFormStatus } from 'react-dom';

import { authPrimaryBtn } from '@/components/brand-auth-screen';

/**
 * Botão de envio das telas de entrada com estado de carregando: enquanto a server action
 * roda, ele desabilita e mostra um spinner. Isso dá feedback imediato no 1º clique e
 * impede envios duplicados (o usuário não fica clicando achando que não entrou).
 */
export function AuthSubmit({
  children,
  pendingLabel = 'Aguarde…',
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${authPrimaryBtn} mt-1 flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-80`}
    >
      {pending && (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-90"
            fill="currentColor"
            d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
          />
        </svg>
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}
