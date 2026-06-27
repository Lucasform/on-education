'use client';

import { useState, type ReactNode } from 'react';

type Tab = 'atividades' | 'tutor' | 'mensagens';

const TAB_LABELS: Record<Tab, string> = {
  atividades: 'Atividades',
  tutor: 'Tutor IA',
  mensagens: 'Mensagens',
};

const TAB_ICONS: Record<Tab, string> = {
  atividades: '📚',
  tutor: '🤖',
  mensagens: '💬',
};

export function AlunoTabs({
  token: _token,
  atividades,
  tutor,
  mensagens,
}: {
  token: string;
  atividades: ReactNode;
  tutor: ReactNode;
  mensagens: ReactNode;
}) {
  const [aba, setAba] = useState<Tab>('atividades');

  const content: Record<Tab, ReactNode> = { atividades, tutor, mensagens };

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-5 flex gap-2 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-violet-100">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setAba(t)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              aba === t
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-500 hover:bg-violet-50 hover:text-gray-700'
            }`}
          >
            <span>{TAB_ICONS[t]}</span>
            <span className="hidden sm:inline">{TAB_LABELS[t]}</span>
            <span className="sm:hidden">{TAB_LABELS[t].split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Conteudo da aba ativa */}
      <div>{content[aba]}</div>
    </div>
  );
}
