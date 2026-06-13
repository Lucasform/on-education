'use client';

import { Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { fieldClass } from './form';

export interface BulkField {
  name: string;
  placeholder: string;
  type?: string;
  /** Tailwind extra classes p/ controlar a largura da coluna. */
  className?: string;
}

/**
 * Formulário dinâmico de linhas para importação em lote.
 * Cada linha tem os campos definidos em `fields`. O "+" adiciona linhas;
 * o "×" remove (se houver mais de uma). O submit envia arrays: todos os
 * inputs com o mesmo `name` são coletados via formData.getAll().
 */
export function BulkAddRows({ fields }: { fields: BulkField[] }) {
  const counter = useRef(1);
  const [rows, setRows] = useState<number[]>([0]);

  const addRow = () => setRows((r) => [...r, counter.current++]);
  const removeRow = (id: number) => setRows((r) => r.filter((x) => x !== id));

  return (
    <div className="flex flex-col gap-2">
      {rows.map((id) => (
        <div key={id} className="flex items-center gap-2">
          {fields.map((f) => (
            <input
              key={f.name}
              name={f.name}
              type={f.type ?? 'text'}
              placeholder={f.placeholder}
              className={`${fieldClass} min-w-0 flex-1 ${f.className ?? ''}`}
            />
          ))}
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => removeRow(id)}
              aria-label="Remover linha"
              className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1 self-start rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="h-3 w-3" />
        Adicionar linha
      </button>
    </div>
  );
}
