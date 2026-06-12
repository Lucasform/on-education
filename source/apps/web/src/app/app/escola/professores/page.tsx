import { SubmitButton } from '@/components/submit-button';
import {
  listClasses,
  listSubjects,
  listTeachers,
  listTeachingAssignments,
} from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { assignTeachingAction, removeTeachingAssignmentAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Professores e vínculos · Edu On Way' };

const ROLE_LABEL: Record<string, string> = {
  owner: 'Responsável',
  director: 'Diretor(a)',
  coordinator: 'Coordenador(a)',
  teacher: 'Professor(a)',
  monitor: 'Monitor(a)',
  staff_secretary: 'Secretaria',
  staff_finance: 'Financeiro',
  guardian: 'Responsável',
  student: 'Aluno(a)',
};

export default async function ProfessoresPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');

  const client = db();
  const [professores, turmas, disciplinas, vinculos] = await Promise.all([
    listTeachers(client, ctx),
    listClasses(client, ctx),
    listSubjects(client, ctx),
    listTeachingAssignments(client, ctx),
  ]);

  return (
    <>
      <PageHeader
        title="Professores e vínculos"
        description="Defina quais matérias cada professor leciona em cada turma. É a base para diário, notas e faltas por professor."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Novo vínculo</h2>
          <form action={assignTeachingAction} className="flex flex-col gap-2">
            <select name="membershipId" required className={fieldClass} defaultValue="">
              <option value="" disabled>
                Selecione o professor
              </option>
              {professores.map((p) => (
                <option key={p.membershipId} value={p.membershipId}>
                  {p.fullName || p.email} · {ROLE_LABEL[p.role] ?? p.role}
                </option>
              ))}
            </select>
            <select name="classId" required className={fieldClass} defaultValue="">
              <option value="" disabled>
                Selecione a turma
              </option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select name="subjectId" className={fieldClass} defaultValue="">
              <option value="">Todas as matérias (regente)</option>
              {disciplinas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <SubmitButton type="submit" size="sm">
              Vincular
            </SubmitButton>
          </form>
          {(professores.length === 0 || turmas.length === 0) && (
            <p className="mt-2 text-xs text-muted-foreground">
              Convide professores (Convites e membros) e crie turmas antes de vincular.
            </p>
          )}
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Vínculos ({vinculos.length})</h2>
          {vinculos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum vínculo cadastrado ainda.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {vinculos.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0"
                >
                  <span>
                    <span className="font-medium">
                      {v.teacherName || v.teacherEmail || 'Professor'}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}
                      · {v.className ?? 'Turma'} · {v.subjectName ?? 'Todas as matérias'}
                    </span>
                  </span>
                  <form action={removeTeachingAssignmentAction}>
                    <input type="hidden" name="id" value={v.id} />
                    <ConfirmButton message="Remover este vínculo?">Remover</ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
