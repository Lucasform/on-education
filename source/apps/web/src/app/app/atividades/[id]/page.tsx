import { getTenantSettings } from '@on-education/module-nucleo';
import { getActivity } from '@on-education/module-pedagogico';
import { notFound, redirect } from 'next/navigation';

import { AgentNameText } from '@/components/agent-name-provider';
import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { WorksheetView } from '@/components/worksheet-view';
import { PrintButton } from '@/components/print-button';
import { SerieFaixaPicker } from '@/components/serie-faixa-picker';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { isAiConfigured } from '@on-education/module-ia';

import {
  adaptActivityAction,
  approveActivityAction,
  deleteActivityAction,
  duplicateActivityAction,
  updateActivityAction,
} from '../../actions';

const KINDS = [
  { value: 'atividade', label: 'Atividade' },
  { value: 'prova', label: 'Prova' },
  { value: 'trabalho', label: 'Trabalho' },
  { value: 'roteiro', label: 'Roteiro' },
];

export const dynamic = 'force-dynamic';

export default async function AtividadeDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [atividade, settings] = await Promise.all([
    getActivity(client, ctx, id).catch(() => null),
    getTenantSettings(client, ctx).catch(() => null),
  ]);
  if (!atividade) notFound();
  const aiOn = isAiConfigured();

  return (
    <>
      {/* Impressão limpa: zera a margem da página (remove data/URL/nº do navegador) e dá a
          margem da folha pelo padding do .print-sheet. */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            '@media print{@page{size:A4;margin:0}.print-sheet{padding:16mm 14mm!important;border:0!important;box-shadow:none!important;max-width:none!important}}',
        }}
      />
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <PageHeader
          title={atividade.title}
          back={{ href: '/app/atividades', label: 'Voltar ao banco' }}
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <a
            href={`/app/atividades/${id}/word`}
            className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            Baixar Word
          </a>
          <PrintButton label="Imprimir / PDF" />
        </div>
      </div>

      {/* documento imprimível, no padrão da escola/professor (identidade no cabeçalho) */}
      <article className={`${cardClass} print-sheet print:border-0 print:shadow-none`}>
        <header className="mb-4 flex items-center gap-3 border-b border-border pb-4">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <span className="h-12 w-12 rounded-lg bg-primary print:hidden" />
          )}
          <div>
            <h1 className="text-xl font-bold leading-tight">{atividade.title}</h1>
            <p className="text-xs text-muted-foreground">
              {atividade.subject ? <span>{atividade.subject}</span> : null}
              {atividade.aiGenerated ? (
                <span className="print:hidden">
                  {atividade.subject ? ' · ' : ''}Gerado pelo <AgentNameText />
                </span>
              ) : null}
            </p>
          </div>
        </header>

        {/* Cabeçalho padrão do aluno (na folha e na impressão); os exercícios vêm da IA */}
        <div className="mb-5 flex flex-wrap gap-x-10 gap-y-2 text-sm">
          {['Nome', 'Turma', 'Data'].map((label) => (
            <span key={label} className="flex flex-1 items-end gap-2">
              {label}:
              <span
                className={`inline-block border-b border-foreground/40 ${label === 'Nome' ? 'min-w-[14rem] flex-1' : 'min-w-[6rem]'}`}
              >
                &nbsp;
              </span>
            </span>
          ))}
        </div>

        {atividade.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1 print:hidden">
            {atividade.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {atividade.content ? (
          <WorksheetView>{atividade.content}</WorksheetView>
        ) : (
          <p className="text-sm text-muted-foreground">Sem conteúdo.</p>
        )}
      </article>

      {!atividade.approved && (
        <div
          className={`${cardClass} flex flex-wrap items-center justify-between gap-2 border-warning/40 print:hidden`}
        >
          <p className="text-sm text-warning">
            Este é um rascunho do <AgentNameText />. Revise e dê OK para ir ao banco.
          </p>
          <form action={approveActivityAction}>
            <input type="hidden" name="id" value={atividade.id} />
            <SubmitButton type="submit" size="sm">
              OK, salvar no banco
            </SubmitButton>
          </form>
        </div>
      )}

      {/* reuso 1-clique: duplicar e duplicar-e-adaptar (não aparece na impressão) */}
      <div className={`${cardClass} print:hidden`}>
        <h2 className="mb-1 text-sm font-medium">Reaproveitar</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Crie uma nova a partir desta, sem começar do zero.
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-start">
          <form action={duplicateActivityAction}>
            <input type="hidden" name="id" value={atividade.id} />
            <SubmitButton type="submit" size="sm" variant="outline">
              Duplicar igual
            </SubmitButton>
          </form>

          {aiOn ? (
            <form action={adaptActivityAction} className="flex flex-1 flex-col gap-2">
              <input type="hidden" name="sourceId" value={atividade.id} />
              <div className="flex gap-2">
                <input
                  name="instruction"
                  required
                  placeholder="Como adaptar? ex.: deixe mais fácil, adapte pro 5º ano, foque em frações…"
                  className={`${fieldClass} flex-1`}
                />
                <select name="kind" defaultValue="" className={`${fieldClass} w-36`}>
                  <option value="">Mesmo tipo</option>
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      Virar {k.label.toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <SubmitButton type="submit" size="sm">
                Duplicar e adaptar com o <AgentNameText />
              </SubmitButton>
              <p className="text-[11px] text-muted-foreground">
                Gera um rascunho pra você revisar antes de salvar no banco.
              </p>
            </form>
          ) : (
            <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
              Configure <code>ANTHROPIC_API_KEY</code> para adaptar com o <AgentNameText />.
            </p>
          )}
        </div>
      </div>

      {/* edição da atividade (não aparece na impressão) */}
      <details className={`${cardClass} print:hidden`}>
        <summary className="cursor-pointer text-sm font-medium">Editar</summary>
        <form action={updateActivityAction} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="id" value={atividade.id} />
          <input
            name="title"
            defaultValue={atividade.title}
            required
            placeholder="Título"
            className={fieldClass}
          />
          <div className="flex gap-2">
            <select name="kind" defaultValue={atividade.kind} className={`${fieldClass} w-36`}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <input
              name="subject"
              defaultValue={atividade.subject ?? ''}
              placeholder="Disciplina"
              className={fieldClass}
            />
          </div>
          <SerieFaixaPicker
            defaultSerie={atividade.gradeLevel ?? ''}
            defaultFaixa={atividade.ageBand ?? ''}
          />
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Data de aplicação (opcional, aparece no calendário)
            <input
              name="applyDate"
              type="date"
              defaultValue={atividade.applyDate ?? ''}
              className={fieldClass}
            />
          </label>
          <textarea
            name="content"
            defaultValue={atividade.content}
            rows={10}
            className={`${fieldClass} font-mono text-xs`}
          />
          <SubmitButton type="submit" size="sm">
            Salvar alterações
          </SubmitButton>
        </form>
        <form action={deleteActivityAction} className="mt-2 border-t border-border pt-2">
          <input type="hidden" name="id" value={atividade.id} />
          <ConfirmButton size="sm" variant="ghost" message="Excluir esta atividade do banco?">
            Excluir do banco
          </ConfirmButton>
        </form>
      </details>
    </>
  );
}
