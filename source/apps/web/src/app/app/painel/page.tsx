import {
  isGestao,
  listClasses,
  listMyWorkRequests,
  listStudents,
  listWorkRequests,
} from '@on-education/module-nucleo';
import { listActivities } from '@on-education/module-pedagogico';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  createWorkRequestAction,
  deleteWorkRequestAction,
  setWorkRequestStatusAction,
} from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Painel de trabalho · Edu On Way' };

const TIPO: Record<string, { label: string; cls: string }> = {
  ocorrencia: { label: 'Ocorrência', cls: 'bg-red-500/10 text-red-500' },
  servico: { label: 'Serviço', cls: 'bg-blue-500/10 text-blue-500' },
  impressao: { label: 'Impressão', cls: 'bg-violet-500/10 text-violet-500' },
  comparecimento: { label: 'Comparecimento', cls: 'bg-amber-500/10 text-amber-500' },
};
const COLUNAS: { id: 'enviada' | 'em_analise' | 'resolvida'; label: string }[] = [
  { id: 'enviada', label: 'Enviadas' },
  { id: 'em_analise', label: 'Em análise' },
  { id: 'resolvida', label: 'Resolvidas' },
];

function quando(d: Date | string) {
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

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

  function Card({ r }: { r: (typeof requests)[number] }) {
    const t = TIPO[r.type] ?? TIPO.servico!;
    return (
      <div className="rounded-lg border border-border bg-background p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${t.cls}`}>
            {t.label}
          </span>
          <span className="text-[11px] text-muted-foreground">{quando(r.createdAt)}</span>
        </div>
        <p className="mt-1.5 font-medium">{r.title}</p>
        {r.body && <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">{r.body}</p>}
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {r.requestedByName && <span>por {r.requestedByName}</span>}
          {r.studentId && nomeAluno.get(r.studentId) && <span>aluno: {nomeAluno.get(r.studentId)}</span>}
          {r.type === 'impressao' && r.copies ? <span>{r.copies} cópias</span> : null}
          {r.type === 'impressao' && r.activityId && nomeAtiv.get(r.activityId) && (
            <span>atividade: {nomeAtiv.get(r.activityId)}</span>
          )}
        </div>
        {r.resolution && (
          <p className="mt-2 rounded-md bg-success/10 p-2 text-xs text-success">
            Conclusão: {r.resolution}
          </p>
        )}

        {/* Ações da gestão (mover de coluna / resolver) */}
        {gestao && r.status !== 'resolvida' && (
          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
            {r.status === 'enviada' && (
              <form action={setWorkRequestStatusAction}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="status" value="em_analise" />
                <SubmitButton type="submit" size="sm" variant="outline" className="w-full">
                  Iniciar análise →
                </SubmitButton>
              </form>
            )}
            <form action={setWorkRequestStatusAction} className="flex flex-col gap-1.5">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value="resolvida" />
              <input
                name="resolution"
                placeholder="Conclusão (o que foi feito)"
                className={`${fieldClass} text-xs`}
              />
              <SubmitButton type="submit" size="sm" className="w-full">
                Resolver ✓
              </SubmitButton>
            </form>
          </div>
        )}

        <div className="mt-2 flex justify-end">
          <form action={deleteWorkRequestAction}>
            <input type="hidden" name="id" value={r.id} />
            <ConfirmButton size="sm" variant="ghost" message="Excluir esta solicitação?">
              Excluir
            </ConfirmButton>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Painel de trabalho"
        description={
          gestao
            ? 'Analise e resolva as solicitações da equipe: ocorrências, serviços, impressões e comparecimentos.'
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

      {/* Kanban */}
      <div className="grid gap-4 md:grid-cols-3">
        {COLUNAS.map((col) => {
          const cards = requests.filter((r) => r.status === col.id);
          return (
            <div key={col.id} className={`${cardClass} flex flex-col gap-3`}>
              <h2 className="flex items-center justify-between text-sm font-medium">
                {col.label}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {cards.length}
                </span>
              </h2>
              {cards.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nada por aqui.</p>
              ) : (
                cards.map((r) => <Card key={r.id} r={r} />)
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
