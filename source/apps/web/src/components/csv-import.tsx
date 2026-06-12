'use client';

import { Download, Upload } from 'lucide-react';
import { Button } from '@on-education/ui';

import { fieldClass } from './form';

/**
 * Importação por planilha (CSV/Excel): baixar modelo → preencher → importar.
 * O modelo é gerado no cliente (Blob) com BOM para abrir certo no Excel pt-BR.
 * O upload usa um server action (passado por prop) que faz o parse no servidor.
 */
export function CsvImport({
  action,
  templateName,
  templateContent,
  hint,
}: {
  action: (formData: FormData) => Promise<void>;
  templateName: string;
  templateContent: string;
  hint?: string;
}) {
  function baixarModelo() {
    // BOM (0xFEFF) faz o Excel pt-BR abrir o CSV com acentos corretos.
    const blob = new Blob([String.fromCharCode(0xfeff) + templateContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Importar por planilha (CSV)</p>
        <Button type="button" size="sm" variant="outline" onClick={baixarModelo}>
          <Download className="mr-1.5 h-4 w-4" />
          Baixar modelo
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <form action={action} className="flex flex-col gap-2">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className={`${fieldClass} file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-sm`}
        />
        <Button type="submit" size="sm">
          <Upload className="mr-1.5 h-4 w-4" />
          Importar planilha
        </Button>
      </form>
    </div>
  );
}
