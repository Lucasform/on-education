'use client';

import { useState, useRef, useEffect } from 'react';

type Mensagem = {
  id: string;
  body: string;
  fromStudent: boolean;
  authorName: string;
  createdAt: string;
};

function MsgBubble({ msg }: { msg: Mensagem }) {
  const ehAluno = msg.fromStudent;
  return (
    <div className={`flex flex-col ${ehAluno ? 'items-end' : 'items-start'}`}>
      {!ehAluno && (
        <span className="mb-0.5 ml-1 text-xs font-medium text-gray-500">{msg.authorName}</span>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          ehAluno
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-white text-gray-800 shadow-sm ring-1 ring-violet-100 rounded-bl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap">{msg.body}</p>
      </div>
    </div>
  );
}

export function AlunoMensagens({
  token,
  mensagens: initialMensagens,
}: {
  token: string;
  mensagens: Mensagem[];
}) {
  const [mensagens, setMensagens] = useState(initialMensagens);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  async function enviar() {
    const body = texto.trim();
    if (!body || enviando) return;

    setErro('');
    setTexto('');
    setEnviando(true);

    const msgOtimista: Mensagem = {
      id: `tmp-${Date.now()}`,
      body,
      fromStudent: true,
      authorName: 'Voce',
      createdAt: new Date().toISOString(),
    };
    setMensagens((prev) => [...prev, msgOtimista]);

    try {
      const res = await fetch('/api/aluno/mensagem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, body }),
      });
      const data = (await res.json()) as { ok: true } | { error: string };
      if ('error' in data) {
        setErro('Nao foi possivel enviar. Tente novamente.');
        setMensagens((prev) => prev.filter((m) => m.id !== msgOtimista.id));
      }
    } catch {
      setErro('Sem conexao. Tente novamente.');
      setMensagens((prev) => prev.filter((m) => m.id !== msgOtimista.id));
    } finally {
      setEnviando(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void enviar();
    }
  }

  return (
    <div className="flex flex-col rounded-3xl bg-white shadow-sm ring-1 ring-violet-100 overflow-hidden">
      {/* Cabecalho */}
      <div className="border-b border-violet-100 bg-violet-50/60 px-4 py-3">
        <p className="font-semibold text-gray-800 text-sm">Conversa com o professor</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Tire duvidas, mande um aviso ou so diga oi!
        </p>
      </div>

      {/* Lista de mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[260px] max-h-[400px]">
        {mensagens.length === 0 && (
          <div className="flex h-full items-center justify-center text-center py-8">
            <div>
              <div className="mb-2 text-3xl">💬</div>
              <p className="text-sm font-medium text-gray-600">Nenhuma mensagem ainda</p>
              <p className="mt-1 text-xs text-gray-400">
                Mande uma oi para o seu professor!
              </p>
            </div>
          </div>
        )}

        {mensagens.map((m) => (
          <MsgBubble key={m.id} msg={m} />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Aviso de erro */}
      {erro && (
        <div className="mx-4 mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 ring-1 ring-red-200">
          {erro}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-violet-100 px-3 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={enviando}
            placeholder="Escreva uma mensagem... (Enter para enviar)"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-violet-200 bg-violet-50/40 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          />
          <button
            onClick={() => void enviar()}
            disabled={!texto.trim() || enviando}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition-all hover:bg-primary/90 disabled:opacity-40"
            aria-label="Enviar mensagem"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
