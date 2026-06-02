import { listClasses, listStudents } from '@on-education/module-nucleo';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { recordChamadaAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Chamada · On Way Education' };

export default async function ChamadaPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [turmas, alunos] = await Promise.all([listClasses(client, ctx), listStudents(client, ctx)]);

  const turmaId = classId || turmas[0]?.id || '';
  const daTurma = alunos.filter((a) => a.classId === turmaId);

  return (
    <>
      <PageHeader title="Chamada" description="Marque a presença da turma de uma vez." />

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
        <Button type="submit" size="sm" variant="outline">
          Trocar turma
        </Button>
      </form>

      {turmas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Crie uma turma e adicione alunos primeiro.</p>
      ) : (
        <form action={recordChamadaAction} className={cardClass}>
          <input type="hidden" name="classId" value={turmaId} />
          <input type="hidden" name="studentIds" value={daTurma.map((a) => a.id).join(',')} />
          <div className="mb-3 flex items-end justify-between gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Data
              <input name="date" type="date" required className={fieldClass} />
            </label>
            <Button type="submit" size="sm">
              Salvar chamada
            </Button>
          </div>
          {daTurma.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum aluno nesta turma.</p>
          ) : (
            <ul className="divide-y divide-border">
              {daTurma.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{a.fullName}</span>
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <input type="checkbox" name={`present_${a.id}`} defaultChecked />
                    presente
                  </label>
                </li>
              ))}
            </ul>
          )}
        </form>
      )}
    </>
  );
}
