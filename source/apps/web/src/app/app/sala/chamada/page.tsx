import { SubmitButton } from '@/components/submit-button';
import { listClasses, listStudents, listSubjects } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { hojeISO } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { recordChamadaAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Chamada · Edu On Way' };

export default async function ChamadaPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; subjectId?: string }>;
}) {
  const { classId, subjectId } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [turmas, alunos, disciplinas] = await Promise.all([
    listClasses(client, ctx),
    listStudents(client, ctx),
    listSubjects(client, ctx),
  ]);

  const turmaId = classId || turmas[0]?.id || '';
  const subjId = subjectId ?? '';
  const daTurma = alunos.filter((a) => a.classId === turmaId);

  return (
    <>
      <PageHeader
        title="Chamada"
        description="Marque só quem faltou. Quem você não marcar entra como presente."
      />

      <form method="get" className={`${cardClass} flex flex-wrap items-end gap-3`}>
        <label className="flex flex-col gap-1 text-sm">
          Turma
          <select name="classId" defaultValue={turmaId} className={fieldClass}>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Matéria <span className="text-muted-foreground">(opcional)</span>
          <select name="subjectId" defaultValue={subjId} className={fieldClass}>
            <option value="">Chamada do dia</option>
            {disciplinas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton type="submit" size="sm" variant="outline">
          Aplicar
        </SubmitButton>
      </form>

      {turmas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Crie uma turma e adicione alunos primeiro.</p>
      ) : (
        <form action={recordChamadaAction} className={cardClass}>
          <input type="hidden" name="classId" value={turmaId} />
          <input type="hidden" name="subjectId" value={subjId} />
          <input type="hidden" name="studentIds" value={daTurma.map((a) => a.id).join(',')} />
          <div className="mb-3 flex items-end justify-between gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Data
              <input
                name="date"
                type="date"
                required
                defaultValue={hojeISO()}
                className={fieldClass}
              />
            </label>
            <SubmitButton type="submit" size="sm">
              Salvar chamada
            </SubmitButton>
          </div>
          {daTurma.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum aluno nesta turma.</p>
          ) : (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                {daTurma.length} aluno(s). Toque para marcar <strong>falta</strong>.
              </p>
              <ul className="divide-y divide-border">
                {daTurma.map((a) => (
                  <li key={a.id}>
                    <label className="flex cursor-pointer items-center justify-between gap-2 py-2.5 text-sm">
                      <span>{a.fullName}</span>
                      <span className="flex items-center gap-2 text-xs text-danger">
                        <input
                          type="checkbox"
                          name={`absent_${a.id}`}
                          className="h-5 w-5 accent-danger"
                        />
                        faltou
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </form>
      )}
    </>
  );
}
