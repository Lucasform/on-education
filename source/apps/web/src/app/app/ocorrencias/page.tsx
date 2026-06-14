import { SubmitButton } from '@/components/submit-button';
import { listOccurrenceLinks, listOccurrences, listStudents } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { hojeISO } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createOccurrenceAction, deleteOccurrenceAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ocorrências · Edu On Way' };

const COR: Record<string, string> = {
  leve: 'bg-emerald-500/10 text-emerald-500',
  media: 'bg-amber-500/10 text-amber-500',
  grave: 'bg-red-500/10 text-red-500',
};
const ROTULO: Record<string, string> = { leve: 'Leve', media: 'Média', grave: 'Grave' };

export default async function OcorrenciasPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [ocorrencias, vinculos, alunos] = await Promise.all([
    listOccurrences(client, ctx).catch(() => []),
    listOccurrenceLinks(client, ctx).catch(() => []),
    listStudents(client, ctx).catch(() => []),
  ]);
  const nomeAluno = new Map(alunos.map((a) => [a.id, a.fullName]));
  const alunosPorOcorrencia = new Map<string, string[]>();
  for (const v of vinculos) {
    const arr = alunosPorOcorrencia.get(v.occurrenceId) ?? [];
    arr.push(nomeAluno.get(v.studentId) ?? 'Aluno');
    alunosPorOcorrencia.set(v.occurrenceId, arr);
  }

  return (
    <>
      <PageHeader
        title="Ocorrências"
        description="Registros disciplinares e pedagógicos, vinculados a um ou mais alunos."
      />

      {alunos.length === 0 ? (
        <div className={cardClass}>
          <p className="text-sm text-muted-foreground">
            Cadastre alunos para registrar ocorrências.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Histórico ({ocorrencias.length})</h2>
            {ocorrencias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ocorrência registrada.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {ocorrencias.map((o) => (
                  <li key={o.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-medium">
                        {o.title}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${COR[o.severity] ?? COR.leve}`}
                        >
                          {ROTULO[o.severity] ?? o.severity}
                        </span>
                      </span>
                      <form action={deleteOccurrenceAction}>
                        <input type="hidden" name="id" value={o.id} />
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          message={`Excluir a ocorrência "${o.title}"?`}
                        >
                          Excluir
                        </ConfirmButton>
                      </form>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {o.date.split('-').reverse().join('/')} ·{' '}
                      {(alunosPorOcorrencia.get(o.id) ?? []).join(', ')}
                    </p>
                    {o.description && (
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                        {o.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Nova ocorrência</h2>
            <form action={createOccurrenceAction} className="flex flex-col gap-2">
              <input name="title" required placeholder="Título" className={fieldClass} />
              <div className="flex gap-2">
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={hojeISO()}
                  className={fieldClass}
                />
                <select name="severity" defaultValue="leve" className={fieldClass}>
                  <option value="leve">Leve</option>
                  <option value="media">Média</option>
                  <option value="grave">Grave</option>
                </select>
              </div>
              <textarea
                name="description"
                rows={3}
                placeholder="Descrição (opcional)"
                className={fieldClass}
              />
              <label className="text-xs text-muted-foreground">Aluno(s) envolvido(s)</label>
              <div className="max-h-40 overflow-y-auto rounded-md border border-border p-2">
                {alunos.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 py-0.5 text-sm">
                    <input type="checkbox" name="studentIds" value={a.id} />
                    {a.fullName}
                  </label>
                ))}
              </div>
              <SubmitButton type="submit" size="sm">
                Registrar ocorrência
              </SubmitButton>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
