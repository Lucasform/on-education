'use client';

import { useState } from 'react';

import { deleteOwnAccountAction } from '@/app/app/actions';

import { SubmitButton } from './submit-button';

/**
 * Zona de perigo: o DONO exclui a própria conta digitando o nome exato para confirmar.
 * O botão só habilita quando o texto bate (defesa de UX); o servidor revalida o nome
 * de qualquer forma. Excluir apaga a conta toda; as atividades vão para o Banco Geral.
 */
export function DeleteAccountForm({ expectedName }: { expectedName: string }) {
  const [value, setValue] = useState('');
  const matches = value.trim().length > 0 && value.trim() === expectedName.trim();

  return (
    <form action={deleteOwnAccountAction} className="flex flex-col gap-2">
      <input
        name="confirmName"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
        placeholder={`Digite "${expectedName}" para confirmar`}
        className="w-full rounded-md border border-danger/40 bg-background px-3 py-2 text-sm outline-none focus:border-danger"
      />
      <SubmitButton
        type="submit"
        size="sm"
        variant="ghost"
        disabled={!matches}
        className="self-start text-destructive hover:text-destructive disabled:opacity-40"
      >
        Excluir minha conta definitivamente
      </SubmitButton>
    </form>
  );
}
