'use client';

import { Button, type ButtonProps } from '@on-education/ui';
import { useFormStatus } from 'react-dom';

import { Spinner } from './submit-button';

/**
 * Botão de submit que pede confirmação antes de enviar (ações de alto impacto:
 * excluir turma, comunicado, escola, exclusão definitiva). Cancela o submit se o
 * usuário não confirmar e, uma vez confirmado, desabilita + mostra spinner enquanto roda.
 */
export function ConfirmButton({ message, children, ...props }: ButtonProps & { message: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      {...props}
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {pending && <Spinner />}
      {children}
    </Button>
  );
}
