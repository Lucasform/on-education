'use client';

import { useActionState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@on-education/ui';

import { fieldClass } from './form';

/**
 * Erro de uma linha específica do CSV.
 * `linha` é o número da linha de dados (1 = primeira linha após o cabeçalho).
 */
export interface CsvLineError {
  linha: number;
  mensagem: string;
}

/**
 * Estado devolvido por um server action de importação CSV com relatório de erros por linha.
 * `importadas` é `null` antes do primeiro envio.
 */
export interface CsvImportState {
  importadas: number | null;
  erros: CsvLineError[];
}

const estadoInicial: CsvImportState = { importadas: null, erros: [] };

/**
 * Importação por planilha (CSV/Excel): baixar modelo, preencher e importar.
 * O modelo é gerado no cliente (Blob) com BOM para abrir certo no Excel pt-BR.
 *
 * Duas modalidades:
 * - `action` (obrigatório, compatível com o padrão `(FormData) => Promise<void>`): uso retroativo
 *   sem relatório de erros por linha.
 * - `actionWithResult` (opcional): `(prev, FormData) => Promise<CsvImportState>` via `useActionState`;
 *   quando presente, substitui o `action` e exibe erros por linha ao usuário.
 */
export function CsvImport({
  action,
  actionWithResult,
  templateName,
  templateContent,
  hint,
}: {
  action: (formData: FormData) => Promise<void>;
  actionWithResult?: (prev: CsvImportState, formData: FormData) => Promise<CsvImportState>;
  templateName: string;
  templateContent: string;
  hint?: string;
}) {
  const actionResolvido = actionWithResult ?? wrapSimples(action);

  const [estado, dispatch] = useActionState(actionResolvido, estadoInicial);

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

  const temResultado = estado.importadas !== null;
  const temErros = estado.erros.length > 0;

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
      <form action={dispatch} className="flex flex-col gap-2">
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

      {temResultado && (
        <div className="rounded-md border border-border p-3 text-sm">
          <p className="font-medium text-foreground">
            {estado.importadas === 0
              ? 'Nenhum registro importado.'
              : `${estado.importadas} registro(s) importado(s) com sucesso.`}
          </p>

          {temErros && (
            <div className="mt-2">
              <p className="mb-1 text-xs font-medium text-destructive">
                {estado.erros.length} linha(s) com problema:
              </p>
              <ul className="space-y-0.5">
                {estado.erros.map((e) => (
                  <li key={e.linha} className="text-xs text-muted-foreground">
                    <span className="font-medium text-destructive">Linha {e.linha}:</span>{' '}
                    {e.mensagem}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Envolve um server action legado `(FormData) => Promise<void>` na assinatura
 * esperada por `useActionState`. Sem relatório de erros; `importadas` fica `null`.
 */
function wrapSimples(
  fn: (formData: FormData) => Promise<void>,
): (prev: CsvImportState, formData: FormData) => Promise<CsvImportState> {
  return async (_prev, formData) => {
    await fn(formData);
    return { importadas: null, erros: [] };
  };
}
