'use client';

import { useRef, useState, useTransition } from 'react';

import { askCopilotoAction } from '@/app/app/copiloto/actions';
import { cardClass, fieldClass } from '@/components/form';

const SUGESTOES = [
  'Quantos alunos estão em risco?',
  'Como está o financeiro da escola?',
  'Quantas turmas temos ativas?',
  'Qual o total de alunos matriculados?',
  'Quanto ainda vamos receber este mês?',
];

interface Mensagem {
  role: 'user' | 'assistant';
  content: string;
}

interface CopilotoChatProps {
  snapshot: string;
}

export function CopilotoChat({ snapshot }: CopilotoChatProps) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [pergunta, setPergunta] = useState('');
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function enviar(texto: string) {
    const p = texto.trim();
    if (!p || isPending) return;

    setMensagens((prev) => [...prev, { role: 'user', content: p }]);
    setPergunta('');

    startTransition(async () => {
      const res = await askCopilotoAction(snapshot, p);
      if (res.error) {
        setMensagens((prev) => [...prev, { role: 'assistant', content: `Erro: ${res.error}` }]);
      } else {
        setMensagens((prev) => [...prev, { role: 'assistant', content: res.text ?? '' }]);
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    enviar(pergunta);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar(pergunta);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Sugestoes */}
      <div className={cardClass}>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Perguntas sugeridas</p>
        <div className="flex flex-wrap gap-2">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => enviar(s)}
              disabled={isPending}
              className="rounded-full border border-border px-3 py-1 text-xs transition-colors hover:bg-accent disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Historico de mensagens */}
      {mensagens.length > 0 && (
        <div className={`${cardClass} flex flex-col gap-3`}>
          {mensagens.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'ml-auto max-w-[80%] bg-primary text-primary-foreground'
                  : 'mr-auto max-w-[80%] border border-border bg-muted'
              }`}
            >
              {m.content}
            </div>
          ))}
          {isPending && (
            <div className="mr-auto max-w-[80%] rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              Consultando...
            </div>
          )}
        </div>
      )}

      {/* Campo de pergunta */}
      <div className={cardClass}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            ref={inputRef}
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Faça uma pergunta sobre a escola..."
            rows={2}
            disabled={isPending}
            className={`${fieldClass} resize-none`}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Enter para enviar, Shift+Enter para nova linha.</p>
            <button
              type="submit"
              disabled={isPending || !pergunta.trim()}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? 'Consultando...' : 'Perguntar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
