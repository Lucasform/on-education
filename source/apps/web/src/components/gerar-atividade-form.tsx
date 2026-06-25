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
export function GerarAtividadeForm({
  turmas,
  imagesAllowed = false,
}: {
  turmas: { id: string; name: string }[];
  imagesAllowed?: boolean;
}) {
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
      <textarea
        name="topic"
        required
        rows={3}
        placeholder={
          'Descreva a atividade. Modelo: "Atividade de Português para o 1º ano sobre a vogal E. ' +
          'Quero 3 exercícios: cobrir a letra pontilhada, pintar figuras que começam com E e ' +
          'completar palavras. Com figuras simples para colorir."'
        }
        className={fieldClass}
      />
      <p className="-mt-1 text-[11px] text-muted-foreground">
        Quanto melhor a descrição, melhor a atividade. Diga a matéria, a série/idade, o tema, os
        tipos de exercício e quantos. Por padrão saem ~2 páginas com poucos exercícios; peça mais
        se quiser.
      </p>
      <input name="subject" placeholder="Disciplina (opcional)" className={fieldClass} />
      <SerieFaixaPicker />

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Quantidade de exercícios
        <select name="exerciseCount" defaultValue="8" className={`${fieldClass} w-40`}>
          <option value="">Automático</option>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'exercício' : 'exercícios'}
            </option>
          ))}
        </select>
      </label>

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

      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Data de aplicação (opcional, aparece no calendário)
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

      {imagesAllowed && (
        <label className="flex items-start gap-2 rounded-md border border-border bg-muted/20 p-2 text-xs text-muted-foreground">
          <input type="checkbox" name="withImages" className="mt-0.5 h-4 w-4" />
          <span>
            Gerar com figuras (ilustrações para colorir — ideal na educação infantil). Usa a sua
            cota de imagens; até 6 por folha.
          </span>
        </label>
      )}

      <SubmitButton type="submit" size="sm">
        Gerar com o {agentName}
      </SubmitButton>
    </form>
  );
}
