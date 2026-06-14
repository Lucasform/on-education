'use client';

import { useState } from 'react';

import { generateActivityAction } from '@/app/app/actions';
import { useAgentName } from '@/components/agent-name-provider';
import { fieldClass } from '@/components/form';
import { SerieFaixaPicker } from '@/components/serie-faixa-picker';
import { SubmitButton } from '@/components/submit-button';

/**
 * Form de geração de conteúdo pelo WayOn. Quando o tipo é "Trabalho", abre campos extras:
 * individual ou em grupo (com nº de alunos) e os materiais sugeridos para os alunos usarem.
 */
export function GerarAtividadeForm({ turmas }: { turmas: { id: string; name: string }[] }) {
  const agentName = useAgentName();
  const [kind, setKind] = useState('atividade');
  const [workMode, setWorkMode] = useState('individual');
  const isTrabalho = kind === 'trabalho';

  return (
    <form action={generateActivityAction} className="flex flex-col gap-2">
      <select
        name="kind"
        value={kind}
        onChange={(e) => setKind(e.target.value)}
        className={fieldClass}
      >
        <option value="atividade">Atividade</option>
        <option value="prova">Prova</option>
        <option value="trabalho">Trabalho</option>
        <option value="roteiro">Roteiro de estudo</option>
      </select>
      <input
        name="topic"
        required
        placeholder="Tema (ex.: interpretação de texto, 5º ano)"
        className={fieldClass}
      />
      <input name="subject" placeholder="Disciplina (opcional)" className={fieldClass} />
      <SerieFaixaPicker />

      {isTrabalho && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              name="workMode"
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value)}
              className={`${fieldClass} w-40`}
            >
              <option value="individual">Individual</option>
              <option value="grupo">Em grupo</option>
            </select>
            {workMode === 'grupo' && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Alunos por grupo
                <input
                  name="groupSize"
                  type="number"
                  min={2}
                  max={20}
                  defaultValue={3}
                  className={`${fieldClass} w-20`}
                />
              </label>
            )}
          </div>
          <textarea
            name="suggestedMaterials"
            rows={2}
            placeholder="Materiais que os alunos devem usar (ex.: cartolina, pesquisa em sites confiáveis, livro didático cap. 4)"
            className={fieldClass}
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Aplicar em (opcional, vai pro calendário)
        <input name="applyDate" type="date" className={fieldClass} />
      </label>

      {turmas.length > 0 && (
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Basear nos materiais de uma turma (opcional)
          <select name="classId" defaultValue="" className={fieldClass}>
            <option value="">Sem material — gerar do zero</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <SubmitButton type="submit" size="sm">
        Gerar com o {agentName}
      </SubmitButton>
    </form>
  );
}
