import {
  isGestao,
  listClasses,
  listMyWorkRequests,
  listStudents,
  listWorkRequests,
} from '@on-education/module-nucleo';
import { listActivities } from '@on-education/module-pedagogico';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createWorkRequestAction } from './actions';
import { PainelKanban } from './PainelKanban';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Painel de trabalho · Edu On Way' };

export default async function PainelPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const client = db();
  const gestao = isGestao(ctx);

  const [requests, turmas, alunos, atividades] = await Promise.all([
    (gestao ? listWorkRequests(client, ctx) : listMyWorkRequests(client, ctx)).catch(() => []),
    listClasses(client, ctx).catch(() => []),
    listStudents(client, ctx).catch(() => []),
    listActivities(client, ctx, {}).catch(() => []),
  ]);
  const nomeAluno = new Map(alunos.map((a) => [a.id, a.fullName]));
  const nomeAtiv = new Map(atividades.map((a) => [a.id, a.title]));

  const cards = requests.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body ?? null,
    status: r.status,
    createdAt: new Date(r.createdAt).toISOString(),
    requestedByName: r.requestedByName ?? null,
    resolution: r.resolution ?? null,
    copies: r.copies ?? null,
    studentName: r.studentId ? (nomeAluno.get(r.studentId) ?? null) : null,
    activityName: r.activityId ? (nomeAtiv.get(r.activityId) ?? null) : null,
  }));

  return (
    <>
      <PageHeader
        title="Painel de trabalho"
        description={
          gestao
            ? 'Analise e resolva as solicitações da equipe: ocorrências, serviços, impressões e comparecimentos. Arraste os cards entre as colunas.'
            : 'Abra solicitações para a coordenação e acompanhe o andamento.'
        }
      />

      {/* Nova solicitação (todos abrem) */}
      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Nova solicitação</h2>
        <form action={createWorkRequestAction} className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <select name="type" className={`${fieldClass} sm:w-48`} defaultValue="servico">
              <option value="ocorrencia">Ocorrência</option>
              <option value="servico">Solicitação de serviço</option>
              <option value="impressao">Solicitação de impressão</option>
              <option value="comparecimento">Comparecimento na sala</option>
            </select>
            <input
              name="title"
              required
              placeholder="Título (ex.: Imprimir prova de Matemática)"
              className={`${fieldClass} min-w-[12rem] flex-1`}
            />
          </div>
          <textarea
            name="body"
            rows={2}
            placeholder="Detalhe a solicitação…"
            className={`${fieldClass} resize-none`}
          />
          <div className="flex flex-wrap gap-2">
            <select name="classId" className={`${fieldClass} sm:w-44`} defaultValue="">
              <option value="">Turma (opcional)</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select name="studentId" className={`${fieldClass} sm:w-48`} defaultValue="">
              <option value="">Aluno (opcional)</option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Para impressão:</span>
            <select name="activityId" className={`${fieldClass} sm:w-56`} defaultValue="">
              <option value="">Atividade (opcional)</option>
              {atividades.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
            <input
              name="copies"
              type="number"
              min="1"
              placeholder="Cópias"
              className={`${fieldClass} w-24`}
            />
            <SubmitButton type="submit" size="sm" className="ml-auto">
              Enviar solicitação
            </SubmitButton>
          </div>
        </form>
      </section>

      {/* Kanban arrastável */}
      <PainelKanban cards={cards} gestao={gestao} />
    </>
  );
}
