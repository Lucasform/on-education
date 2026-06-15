import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { hojeISO } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import { listExitAuthorizations, listStudents } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import {
  createExitAuthorizationAction,
  deleteExitAuthorizationAction,
  updateExitAuthorizationStatusAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Autorizações de Saída · Edu On Way' };

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500',
  approved: 'bg-emerald-500/10 text-emerald-500',
  denied: 'bg-red-500/10 text-red-500',
  executed: 'bg-zinc-500/10 text-zinc-400',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  denied: 'Negado',
  executed: 'Executado',
};

export default async function AutorizacaoSaidaPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [autorizacoes, alunos] = await Promise.all([
    listExitAuthorizations(client, ctx).catch(() => []),
    listStudents(client, ctx).catch(() => []),
  ]);
  const nomeAluno = new Map(alunos.map((a) => [a.id, a.fullName]));

  const pending = autorizacoes.filter((a) => a.status === 'pending');
  const others = autorizacoes.filter((a) => a.status !== 'pending');

  return (
    <>
      <PageHeader
        title="Autorizações de Saída"
        description="Saídas antecipadas autorizadas pelos responsáveis."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          {pending.length > 0 && (
            <div className={cardClass}>
              <h2 className="mb-3 text-sm font-medium">Pendentes ({pending.length})</h2>
              <ul className="space-y-3 text-sm">
                {pending.map((a) => (
                  <li key={a.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{nomeAluno.get(a.studentId) ?? 'Aluno'}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.date.split('-').reverse().join('/')}
                          {a.time ? ` · ${a.time}` : ''}
                          {a.authorizedByName ? ` · ${a.authorizedByName}` : ''}
                        </p>
                        <p className="mt-1 text-muted-foreground">{a.reason}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${STATUS_BADGE[a.status] ?? STATUS_BADGE.pending}`}
                      >
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <form action={updateExitAuthorizationStatusAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="status" value="approved" />
                        <SubmitButton size="sm" variant="outline">
                          Aprovar
                        </SubmitButton>
                      </form>
                      <form action={updateExitAuthorizationStatusAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="status" value="denied" />
                        <SubmitButton size="sm" variant="outline">
                          Negar
                        </SubmitButton>
                      </form>
                      <form action={deleteExitAuthorizationAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          message={`Excluir esta autorização?`}
                        >
                          Excluir
                        </ConfirmButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {others.length > 0 && (
            <div className={cardClass}>
              <h2 className="mb-3 text-sm font-medium">Histórico ({others.length})</h2>
              <ul className="space-y-3 text-sm">
                {others.map((a) => (
                  <li key={a.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{nomeAluno.get(a.studentId) ?? 'Aluno'}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.date.split('-').reverse().join('/')}
                          {a.time ? ` · ${a.time}` : ''}
                          {a.authorizedByName ? ` · ${a.authorizedByName}` : ''}
                        </p>
                        <p className="mt-1 text-muted-foreground">{a.reason}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_BADGE[a.status] ?? STATUS_BADGE.pending}`}
                        >
                          {STATUS_LABEL[a.status] ?? a.status}
                        </span>
                        {a.status === 'approved' && (
                          <form action={updateExitAuthorizationStatusAction}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="status" value="executed" />
                            <SubmitButton size="sm" variant="ghost">
                              Marcar executado
                            </SubmitButton>
                          </form>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <form action={deleteExitAuthorizationAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          message={`Excluir esta autorização?`}
                        >
                          Excluir
                        </ConfirmButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {autorizacoes.length === 0 && (
            <div className={cardClass}>
              <p className="text-sm text-muted-foreground">
                Nenhuma autorização de saída registrada.
              </p>
            </div>
          )}
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Nova autorização</h2>
          {alunos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Cadastre alunos para registrar autorizações.
            </p>
          ) : (
            <form action={createExitAuthorizationAction} className="flex flex-col gap-2">
              <select name="studentId" required className={fieldClass}>
                <option value="">Selecionar aluno</option>
                {alunos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={hojeISO()}
                  className={fieldClass}
                />
                <input
                  name="time"
                  type="time"
                  placeholder="HH:MM"
                  className={fieldClass}
                />
              </div>
              <input
                name="reason"
                required
                placeholder="Motivo da saída"
                className={fieldClass}
              />
              <input
                name="authorizedByName"
                placeholder="Autorizado por (nome do responsável)"
                className={fieldClass}
              />
              <SubmitButton type="submit" size="sm">
                Registrar autorização
              </SubmitButton>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
