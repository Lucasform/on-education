'use client';

import { useState } from 'react';

import { generateDraftAction } from '@/app/app/actions';
import { useAgentName } from '@/components/agent-name-provider';
import { cardClass, fieldClass } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';

/** Reduz a foto p/ no máx. 1600px e converte p/ JPEG (payload leve, aceito pela visão). */
async function downscale(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Tira foto do enunciado → o WayOn transcreve → vira a pergunta do tutor (sem resolver na foto). */
export function TutorFoto() {
  const agentName = useAgentName();
  const [previews, setPreviews] = useState<{ url: string; blob: Blob }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enunciado, setEnunciado] = useState('');
  const [duvida, setDuvida] = useState('');

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4);
    if (files.length === 0) return;
    const ds = await Promise.all(files.map(downscale));
    setPreviews(ds.map((blob) => ({ url: URL.createObjectURL(blob), blob })));
    setEnunciado('');
    setError(null);
  }

  async function transcrever() {
    if (previews.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      previews.forEach((p, i) => fd.append('images', p.blob, `enunciado-${i + 1}.jpg`));
      const res = await fetch('/api/ia/transcrever', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Falha ao transcrever.');
      setEnunciado(String(data.text ?? ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao transcrever.');
    } finally {
      setLoading(false);
    }
  }

  const prompt = [
    enunciado.trim() && `Enunciado do exercício:\n${enunciado.trim()}`,
    duvida.trim() && `Dúvida do aluno: ${duvida.trim()}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return (
    <div className={cardClass}>
      <h2 className="mb-1 text-sm font-medium">Ler o enunciado por foto</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Tire a foto do exercício. O {agentName} transcreve (sem resolver na foto) e você pede a
        explicação.
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
              alt="prévia do enunciado"
              loading="lazy"
              className="h-20 w-auto rounded-md border border-border object-cover"
            />
          ))}
        </div>
      )}

      {previews.length > 0 && !enunciado && (
        <button
          type="button"
          onClick={transcrever}
          disabled={loading}
          className="mt-3 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {loading ? 'Lendo…' : 'Ler enunciado'}
        </button>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {enunciado && (
        <div className="mt-4 space-y-2">
          <label className="block text-xs font-medium text-muted-foreground">
            Enunciado transcrito (revise se precisar)
          </label>
          <textarea
            value={enunciado}
            onChange={(e) => setEnunciado(e.target.value)}
            rows={5}
            className={`${fieldClass} text-sm`}
          />
          <input
            value={duvida}
            onChange={(e) => setDuvida(e.target.value)}
            placeholder="Dúvida específica (opcional)"
            className={fieldClass}
          />
          <form action={generateDraftAction}>
            <input type="hidden" name="kind" value="tutor" />
            <input type="hidden" name="prompt" value={prompt} />
            <SubmitButton type="submit" size="sm">
              Explicar com o tutor
            </SubmitButton>
            <span className="ml-2 text-xs text-muted-foreground">A explicação aparece abaixo.</span>
          </form>
        </div>
      )}
    </div>
  );
}
