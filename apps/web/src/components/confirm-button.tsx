'use client';

import { Button, type ButtonProps } from '@on-education/ui';

/**
 * Botão de submit que pede confirmação antes de enviar (ações de alto impacto:
 * excluir turma, comunicado, escola, exclusão definitiva). Cancela o submit se o
 * usuário não confirmar.
 */
export function ConfirmButton({ message, children, ...props }: ButtonProps & { message: string }) {
  return (
    <Button
      {...props}
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
