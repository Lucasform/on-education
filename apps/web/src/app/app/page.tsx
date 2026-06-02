import { isAiConfigured, listDrafts } from '@on-education/module-ia';
import { listClasses, listStudents } from '@on-education/module-nucleo';
import { listActivities } from '@on-education/module-pedagogico';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { exitImpersonationAction } from '@/app/admin/actions';
import { AppShell } from '@/components/app-shell';
import { fieldClass } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext, isImpersonating } from '@/server/session';

import {
  approveDraftAction,
  createActivityAction,
  createClassAction,
  createStudentAction,
  discardDraftAction,
  generateDraftAction,
  logoutAction,
} from './actions';
import { SchoolAdmin } from './SchoolAdmin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Workspace · On Education' };

const card = 'rounded-lg border border-border bg-card p-5';

export default async function AppPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  const impersonating = await isImpersonating();
  const client = db();
  const [turmas, alunos, atividades, rascunhos] = await Promise.all([
    listClasses(client, ctx),
    listStudents(client, ctx),
    listActivities(client, ctx, {}),
    listDrafts(client, ctx),
  ]);
  const aiOn = isAiConfigured();
  const isSchool = ctx.tenantType === 'organization';

  const headerActions = impersonating ? (
    <form action={exitImpersonationAction}>
      <Button type="submit" variant="outline" size="sm">
        Sair do modo admin
      </Button>
    </form>
  ) : (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" size="sm">
        Sair
      </Button>
    </form>
  );

  return (
    <AppShell
      tenantType={ctx.tenantType}
      subtitle={isSchool ? 'Escola' : 'Professor'}
      headerActions={headerActions}
    >
      <div id="topo">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isSchool ? 'Painel da escola' : 'Meu workspace'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tudo o que você precisa para ensinar, em um só lugar.
        </p>
      </div>

      {impersonating && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-500">
          Modo admin ativo. Você está vendo este tenant como super-admin (view-as).
        </div>
      )}

      {isSchool && (
        <div id="escola">
          <SchoolAdmin ctx={ctx} />
        </div>
      )}

      <section className="grid gap-5 md:grid-cols-2">
        <div id="turmas" className={card}>
          <h2 className="mb-3 text-sm font-medium">Turmas ({turmas.length})</h2>
          <ul className="mb-4 space-y-1 text-sm text-muted-foreground">
            {turmas.map((t) => (
              <li key={t.id}>{t.name}</li>
            ))}
          </ul>
          <form action={createClassAction} className="flex flex-col gap-2">
            <input name="name" required placeholder="Nome da turma" className={fieldClass} />
            <Button type="submit" size="sm">
              Adicionar turma
            </Button>
          </form>
        </div>

        <div id="alunos" className={card}>
          <h2 className="mb-3 text-sm font-medium">Alunos ({alunos.length})</h2>
          <ul className="mb-4 space-y-1 text-sm text-muted-foreground">
            {alunos.map((a) => (
              <li key={a.id}>{a.fullName}</li>
            ))}
          </ul>
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
      </section>

      <section id="atividades" className={card}>
        <h2 className="mb-3 text-sm font-medium">Banco de atividades ({atividades.length})</h2>
        <ul className="mb-4 space-y-1 text-sm text-muted-foreground">
          {atividades.map((a) => (
            <li key={a.id}>
              {a.title}
              {a.tags.length > 0 && <span className="opacity-60"> · {a.tags.join(', ')}</span>}
            </li>
          ))}
        </ul>
        <form action={createActivityAction} className="flex flex-col gap-2">
          <input name="title" required placeholder="Título da atividade" className={fieldClass} />
          <input name="subject" placeholder="Disciplina (opcional)" className={fieldClass} />
          <textarea name="content" placeholder="Conteúdo" rows={3} className={fieldClass} />
          <input name="tags" placeholder="Tags separadas por vírgula" className={fieldClass} />
          <Button type="submit" size="sm">
            Salvar atividade
          </Button>
        </form>
      </section>

      <section id="ia" className={card}>
        <h2 className="mb-3 text-sm font-medium">IA pedagógica · rascunhos ({rascunhos.length})</h2>
        {aiOn ? (
          <form action={generateDraftAction} className="mb-4 flex flex-col gap-2">
            <select name="kind" className={fieldClass} defaultValue="lesson_plan">
              <option value="lesson_plan">Plano de aula</option>
              <option value="activity">Atividade</option>
            </select>
            <textarea
              name="prompt"
              required
              rows={2}
              placeholder="Ex.: plano de aula sobre frações para o 6º ano"
              className={fieldClass}
            />
            <Button type="submit" size="sm">
              Gerar rascunho
            </Button>
          </form>
        ) : (
          <p className="mb-4 rounded-md bg-muted p-2 text-xs text-muted-foreground">
            IA indisponível. Configure <code>ANTHROPIC_API_KEY</code> para gerar rascunhos.
          </p>
        )}

        <ul className="space-y-2 text-sm">
          {rascunhos.map((d) => (
            <li key={d.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {d.kind} <span className="text-muted-foreground">· {d.status}</span>
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
              {d.output && (
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{d.output}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
