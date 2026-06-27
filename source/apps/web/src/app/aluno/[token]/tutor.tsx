'use client';

import { useState, useRef, useEffect } from 'react';

type TutorMsg = {
  role: 'user' | 'tutor';
  body: string;
  createdAt: string;
};

function TutorBubble({ msg }: { msg: TutorMsg }) {
  const ehAluno = msg.role === 'user';
  return (
    <div className={`flex ${ehAluno ? 'justify-end' : 'justify-start'}`}>
      {!ehAluno && (
        <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm">
          🤖
        </div>
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

export function AlunoTutor({
  token,
  historico: initialHistorico,
  usadoHoje: initialUsado,
  limite,
}: {
  token: string;
  historico: TutorMsg[];
  usadoHoje: number;
  limite: number;
}) {
  const [historico, setHistorico] = useState(initialHistorico);
  const [usadoHoje, setUsadoHoje] = useState(initialUsado);
  const [pergunta, setPergunta] = useState('');
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const atingiuLimite = usadoHoje >= limite;
  const restantes = Math.max(0, limite - usadoHoje);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [historico, pensando]);

  async function enviar() {
    const texto = pergunta.trim();
    if (!texto || pensando || atingiuLimite) return;

    setErro('');
    setPergunta('');
    setPensando(true);

    const msgAluno: TutorMsg = {
      role: 'user',
      body: texto,
      createdAt: new Date().toISOString(),
    };
    setHistorico((prev) => [...prev, msgAluno]);

    try {
      const res = await fetch('/api/aluno/tutor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, pergunta: texto }),
      });
      const data = (await res.json()) as {
        text?: string;
        used?: number;
        limit?: number;
        limited?: boolean;
        error?: string;
      };

      if (data.limited) {
        setUsadoHoje(limite);
        setErro('Voce chegou no limite de perguntas de hoje. Volte amanha!');
        return;
      }
      if (data.error || typeof data.text !== 'string') {
        setErro('Algo deu errado. Tente de novo em instantes.');
        return;
      }
      const msgTutor: TutorMsg = {
        role: 'tutor',
        body: data.text,
        createdAt: new Date().toISOString(),
      };
      setHistorico((prev) => [...prev, msgTutor]);
      if (typeof data.used === 'number') setUsadoHoje(data.used);
    } catch {
      setErro('Sem conexao. Verifique a internet e tente novamente.');
    } finally {
      setPensando(false);
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
      {/* Cabecalho do tutor */}
      <div className="border-b border-violet-100 bg-violet-50/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-800 text-sm">Tutor IA</p>
            <p className="text-xs text-gray-500 leading-snug mt-0.5">
              Estou aqui para te ajudar a pensar, nao para dar a resposta pronta.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className={`text-xs font-medium ${
                atingiuLimite ? 'text-red-500' : restantes <= 3 ? 'text-orange-500' : 'text-violet-600'
              }`}
            >
              {atingiuLimite ? 'Limite atingido' : `${restantes} pergunta${restantes === 1 ? '' : 's'} restante${restantes === 1 ? '' : 's'}`}
            </p>
            <p className="text-xs text-gray-400">hoje</p>
          </div>
        </div>
      </div>

      {/* Historico de conversa */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[260px] max-h-[400px]">
        {historico.length === 0 && !pensando && (
          <div className="flex h-full items-center justify-center text-center py-6">
            <div>
              <div className="mb-2 text-3xl">🤖</div>
              <p className="text-sm font-medium text-gray-600">Ola! Tenho uma duvida?</p>
              <p className="mt-1 text-xs text-gray-400">
                Me conta o que esta estudando e eu te ajudo a pensar.
              </p>
            </div>
          </div>
        )}

        {historico.map((msg, i) => (
          <TutorBubble key={i} msg={msg} />
        ))}

        {pensando && (
          <div className="flex justify-start">
            <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm">
              🤖
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 shadow-sm ring-1 ring-violet-100">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Aviso de erro ou limite */}
      {erro && (
        <div className="mx-4 mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 ring-1 ring-red-200">
          {erro}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-violet-100 px-3 py-3">
        {atingiuLimite ? (
          <div className="rounded-xl bg-orange-50 p-3 text-center text-xs text-orange-700 ring-1 ring-orange-200">
            Voce usou todas as suas perguntas de hoje. Que otimo que estudou bastante! Volte amanha.
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={pensando}
              placeholder="Escreva sua duvida aqui... (Enter para enviar)"
              rows={2}
              className="flex-1 resize-none rounded-xl border border-violet-200 bg-violet-50/40 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
            <button
              onClick={() => void enviar()}
              disabled={!pergunta.trim() || pensando}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition-all hover:bg-primary/90 disabled:opacity-40"
              aria-label="Enviar pergunta"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
