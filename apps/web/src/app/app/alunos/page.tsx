import { listClasses, listStudents } from '@on-education/module-nucleo';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createStudentAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Alunos · On Education' };

export default async function AlunosPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [alunos, turmas] = await Promise.all([listStudents(client, ctx), listClasses(client, ctx)]);

  return (
    <>
      <PageHeader title="Alunos" description="Cadastre e acompanhe seus alunos." />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Alunos ({alunos.length})</h2>
          {alunos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum aluno ainda.</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {alunos.map((a) => (
                <li key={a.id}>{a.fullName}</li>
              ))}
            </ul>
          )}
        </div>
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Novo aluno</h2>
          <form action={createStudentAction} className="flex flex-col gap-2">
            <input name="fullName" required placeholder="Nome do aluno" className={fieldClass} />
            <select name="classId" className={fieldClass} defaultValue="">
              <option value="">Sem turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm">
              Adicionar aluno
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
