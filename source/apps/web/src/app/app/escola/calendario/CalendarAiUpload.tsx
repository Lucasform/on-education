'use client';

import { useState, useRef, useTransition } from 'react';

import { useAgentName } from '@/components/agent-name-provider';

import { createCalendarEventAction } from './actions';

interface ExtractedEvent {
  date: string;
  name: string;
  type: string;
}

const TYPE_LABELS: Record<string, string> = {
  holiday: 'Feriado',
  commemorative: 'Data comemorativa',
  no_school: 'Sem aula',
  school_day: 'Dia letivo especial',
};

const TYPE_DOT: Record<string, string> = {
  holiday: 'bg-red-500',
  no_school: 'bg-orange-400',
  commemorative: 'bg-blue-500',
  school_day: 'bg-green-500',
};

export function CalendarAiUpload() {
  const agentName = useAgentName();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [events, setEvents] = useState<ExtractedEvent[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [savedCount, setSavedCount] = useState<number | null>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError(null);
    setEvents([]);
    setSelected(new Set());
    setSavedCount(null);
    setUploading(true);

    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/ia/calendario', { method: 'POST', body: form });
      const data = (await res.json()) as { events?: ExtractedEvent[]; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? 'Erro ao processar o calendário.');
        return;
      }
      const extracted = data.events ?? [];
      setEvents(extracted);
      setSelected(new Set(extracted.map((_, i) => i)));
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function handleSave() {
    const toSave = events.filter((_, i) => selected.has(i));
    if (toSave.length === 0) return;
    startSaving(async () => {
      for (const e of toSave) {
        const fd = new FormData();
        fd.append('date', e.date);
        fd.append('name', e.name);
        fd.append('type', e.type);
        await createCalendarEventAction(fd);
      }
      setSavedCount(toSave.length);
      setEvents([]);
      setSelected(new Set());
      if (fileRef.current) fileRef.current.value = '';
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">
            Calendário escolar (imagem ou PDF)
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
          />
        </div>
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {uploading ? 'Analisando...' : `Analisar com ${agentName}`}
        </button>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {savedCount !== null && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          {savedCount} evento{savedCount !== 1 ? 's' : ''} adicionado{savedCount !== 1 ? 's' : ''} ao calendário.
        </p>
      )}

      {events.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {events.length} data{events.length !== 1 ? 's' : ''} encontrada{events.length !== 1 ? 's' : ''} — selecione as que deseja adicionar:
            </p>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSelected(new Set(events.map((_, i) => i)))}
                className="text-primary hover:underline"
              >
                Todas
              </button>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-muted-foreground hover:underline"
              >
                Nenhuma
              </button>
            </div>
          </div>

          <ul className="max-h-72 divide-y divide-border/50 overflow-y-auto rounded-md border border-border">
            {events.map((e, i) => (
              <li
                key={i}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-accent/50 ${selected.has(i) ? '' : 'opacity-50'}`}
                onClick={() => toggle(i)}
              >
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggle(i)}
                  onClick={(ev) => ev.stopPropagation()}
                  className="h-4 w-4 shrink-0"
                />
                <span className={`h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[e.type] ?? 'bg-muted-foreground'}`} />
                <span className="font-medium tabular-nums">{e.date.split('-').reverse().join('/')}</span>
                <span className="flex-1">{e.name}</span>
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                  {TYPE_LABELS[e.type] ?? e.type}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || selected.size === 0}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : `Adicionar ${selected.size} selecionada${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
