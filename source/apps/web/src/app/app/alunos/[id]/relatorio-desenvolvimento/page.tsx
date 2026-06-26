import { isAiConfigured } from '@on-education/module-ia';
import { notFound, redirect } from 'next/navigation';

import { AgentNameText } from '@/components/agent-name-provider';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import { buildStudentSummary } from '@/server/student-report';

import { gerarRelatorioDesenvolvimentoAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Relatorio de Desenvolvimento · Edu On Way' };

export default async function RelatorioDesenvolvimentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;

  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  const resumo = await buildStudentSummary(db(), ctx, id).catch(() => null);
  if (!resumo) notFound();

  const aiOn = isAiConfigured();

  return (
    <>
      <PageHeader
        title={`Relatorio de Desenvolvimento · ${resumo.studentName}`}
        description="Preencha as observacoes e o WayOn monta o relatorio completo. O rascunho ficara disponivel em Rascunhos para revisao e avaliacao."
        back={{ href: `/app/alunos/${id}`, label: 'Voltar ao aluno' }}
      />

      {erro === '1' && (
        <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Nao foi possivel gerar o relatorio no momento. Verifique se a IA esta configurada e tente novamente.
        </div>
      )}

      {/* Resumo dos dados do aluno */}
      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Dados do aluno</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-semibold">{resumo.average}</div>
            <div className="text-xs text-muted-foreground">Media</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">{resumo.attendance}</div>
            <div className="text-xs text-muted-foreground">Frequencia</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">{resumo.gradeCount}</div>
            <div className="text-xs text-muted-foreground">Notas registradas</div>
          </div>
        </div>
        {resumo.gradeLines.length > 0 && (
          <ul className="mt-3 space-y-0.5 text-xs text-muted-foreground">
            {resumo.gradeLines.map((l) => (
              <li key={l}>{l.replace(/^- /, '')}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Formulario de observacoes do professor */}
      {aiOn ? (
        <form action={gerarRelatorioDesenvolvimentoAction} className={`${cardClass} flex flex-col gap-4`}>
          <input type="hidden" name="studentId" value={id} />

          <div className="flex flex-col gap-1">
            <label htmlFor="periodo" className="text-sm font-medium">
              Periodo de avaliacao
            </label>
            <input
              id="periodo"
              name="periodo"
              type="text"
              placeholder="Ex.: 2 bimestre, 1 semestre 2025"
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="descricaoGeral" className="text-sm font-medium">
              Descricao geral
            </label>
            <p className="text-xs text-muted-foreground">
              Como foi o desempenho geral do aluno neste periodo?
            </p>
            <textarea
              id="descricaoGeral"
              name="descricaoGeral"
              rows={3}
              placeholder="Descreva o desempenho geral, participacao, atitude..."
              className={`${fieldClass} resize-none`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="pontosFortes" className="text-sm font-medium">
              Pontos fortes
            </label>
            <p className="text-xs text-muted-foreground">
              O que o aluno demonstrou de positivo?
            </p>
            <textarea
              id="pontosFortes"
              name="pontosFortes"
              rows={3}
              placeholder="Habilidades, atitudes, conteudos em que se destacou..."
              className={`${fieldClass} resize-none`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="dificuldades" className="text-sm font-medium">
              Dificuldades
            </label>
            <p className="text-xs text-muted-foreground">
              Quais aspectos precisam de atencao ou reforco?
            </p>
            <textarea
              id="dificuldades"
              name="dificuldades"
              rows={3}
              placeholder="Conteudos, habilidades ou comportamentos com dificuldade..."
              className={`${fieldClass} resize-none`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="evolucao" className="text-sm font-medium">
              Evolucao observada
            </label>
            <p className="text-xs text-muted-foreground">
              Como o aluno evoluiu em relacao ao periodo anterior?
            </p>
            <textarea
              id="evolucao"
              name="evolucao"
              rows={3}
              placeholder="Progresso, mudancas de atitude, superacao de dificuldades..."
              className={`${fieldClass} resize-none`}
            />
          </div>

          <div className="flex items-center gap-3">
            <SubmitButton type="submit">
              Gerar relatorio com o <AgentNameText />
            </SubmitButton>
            <p className="text-xs text-muted-foreground">
              O rascunho sera criado em Rascunhos para revisao.
            </p>
          </div>
        </form>
      ) : (
        <div className={cardClass}>
          <p className="text-sm text-muted-foreground">
            Configure <code>ANTHROPIC_API_KEY</code> para o <AgentNameText /> gerar o relatorio.
          </p>
        </div>
      )}
    </>
  );
}
