'use client';

import { Button, type ButtonProps } from '@on-education/ui';
import { useFormStatus } from 'react-dom';

/** Spinner inline reutilizado pelos botões de submit enquanto a ação roda. */
export function Spinner() {
  return (
    <span
      aria-hidden
      className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

/**
 * Botão de submit que reflete o estado do form: enquanto a server action roda, ele
 * desabilita (evita duplo-clique) e mostra um spinner. Serve para qualquer verbo
 * (Salvar, Gerar, Importar, Adicionar), por isso preserva o rótulo original.
 */
export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending}>
      {pending && <Spinner />}
      {children}
    </Button>
  );
}
