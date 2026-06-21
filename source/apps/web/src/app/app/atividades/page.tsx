import { isAiConfigured } from '@on-education/module-ia';
import { listClasses, listSubjects } from '@on-education/module-nucleo';
import { listActivities } from '@on-education/module-pedagogico';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AgentNameText } from '@/components/agent-name-provider';
import { BulkCheckbox, BulkDeleteForm } from '@/components/bulk-delete-form';
import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { GerarAtividadeForm } from '@/components/gerar-atividade-form';
import { SerieFaixaPicker } from '@/components/serie-faixa-picker';
import { SubmitButton } from '@/components/submit-button';
import { FAIXAS, SERIES } from '@/lib/series';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  approveActivityAction,
  bulkDeleteActivitiesAction,
  createActivityAction,
  deleteActivityAction,
  importActivityFileAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Banco de atividades · Edu On Way' };

const KINDS = [
  { value: 'atividade', label: 'Atividade' },
  { value: 'prova', label: 'Prova' },
  { value: 'trabalho', label: 'Trabalho' },
  { value: 'roteiro', label: 'Roteiro' },
];
const kindLabel = (k: string) => KINDS.find((x) => x.value === k)?.label ?? 'Atividade';

export default async function AtividadesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    subject?: string;
    kind?: string;
    gradeLevel?: string;
    ageBand?: string;
  }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const sp = await searchParams;
  const search = {
    approved: true,
    q: sp.q || undefined,
    subject: sp.subject || undefined,
    kind: sp.kind || undefined,
    gradeLevel: sp.gradeLevel || undefined,
    ageBand: sp.ageBand || undefined,
  };
  const [atividades, rascunhos, turmas, disciplinas] = await Promise.all([
    listActivities(db(), ctx, search).catch(() => []),
    listActivities(db(), ctx, { approved: false }).catch(() => []),
    listClasses(db(), ctx).catch(() => []),
    listSubjects(db(), ctx).catch(() => []),
  ]);
  const aiOn = isAiConfigured();
  const temDisciplinas = disciplinas.length > 0;

  return (
    <>
      <PageHeader
        title="Banco de atividades"
        description={<>Atividades, provas, trabalhos e roteiros. Rascunhos do <AgentNameText /> esperam o seu OK.</>}
      />

      {rascunhos.length > 0 && (
        <div className={`${cardClass} border-warning/40`}>
          <h2 className="mb-3 text-sm font-medium text-warning">
            Rascunhos do <AgentNameText /> a revisar ({rascunhos.length})
          </h2>
          <ul className="space-y-2 text-sm">
            {rascunhos.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2"
              >
                <Link
                  href={`/app/atividades/${a.id}`}
                  className="hover:text-primary hover:underline"
                >
                  <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-xs">
                    {kindLabel(a.kind)}
                  </span>
                  {a.title}
                </Link>
                <span className="flex gap-2">
                  <form action={approveActivityAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <SubmitButton type="submit" size="sm">
                      OK, salvar no banco
                    </SubmitButton>
                  </form>
                  <Link
                    href={`/app/atividades/${a.id}`}
                    className="rounded-md border border-border px-3 py-1.5 text-sm"
                  >
                    Editar
                  </Link>
                  <form action={deleteActivityAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <ConfirmButton size="sm" variant="ghost" message={`Descartar "${a.title}"?`}>
                      Descartar
                    </ConfirmButton>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">No banco ({atividades.length})</h2>

          <form method="get" className="mb-3 flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={sp.q ?? ''}
              placeholder="Buscar por título…"
              className={`${fieldClass} w-full sm:w-44`}
            />
            <select name="kind" defaultValue={sp.kind ?? ''} className={`${fieldClass} w-32`}>
              <option value="">Todos os tipos</option>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            {temDisciplinas ? (
              <select name="subject" defaultValue={sp.subject ?? ''} className={`${fieldClass} w-36`}>
                <option value="">Todas as matérias</option>
                {disciplinas.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name="subject"
                defaultValue={sp.subject ?? ''}
                placeholder="Matéria"
                className={`${fieldClass} w-28`}
              />
            )}
            <select
              name="gradeLevel"
              defaultValue={sp.gradeLevel ?? ''}
              className={`${fieldClass} w-32`}
            >
              <option value="">Série</option>
              {SERIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.value}
                </option>
              ))}
            </select>
            <select name="ageBand" defaultValue={sp.ageBand ?? ''} className={`${fieldClass} w-24`}>
              <option value="">Faixa</option>
              {FAIXAS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-md border border-border px-3 text-sm">
              Filtrar
            </button>
            {(sp.q || sp.subject || sp.kind || sp.gradeLevel || sp.ageBand) && (
              <Link href="/app/atividades" className="px-2 text-sm text-muted-foreground">
                Limpar
              </Link>
            )}
          </form>

          {atividades.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma no banco com esse filtro.</p>
          ) : (
            <BulkDeleteForm action={bulkDeleteActivitiesAction} itemLabel="atividades">
              <ul className="space-y-1 text-sm">
                {atividades.map((a) => (
                  <li key={a.id} className="flex items-start gap-2">
                    <span className="pt-0.5">
                      <BulkCheckbox value={a.id} />
                    </span>
                    <span>
                      <Link
                        href={`/app/atividades/${a.id}`}
                        className="text-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-xs">
                          {kindLabel(a.kind)}
                        </span>
                        {a.title}
                      </Link>
                      {(a.subject || a.gradeLevel || a.ageBand || a.applyDate) && (
                        <span className="text-muted-foreground">
                          {' · '}
                          {[
                            a.subject,
                            a.gradeLevel,
                            a.ageBand && `${a.ageBand} anos`,
                            a.applyDate && `📅 ${a.applyDate}`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </BulkDeleteForm>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className={cardClass}>
            <h2 className="mb-1 flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              Gerar com o <AgentNameText />
            </h2>
            <p className="mb-2 text-xs text-muted-foreground">
              O <AgentNameText /> cria e deixa como <strong>rascunho</strong>. Você revisa e dá OK pra ir ao
              banco.
            </p>
            {aiOn ? (
              <GerarAtividadeForm turmas={turmas.map((t) => ({ id: t.id, name: t.name }))} />
            ) : (
              <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                <AgentNameText /> indisponível. Configure <code>ANTHROPIC_API_KEY</code> para gerar atividades.
              </p>
            )}
          </div>

          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Nova atividade (manual)</h2>
            <form action={createActivityAction} className="flex flex-col gap-2">
              <input name="title" required placeholder="Título" className={fieldClass} />
              <div className="flex gap-2">
                <select name="kind" defaultValue="atividade" className={`${fieldClass} w-36`}>
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <input name="subject" placeholder="Disciplina" className={fieldClass} />
              </div>
              <SerieFaixaPicker />
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Data de aplicação (opcional, aparece no calendário)
                <input name="applyDate" type="date" className={fieldClass} />
              </label>
              <textarea name="content" placeholder="Conteúdo" rows={4} className={fieldClass} />
              <input name="tags" placeholder="Tags separadas por vírgula" className={fieldClass} />
              <SubmitButton type="submit" size="sm" variant="outline">
                Salvar atividade
              </SubmitButton>
            </form>
          </div>

          <div className={cardClass}>
            <h2 className="mb-1 text-sm font-medium">Importar de arquivo</h2>
            <p className="mb-2 text-xs text-muted-foreground">
              Suba um PDF ou texto e nós extraímos o conteúdo pro banco. Marque a opção abaixo para o{' '}
              <AgentNameText /> reescrever no seu padrão.
            </p>
            <form action={importActivityFileAction} className="flex flex-col gap-2">
              <input name="title" placeholder="Título (opcional)" className={fieldClass} />
              <div className="flex gap-2">
                <select name="kind" defaultValue="atividade" className={`${fieldClass} w-36`}>
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                {temDisciplinas ? (
                  <select name="subject" defaultValue="" className={fieldClass}>
                    <option value="">Disciplina</option>
                    {disciplinas.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input name="subject" placeholder="Disciplina" className={fieldClass} />
                )}
              </div>
              <SerieFaixaPicker />
              <input
                type="file"
                name="file"
                accept=".pdf,.txt,.md"
                required
                className={`${fieldClass} cursor-pointer`}
              />
              {aiOn && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" name="adaptarPadrao" defaultChecked className="h-4 w-4" />
                  Adaptar ao meu padrão com o <AgentNameText /> (usa a cota de IA)
                </label>
              )}
              <SubmitButton type="submit" size="sm" variant="outline">
                Importar pro banco
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
