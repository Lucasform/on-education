import { SubmitButton } from '@/components/submit-button';
import { listAbsenceJustifications, listStudents } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ComunicacaoTabs } from '@/components/comunicacao-tabs';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { hojeISO } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  createAbsenceJustificationAction,
  reviewAbsenceJustificationAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Justificativas - Edu On Way' };

const STATUS_COR: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500',
  approved: 'bg-emerald-500/10 text-emerald-500',
  denied: 'bg-red-500/10 text-red-500',
};
const STATUS_ROTULO: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  denied: 'Negada',
};

export default async function JustificativasPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [justificativas, alunos] = await Promise.all([
    listAbsenceJustifications(client, ctx).catch(() => []),
    listStudents(client, ctx).catch(() => []),
  ]);
  const nomeAluno = new Map(alunos.map((a) => [a.id, a.fullName]));

  return (
    <>
      <PageHeader
        title="Justificativas de Falta"
        description="Atestados e justificativas enviados pelos responsaveis."
      />
      <ComunicacaoTabs />

      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Historico ({justificativas.length})</h2>
          {justificativas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma justificativa registrada.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {justificativas.map((j) => (
                <li key={j.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {nomeAluno.get(j.studentId) ?? 'Aluno'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_COR[j.status] ?? STATUS_COR.pending}`}
                    >
                      {STATUS_ROTULO[j.status] ?? j.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {j.date.split('-').reverse().join('/')}
                    {j.submittedByName ? ` · ${j.submittedByName}` : ''}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {j.reason}
                  </p>
                  {j.status === 'pending' && (
                    <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3">
                      <form action={reviewAbsenceJustificationAction} className="flex flex-col gap-2">
                        <input type="hidden" name="id" value={j.id} />
                        <textarea
                          name="reviewNote"
                          rows={2}
                          placeholder="Observacao (opcional)"
                          className={fieldClass}
                        />
                        <div className="flex gap-2">
                          <button
                            name="status"
                            value="approved"
                            type="submit"
                            className="flex-1 rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20"
                          >
                            Aprovar
                          </button>
                          <button
                            name="status"
                            value="denied"
                            type="submit"
                            className="flex-1 rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/20"
                          >
                            Negar
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                  {j.reviewNote && (
                    <p className="mt-2 text-xs italic text-muted-foreground">
                      Obs: {j.reviewNote}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Nova justificativa</h2>
          {alunos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Cadastre alunos para registrar justificativas.
            </p>
          ) : (
            <form action={createAbsenceJustificationAction} className="flex flex-col gap-2">
              <select name="studentId" required className={fieldClass}>
                <option value="">Selecione o aluno...</option>
                {alunos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
              <input
                name="date"
                type="date"
                required
                defaultValue={hojeISO()}
                className={fieldClass}
              />
              <textarea
                name="reason"
                rows={3}
                required
                placeholder="Motivo da falta..."
                className={fieldClass}
              />
              <input
                name="submittedByName"
                placeholder="Nome do responsavel (opcional)"
                className={fieldClass}
              />
              <SubmitButton type="submit" size="sm">
                Registrar justificativa
              </SubmitButton>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
