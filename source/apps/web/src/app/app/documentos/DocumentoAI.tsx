'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const field =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none';

const MODELOS = [
  'Declaração de matrícula',
  'Declaração de frequência',
  'Autorização de saída',
  'Comunicado oficial',
  'Ofício',
  'Outro',
];

export function DocumentoAI({ agentName }: { agentName: string }) {
  const router = useRouter();
  const [modelLabel, setModelLabel] = useState(MODELOS[0]!);
  const [info, setInfo] = useState('');
  const [draft, setDraft] = useState('');
  const [adjustment, setAdjustment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(payload: Record<string, string>) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ia/documento', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        setError(data.error ?? 'Falha ao gerar.');
        return;
      }
      setDraft(data.text);
      setAdjustment('');
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/[0.03] p-4 print:hidden">
      <h2 className="mb-1 text-sm font-medium">Gerar com o {agentName}</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Diga o tipo e as informações; o {agentName} escreve um documento formal no padrão da escola.
        Revise, peça ajustes e use no documento abaixo.
      </p>

      <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
        <select value={modelLabel} onChange={(e) => setModelLabel(e.target.value)} className={field}>
          {MODELOS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          placeholder="Informações (ex.: aluno João Silva, 3º ano, período 2026, motivo consulta médica)"
          className={field}
        />
      </div>

      <button
        type="button"
        onClick={() => call({ modelLabel, info })}
        disabled={loading}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Gerando...' : `Gerar com o ${agentName}`}
      </button>

      {error && <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {draft && (
        <div className="mt-4 space-y-2">
          <label className="block text-xs font-medium text-muted-foreground">
            Rascunho (edite à vontade)
          </label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={7}
            className={field}
          />
          <div className="flex flex-wrap gap-2">
            <input
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
              placeholder="Comentário de ajuste (ex.: deixar mais curto, citar o RG)"
              className={`${field} flex-1`}
            />
            <button
              type="button"
              onClick={() => call({ current: draft, adjustment })}
              disabled={loading || !adjustment.trim()}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
            >
              Gerar novamente
            </button>
          </div>
          <button
            type="button"
            onClick={() =>
              router.push(`/app/documentos?model=livre&extra=${encodeURIComponent(draft)}`)
            }
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Usar no documento ↓
          </button>
        </div>
      )}
    </div>
  );
}
