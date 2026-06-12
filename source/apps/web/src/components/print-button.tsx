'use client';

import { Printer } from 'lucide-react';
import { Button } from '@on-education/ui';

/**
 * Geração de documento "fácil" (9.1 / 8.2): aciona a impressão do navegador, que permite
 * "Salvar como PDF". A folha de estilo de impressão (globals.css + print:hidden na casca)
 * esconde a navegação e deixa só o conteúdo do relatório na página impressa.
 */
export function PrintButton({ label = 'Imprimir / PDF' }: { label?: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => window.print()}
      className="print:hidden"
    >
      <Printer className="mr-1.5 h-4 w-4" />
      {label}
    </Button>
  );
}
