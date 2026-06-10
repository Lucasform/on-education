'use client';

import { useMemo, useState } from 'react';

import { lancarNotasCorrecaoAction } from '@/app/app/actions';
import { cardClass, fieldClass } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';

type Turma = { id: string; name: string };
type Aluno = { id: string; fullName: string; classId: string | null };
type Componente = { id: string; name: string };

/** Reduz a foto p/ no máx. 1600px e converte p/ JPEG (payload leve, formato aceito pela visão). */
async function downscale(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
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

interface Row {
  key: string;
  studentId: string;
  previews: { url: string; blob: Blob }[];
  status: 'idle' | 'loading' | 'done' | 'error';
  score: string;
  feedback: string;
  error: string | null;
}

let counter = 0;
const newRow = (): Row => ({
  key: `r${counter++}`,
  studentId: '',
  previews: [],
  status: 'idle',
  score: '',
  feedback: '',
  error: null,
});

export function CorrecaoLote({
  turmas,
  alunos,
  componentes,
  maxScoreDefault,
}: {
  turmas: Turma[];
  alunos: Aluno[];
  componentes: Componente[];
  maxScoreDefault: number;
}) {
  const [turmaId, setTurmaId] = useState(turmas[0]?.id ?? '');
  const [label, setLabel] = useState('');
  const [maxScore, setMaxScore] = useState(String(maxScoreDefault));
  const [componentId, setComponentId] = useState('');
  const [rubric, setRubric] = useState('');
  const [answerKey, setAnswerKey] = useState('');
  const [context, setContext] = useState('');
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const alunosDaTurma = useMemo(
    () => (turmaId ? alunos.filter((a) => a.classId === turmaId) : alunos),
    [alunos, turmaId],
  );

  function patch(key: string, p: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }

  async function onPick(key: string, files: FileList | null) {
    const list = Array.from(files ?? []).slice(0, 4);
    if (list.length === 0) return;
    const blobs = await Promise.all(list.map(downscale));
    patch(key, {
      previews: blobs.map((blob) => ({ url: URL.createObjectURL(blob), blob })),
      status: 'idle',
      error: null,
    });
  }

  async function corrigir(row: Row) {
    if (row.previews.length === 0) {
      patch(row.key, { error: 'Adicione ao menos uma foto.' });
      return;
    }
    patch(row.key, { status: 'loading', error: null });
    try {
      const fd = new FormData();
      row.previews.forEach((p, i) => fd.append('images', p.blob, `t-${i + 1}.jpg`));
      fd.append('maxScore', maxScore);
      if (rubric.trim()) fd.append('rubric', rubric.trim());
      if (answerKey.trim()) fd.append('answerKey', answerKey.trim());
      if (context.trim()) fd.append('context', context.trim());
      const res = await fetch('/api/ia/correcao', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Falha ao corrigir.');
      patch(row.key, {
        status: 'done',
        score: String(data.score ?? ''),
        feedback: String(data.feedback ?? ''),
      });
    } catch (e) {
      patch(row.key, { status: 'error', error: e instanceof Error ? e.message : 'Falha.' });
    }
  }

  async function corrigirTodos() {
    setBulkLoading(true);
    for (const r of rows) {
      if (r.previews.length > 0 && r.status !== 'done') await corrigir(r);
    }
    setBulkLoading(false);
  }

  const prontos = rows.filter(
    (r) => r.studentId && r.score !== '' && !Number.isNaN(Number(r.score)),
  );
  const itemsJson = JSON.stringify(
    prontos.map((r) => ({ studentId: r.studentId, score: Number(r.score), feedback: r.feedback })),
  );

  return (
    <div className="flex flex-col gap-5">
      {/* configuração da avaliação */}
      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">1. Avaliação</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {turmas.length > 0 && (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Turma
              <select
                value={turmaId}
                onChange={(e) => setTurmaId(e.target.value)}
                className={fieldClass}
              >
                <option value="">Sem turma</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Nome da avaliação
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex.: Prova de Matemática"
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Nota máxima
            <input
              type="number"
              min={1}
              max={1000}
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              className={fieldClass}
            />
          </label>
          {componentes.length > 0 && (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Componente da média (opcional)
              <select
                value={componentId}
                onChange={(e) => setComponentId(e.target.value)}
                className={fieldClass}
              >
                <option value="">Padrão</option>
                {componentes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-primary">
            Rubrica / gabarito / contexto (opcional, melhora a correção)
          </summary>
          <div className="mt-2 grid gap-2">
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={2}
              placeholder="Contexto (ex.: Prova de frações, 5º ano)"
              className={fieldClass}
            />
            <textarea
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
              rows={3}
              placeholder="Rubrica / critérios de correção"
              className={fieldClass}
            />
            <textarea
              value={answerKey}
              onChange={(e) => setAnswerKey(e.target.value)}
              rows={3}
              placeholder="Gabarito / respostas esperadas"
              className={fieldClass}
            />
          </div>
        </details>
      </div>

      {/* trabalhos dos alunos */}
      <div className={cardClass}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">2. Trabalhos ({rows.length})</h2>
          <button
            type="button"
            onClick={corrigirTodos}
            disabled={bulkLoading}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {bulkLoading ? 'Corrigindo…' : 'Corrigir todos'}
          </button>
        </div>

        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.key} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={r.studentId}
                  onChange={(e) => patch(r.key, { studentId: e.target.value })}
                  className={`${fieldClass} max-w-[14rem] flex-1`}
                >
                  <option value="">Aluno…</option>
                  {alunosDaTurma.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.fullName}
                    </option>
                  ))}
                </select>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={(e) => onPick(r.key, e.target.files)}
                  className={`${fieldClass} max-w-[12rem] cursor-pointer`}
                />
                <button
                  type="button"
                  onClick={() => corrigir(r)}
                  disabled={r.status === 'loading'}
                  className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-60"
                >
                  {r.status === 'loading' ? '…' : 'Corrigir'}
                </button>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    className="px-2 text-sm text-muted-foreground"
                    aria-label="Remover"
                  >
                    ✕
                  </button>
                )}
              </div>

              {r.previews.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.previews.map((p) => (
                    <img
                      key={p.url}
                      src={p.url}
                      alt="prévia"
                      className="h-16 w-auto rounded border border-border object-cover"
                    />
                  ))}
                </div>
              )}

              {r.error && <p className="mt-2 text-xs text-danger">{r.error}</p>}

              {r.status === 'done' && (
                <div className="mt-2 grid gap-2 sm:grid-cols-[6rem_1fr]">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Nota
                    <input
                      type="number"
                      min={0}
                      max={Number(maxScore)}
                      value={r.score}
                      onChange={(e) => patch(r.key, { score: e.target.value })}
                      className={fieldClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Feedback (vai como observação da nota)
                    <textarea
                      value={r.feedback}
                      onChange={(e) => patch(r.key, { feedback: e.target.value })}
                      rows={3}
                      className={`${fieldClass} text-xs`}
                    />
                  </label>
                </div>
              )}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, newRow()])}
          className="mt-3 rounded-md border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground"
        >
          + Adicionar trabalho
        </button>
      </div>

      {/* lançamento das notas confirmadas */}
      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">3. Lançar no diário</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          {prontos.length} nota(s) pronta(s) (com aluno e nota). A nota é SUGESTÃO; revise antes de
          lançar.
        </p>
        <form action={lancarNotasCorrecaoAction}>
          <input type="hidden" name="classId" value={turmaId} />
          <input type="hidden" name="label" value={label || 'Correção'} />
          <input type="hidden" name="componentId" value={componentId} />
          <input type="hidden" name="items" value={itemsJson} />
          <SubmitButton type="submit" size="sm" disabled={prontos.length === 0}>
            Lançar {prontos.length} nota(s)
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
