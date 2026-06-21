'use client';

import { Button } from '@on-education/ui';
import { useRef, useState } from 'react';

/**
 * Form de exclusão em lote: envolve uma lista/tabela cujas linhas têm um checkbox
 * <input name="ids" value={id}>. Mostra "selecionar todas", conta os selecionados e
 * confirma antes de enviar. A `action` (server action) recebe todos os ids marcados.
 */
export function BulkDeleteForm({
  action,
  itemLabel = 'itens',
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  itemLabel?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [count, setCount] = useState(0);
  const recount = () =>
    setCount(ref.current?.querySelectorAll('input[name="ids"]:checked').length ?? 0);
  const toggleAll = (checked: boolean) => {
    ref.current
      ?.querySelectorAll<HTMLInputElement>('input[name="ids"]')
      .forEach((c) => (c.checked = checked));
    recount();
  };
  return (
    <form ref={ref} action={action} onChange={recount}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            onChange={(e) => toggleAll(e.target.checked)}
          />
          Selecionar todas
        </label>
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          disabled={count === 0}
          onClick={(e) => {
            if (
              !window.confirm(`Excluir ${count} ${itemLabel}? Esta ação não pode ser desfeita.`)
            ) {
              e.preventDefault();
            }
          }}
        >
          Excluir selecionadas{count ? ` (${count})` : ''}
        </Button>
      </div>
      {children}
    </form>
  );
}

/** Checkbox de uma linha selecionável (envia o id no campo `ids`). */
export function BulkCheckbox({ value }: { value: string }) {
  return (
    <input
      type="checkbox"
      name="ids"
      value={value}
      className="h-4 w-4 accent-primary"
      aria-label="Selecionar"
    />
  );
}
