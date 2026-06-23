import { SubmitButton } from '@/components/submit-button';
import { isAiConfigured } from '@on-education/module-ia';
import { countCommunicationReads, listCommunications } from '@on-education/module-comunicacao';
import { getWhatsappConnection, listClasses } from '@on-education/module-nucleo';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AgentNameText } from '@/components/agent-name-provider';
import { ConfirmButton } from '@/components/confirm-button';
import { ComunicacaoTabs } from '@/components/comunicacao-tabs';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { isEmailConfigured } from '@/server/email';

import {
  broadcastComunicadoEmailAction,
  broadcastComunicadoWhatsappAction,
  createCommunicationAction,
  deleteCommunicationAction,
  generateCommunicationAction,
  publishCommunicationAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Comunicados · Edu On Way' };

export default async function ComunicadosPage({
  searchParams,
}: {
  searchParams: Promise<{ turma?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const sp = await searchParams;
  const client = db();
  const [comunicados, turmas, wa, readCounts] = await Promise.all([
    listCommunications(client, ctx).catch(() => []),
    ctx.tenantType === 'organization' ? listClasses(client, ctx).catch(() => []) : Promise.resolve([]),
    getWhatsappConnection(client, ctx).catch(() => null),
    countCommunicationReads(client, ctx).catch(() => ({}) as Record<string, number>),
  ]);
  const aiOn = isAiConfigured();
  const emailOn = isEmailConfigured();
  const waFlash = (await cookies()).get('oe_wa_flash')?.value;
  const turmaFiltro = sp.turma ?? '';
  const comunicadosFiltrados = turmaFiltro
    ? comunicados.filter((c) => (c as { classId?: string | null }).classId === turmaFiltro)
    : comunicados;
  const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));

  return (
    <>
      <PageHeader title="Comunicados" description="Escreva ou gere comunicados e publique." />
      <ComunicacaoTabs />

      {waFlash && (
        <div className="mb-4 rounded-md border border-border bg-muted p-3 text-sm">{waFlash}</div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Novo comunicado</h2>
          <form action={createCommunicationAction} className="flex flex-col gap-2">
            <input name="title" required placeholder="Título" className={fieldClass} />
            <textarea
              name="body"
              rows={5}
              placeholder="Texto do comunicado"
              className={fieldClass}
            />
            {turmas.length > 0 && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Destinatários (opcional)
                </label>
                <select name="classId" className={fieldClass} defaultValue="">
                  <option value="">Todos — comunicado geral</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      Apenas {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <SubmitButton type="submit" size="sm">
              Salvar rascunho
            </SubmitButton>
          </form>
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Gerar com o <AgentNameText /></h2>
          {aiOn ? (
            <form action={generateCommunicationAction} className="flex flex-col gap-2">
              <textarea
                name="prompt"
                required
                rows={5}
                placeholder="Descreva o comunicado (ex.: reunião de pais dia 20/06 às 19h no auditório)"
                className={fieldClass}
              />
              <SubmitButton type="submit" size="sm">
                Gerar rascunho
              </SubmitButton>
            </form>
          ) : (
            <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
              <AgentNameText /> indisponível. Configure <code>ANTHROPIC_API_KEY</code> para gerar comunicados.
            </p>
          )}
        </div>
      </div>

      <div className={cardClass}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">
            Comunicados ({comunicadosFiltrados.length}
            {comunicadosFiltrados.length !== comunicados.length ? ` de ${comunicados.length}` : ''})
          </h2>
          {turmas.length > 0 && (
            <form method="get" className="flex gap-2">
              <select
                name="turma"
                defaultValue={turmaFiltro}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                <option value="">Todos</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button type="submit" className="rounded-md border border-border px-2 py-1 text-xs">
                Filtrar
              </button>
            </form>
          )}
        </div>
        {comunicadosFiltrados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum comunicado ainda.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {comunicadosFiltrados.map((c) => {
              const classId = (c as { classId?: string | null }).classId;
              return (
              <li key={c.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {c.title}{' '}
                    <span className="text-muted-foreground">
                      · {c.status === 'published' ? 'publicado' : 'rascunho'}
                      {c.aiGenerated ? <> · <AgentNameText /></> : ''}
                      {classId && turmaNome.get(classId) ? ` · ${turmaNome.get(classId)}` : ''}
                    </span>
                    {c.status === 'published' && (
                      <span
                        className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success"
                        title="Responsáveis que abriram este comunicado no portal"
                      >
                        👁 {readCounts[c.id] ?? 0} {(readCounts[c.id] ?? 0) === 1 ? 'leitura' : 'leituras'}
                      </span>
                    )}
                  </span>
                  <span className="flex gap-2">
                    {c.status !== 'published' && (
                      <form action={publishCommunicationAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <SubmitButton type="submit" size="sm">
                          Publicar
                        </SubmitButton>
                      </form>
                    )}
                    {wa?.active && c.status === 'published' && (
                      <form action={broadcastComunicadoWhatsappAction}>
                        <input type="hidden" name="title" value={c.title} />
                        <input type="hidden" name="body" value={c.body ?? ''} />
                        <ConfirmButton
                          size="sm"
                          variant="outline"
                          message="Enviar este comunicado no WhatsApp para TODOS os responsáveis com telefone? Envio em LOTE pode levar a bloqueio/ban do número pela Meta. Use com moderação."
                        >
                          WhatsApp a todos
                        </ConfirmButton>
                      </form>
                    )}
                    {emailOn && c.status === 'published' && (
                      <form action={broadcastComunicadoEmailAction}>
                        <input type="hidden" name="title" value={c.title} />
                        <input type="hidden" name="body" value={c.body ?? ''} />
                        <ConfirmButton
                          size="sm"
                          variant="outline"
                          message="Enviar este comunicado por e-mail para TODOS os responsáveis com e-mail cadastrado?"
                        >
                          E-mail a todos
                        </ConfirmButton>
                      </form>
                    )}
                    <form action={deleteCommunicationAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmButton
                        size="sm"
                        variant="outline"
                        message={`Excluir o comunicado "${c.title}"? Vai para a Lixeira.`}
                      >
                        Excluir
                      </ConfirmButton>
                    </form>
                  </span>
                </div>
                {c.body && (
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{c.body}</p>
                )}
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
