import { isAiConfigured, listDrafts } from '@on-education/module-ia';
import { listClasses, listStudents } from '@on-education/module-nucleo';
import { listActivities } from '@on-education/module-pedagogico';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  approveDraftAction,
  createActivityAction,
  createClassAction,
  createStudentAction,
  discardDraftAction,
  generateDraftAction,
  logoutAction,
} from './actions';

// Lê a sessão (cookie) e o banco => renderização dinâmica, nunca em build time.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meu workspace — On Education' };

export default async function AppPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  const client = db();
  const [turmas, alunos, atividades, rascunhos] = await Promise.all([
    listClasses(client, ctx),
    listStudents(client, ctx),
    listActivities(client, ctx, {}),
    listDrafts(client, ctx),
  ]);
  const aiOn = isAiConfigured();

  const input = 'rounded-md border px-3 py-2 text-sm';

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Meu workspace</h1>
          <p className="text-sm opacity-70">Segmento: {ctx.tenantType}</p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm">
            Sair
          </Button>
        </form>
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

      <section className="rounded-md border p-4">
        <h2 className="mb-3 text-sm font-medium">IA pedagógica · rascunhos ({rascunhos.length})</h2>

        {aiOn ? (
          <form action={generateDraftAction} className="mb-4 flex flex-col gap-2">
            <select name="kind" className={input} defaultValue="lesson_plan">
              <option value="lesson_plan">Plano de aula</option>
              <option value="activity">Atividade</option>
            </select>
            <textarea
              name="prompt"
              required
              rows={2}
              placeholder="Descreva o que você quer gerar (ex.: plano de aula sobre frações, 6º ano)"
              className={input}
            />
            <Button type="submit" size="sm">
              Gerar rascunho
            </Button>
          </form>
        ) : (
          <p className="mb-4 rounded-md bg-accent p-2 text-xs opacity-80">
            IA indisponível: configure <code>ANTHROPIC_API_KEY</code> para gerar rascunhos.
          </p>
        )}

        <ul className="space-y-2 text-sm">
          {rascunhos.map((d) => (
            <li key={d.id} className="rounded-md border p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {d.kind} <span className="opacity-60">· {d.status}</span>
                </span>
                {d.status === 'draft' && (
                  <span className="flex gap-2">
                    <form action={approveDraftAction}>
                      <input type="hidden" name="id" value={d.id} />
                      <Button type="submit" size="sm">
                        Aprovar
                      </Button>
                    </form>
                    <form action={discardDraftAction}>
                      <input type="hidden" name="id" value={d.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Descartar
                      </Button>
                    </form>
                  </span>
                )}
              </div>
              {d.output && <p className="mt-1 whitespace-pre-wrap opacity-80">{d.output}</p>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
