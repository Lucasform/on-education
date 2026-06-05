'use client';

import type { EssayGap } from '@on-education/module-ia';
import { useState } from 'react';

import { generateDraftAction } from '@/app/app/actions';
import { cardClass, fieldClass } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';

/** Reduz a foto para no máx. 1600px e converte para JPEG (payload leve e formato aceito pela visão). */
async function downscale(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
    return blob ?? file;
  } catch {
    return file;
  }
}

export function RedacaoFoto() {
  const [previews, setPreviews] = useState<{ url: string; blob: Blob }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState('');
  const [gaps, setGaps] = useState<EssayGap[]>([]);
  const [gapValues, setGapValues] = useState<Record<string, string>>({});
  const [objetivo, setObjetivo] = useState('');
  const [comentarios, setComentarios] = useState('');

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4);
    if (files.length === 0) return;
    const ds = await Promise.all(files.map(downscale));
    setPreviews(ds.map((blob) => ({ url: URL.createObjectURL(blob), blob })));
    setTranscription('');
    setGaps([]);
    setGapValues({});
    setError(null);
  }

  async function transcrever() {
    if (previews.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      previews.forEach((p, i) => fd.append('images', p.blob, `redacao-${i + 1}.jpg`));
      const res = await fetch('/api/ia/redacao/transcrever', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Falha ao transcrever.');
      setTranscription(data.transcription ?? '');
      setGaps(Array.isArray(data.gaps) ? data.gaps : []);
      setGapValues({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao transcrever.');
    } finally {
      setLoading(false);
    }
  }

  function aplicarPreenchimento() {
    let texto = transcription;
    for (const g of gaps) {
      const v = gapValues[g.marker]?.trim();
      if (v) texto = texto.split(g.marker).join(v);
    }
    setTranscription(texto);
    // remove da lista os que já foram preenchidos
    setGaps((gs) => gs.filter((g) => !gapValues[g.marker]?.trim()));
  }

  const aindaIlegiveis = transcription.includes('〖?');
  const promptFinal = [
    objetivo.trim() && `Proposta/objetivo da redação: ${objetivo.trim()}`,
    comentarios.trim() && `Comentários do professor para análise: ${comentarios.trim()}`,
    `Redação do aluno (transcrita da foto):\n${transcription.trim()}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return (
    <div className={cardClass}>
      <h2 className="mb-1 text-sm font-medium">Corrigir a partir de uma foto</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Tire a foto da folha (ou envie a imagem). A IA transcreve sem inventar: o que não der para
        ler fica marcado para você completar antes de corrigir.
      </p>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={onPick}
        className={`${fieldClass} cursor-pointer`}
      />

      {previews.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {previews.map((p) => (
            <img
              key={p.url}
              src={p.url}
              alt="prévia da redação"
              className="h-24 w-auto rounded-md border border-border object-cover"
            />
          ))}
        </div>
      )}

      {previews.length > 0 && !transcription && (
        <button
          type="button"
          onClick={transcrever}
          disabled={loading}
          className="mt-3 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {loading ? 'Transcrevendo…' : 'Transcrever foto'}
        </button>
      )}

      {error && (
        <p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-center text-sm text-danger">
          {error}
        </p>
      )}

      {transcription && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Transcrição (revise; 〖?〗 = não compreendido)
            </label>
            <textarea
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              rows={8}
              className={`${fieldClass} font-mono text-xs`}
            />
          </div>

          {gaps.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
              <p className="mb-2 text-xs font-medium text-warning">
                Palavras não compreendidas — preencha para não inventarmos nada:
              </p>
              <ul className="space-y-2">
                {gaps.map((g) => (
                  <li key={g.marker} className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono">{g.marker}</span>
                    <span className="text-muted-foreground">
                      {g.line ? `linha ${g.line}` : 'linha ?'} · “…{g.around}…”
                    </span>
                    <input
                      value={gapValues[g.marker] ?? ''}
                      onChange={(e) => setGapValues((v) => ({ ...v, [g.marker]: e.target.value }))}
                      placeholder="palavra correta"
                      className={`${fieldClass} h-8 w-40 py-1`}
                    />
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={aplicarPreenchimento}
                className="mt-2 rounded-md border border-border bg-background px-3 py-1 text-xs"
              >
                Aplicar na transcrição
              </button>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Objetivo / proposta da redação (opcional)"
              className={fieldClass}
            />
            <input
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Comentários para análise (opcional)"
              className={fieldClass}
            />
          </div>

          {aindaIlegiveis && (
            <p className="text-xs text-warning">
              Ainda há trechos 〖?〗 na transcrição. Você pode completá-los ou corrigir mesmo assim.
            </p>
          )}

          <form action={generateDraftAction}>
            <input type="hidden" name="kind" value="essay" />
            <input type="hidden" name="prompt" value={promptFinal} />
            <SubmitButton type="submit" size="sm">
              Corrigir com IA
            </SubmitButton>
            <span className="ml-2 text-xs text-muted-foreground">
              A correção aparece na lista abaixo.
            </span>
          </form>
        </div>
      )}
    </div>
  );
}
