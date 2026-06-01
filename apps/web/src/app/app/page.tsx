import { listClasses, listStudents } from '@on-education/module-nucleo';
import { listActivities } from '@on-education/module-pedagogico';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createActivityAction, createClassAction, createStudentAction } from './actions';

// Lê a sessão (cookie) e o banco => renderização dinâmica, nunca em build time.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meu workspace — On Education' };

export default async function AppPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/signup');

  const client = db();
  const [turmas, alunos, atividades] = await Promise.all([
    listClasses(client, ctx),
    listStudents(client, ctx),
    listActivities(client, ctx, {}),
  ]);

  const input = 'rounded-md border px-3 py-2 text-sm';

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Meu workspace</h1>
        <p className="text-sm opacity-70">Tenant individual · plano teacher_free</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-md border p-4">
          <h2 className="mb-3 text-sm font-medium">Turmas ({turmas.length})</h2>
          <ul className="mb-4 space-y-1 text-sm">
            {turmas.map((t) => (
              <li key={t.id}>{t.name}</li>
            ))}
          </ul>
          <form action={createClassAction} className="flex flex-col gap-2">
            <input name="name" required placeholder="Nome da turma" className={input} />
            <Button type="submit" size="sm">
              Adicionar turma
            </Button>
          </form>
        </div>

        <div className="rounded-md border p-4">
          <h2 className="mb-3 text-sm font-medium">Alunos ({alunos.length})</h2>
          <ul className="mb-4 space-y-1 text-sm">
            {alunos.map((a) => (
              <li key={a.id}>{a.fullName}</li>
            ))}
          </ul>
          <form action={createStudentAction} className="flex flex-col gap-2">
            <input name="fullName" required placeholder="Nome do aluno" className={input} />
            <select name="classId" className={input} defaultValue="">
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
      </section>

      <section className="rounded-md border p-4">
        <h2 className="mb-3 text-sm font-medium">Banco de atividades ({atividades.length})</h2>
        <ul className="mb-4 space-y-1 text-sm">
          {atividades.map((a) => (
            <li key={a.id}>
              {a.title}
              {a.tags.length > 0 && <span className="opacity-60"> · {a.tags.join(', ')}</span>}
            </li>
          ))}
        </ul>
        <form action={createActivityAction} className="flex flex-col gap-2">
          <input name="title" required placeholder="Título da atividade" className={input} />
          <input name="subject" placeholder="Disciplina (opcional)" className={input} />
          <textarea name="content" placeholder="Conteúdo" rows={3} className={input} />
          <input name="tags" placeholder="Tags separadas por vírgula" className={input} />
          <Button type="submit" size="sm">
            Salvar atividade
          </Button>
        </form>
      </section>
    </main>
  );
}
