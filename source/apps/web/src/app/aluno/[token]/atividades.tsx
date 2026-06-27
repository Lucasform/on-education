'use client';

import { useState } from 'react';
import { WorksheetView } from '@/components/worksheet-view';

type Assignment = {
  id: string;
  status: string;
  dueDate?: string | null;
  activityId: string;
  title: string;
  kind: string;
  content: string;
};

const KIND_LABEL: Record<string, string> = {
  texto: 'Texto',
  folha: 'Folha de atividade',
  quiz: 'Quiz',
  video: 'Video',
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function AssignmentCard({
  token,
  assignment,
  onConcluir,
}: {
  token: string;
  assignment: Assignment;
  onConcluir: (id: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [concluida, setConcluida] = useState(assignment.status === 'concluida');

  async function marcarConcluida() {
    setConcluindo(true);
    try {
      const res = await fetch('/api/aluno/atividade', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, assignmentId: assignment.id, done: true }),
      });
      if (res.ok) {
        setConcluida(true);
        onConcluir(assignment.id);
      }
    } finally {
      setConcluindo(false);
    }
  }

  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 transition-all ${
        concluida ? 'ring-emerald-200' : 'ring-violet-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                concluida
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-violet-100 text-violet-700'
              }`}
            >
              {concluida ? 'Concluida' : 'Pendente'}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {KIND_LABEL[assignment.kind] ?? assignment.kind}
            </span>
            {assignment.dueDate && (
              <span className="text-xs text-gray-400">
                Prazo: {formatDate(assignment.dueDate)}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-800 leading-snug">{assignment.title}</h3>
        </div>

        <div className="flex shrink-0 gap-2">
          {assignment.content && (
            <button
              onClick={() => setAberto((v) => !v)}
              className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100"
            >
              {aberto ? 'Fechar' : 'Ver'}
            </button>
          )}
          {!concluida && (
            <button
              onClick={marcarConcluida}
              disabled={concluindo}
              className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
            >
              {concluindo ? '...' : 'Concluir'}
            </button>
          )}
          {concluida && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <span>✓</span>
              <span>Feito!</span>
            </span>
          )}
        </div>
      </div>

      {aberto && assignment.content && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <WorksheetView infantil={false}>{assignment.content}</WorksheetView>
        </div>
      )}
    </div>
  );
}

export function AlunoAtividades({
  token,
  assignments: initialAssignments,
}: {
  token: string;
  assignments: Assignment[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);

  function handleConcluir(id: string) {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'concluida' } : a)),
    );
  }

  const pendentes = assignments.filter((a) => a.status !== 'concluida');
  const concluidas = assignments.filter((a) => a.status === 'concluida');

  if (assignments.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-violet-100">
        <div className="mb-3 text-4xl">📭</div>
        <p className="font-medium text-gray-700">Nenhuma atividade por enquanto</p>
        <p className="mt-1 text-sm text-gray-400">
          Quando seu professor mandar uma atividade, ela aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pendentes.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Para fazer ({pendentes.length})
          </p>
          {pendentes.map((a) => (
            <AssignmentCard
              key={a.id}
              token={token}
              assignment={a}
              onConcluir={handleConcluir}
            />
          ))}
        </div>
      )}

      {concluidas.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Concluidas ({concluidas.length})
          </p>
          {concluidas.map((a) => (
            <AssignmentCard
              key={a.id}
              token={token}
              assignment={a}
              onConcluir={handleConcluir}
            />
          ))}
        </div>
      )}
    </div>
  );
}
