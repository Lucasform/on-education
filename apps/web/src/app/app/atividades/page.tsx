import { SubmitButton } from '@/components/submit-button';
import { isAiConfigured } from '@on-education/module-ia';
import { listClasses } from '@on-education/module-nucleo';
import { listActivities } from '@on-education/module-pedagogico';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createActivityAction, generateActivityAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Banco de atividades · Edu On Way' };

export default async function AtividadesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const [atividades, turmas] = await Promise.all([
    listActivities(db(), ctx, {}),
    listClasses(db(), ctx).catch(() => []),
  ]);
  const aiOn = isAiConfigured();

  return (
    <>
      <PageHeader title="Banco de atividades" description="Crie, marque com tags e reutilize." />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Atividades ({atividades.length})</h2>
          {atividades.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade ainda.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {atividades.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/app/atividades/${a.id}`}
                    className="text-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    {a.title}
                  </Link>
                  {a.tags.length > 0 && (
                    <span className="text-muted-foreground"> · {a.tags.join(', ')}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-5">
          <div className={cardClass}>
            <h2 className="mb-1 flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              Gerar com o WayOn
            </h2>
            <p className="mb-2 text-xs text-muted-foreground">
              O agente cria a atividade e salva no banco. Você edita se quiser.
            </p>
            {aiOn ? (
              <form action={generateActivityAction} className="flex flex-col gap-2">
                <select name="kind" defaultValue="atividade" className={fieldClass}>
                  <option value="atividade">Atividade</option>
                  <option value="prova">Prova</option>
                  <option value="trabalho">Trabalho</option>
                  <option value="roteiro">Roteiro de estudo</option>
                </select>
                <input
                  name="topic"
                  required
                  placeholder="Tema (ex.: interpretação de texto, 5º ano)"
                  className={fieldClass}
                />
                <div className="flex gap-2">
                  <input
                    name="subject"
                    placeholder="Disciplina (opcional)"
                    className={fieldClass}
                  />
                  <input name="level" placeholder="Nível/ano" className={fieldClass} />
                </div>
                {turmas.length > 0 && (
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Basear nos materiais de uma turma (opcional)
                    <select name="classId" defaultValue="" className={fieldClass}>
                      <option value="">Sem material — gerar do zero</option>
                      {turmas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <SubmitButton type="submit" size="sm">
                  Gerar com o WayOn
                </SubmitButton>
              </form>
            ) : (
              <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                WayOn indisponível. Configure <code>ANTHROPIC_API_KEY</code> para gerar atividades.
              </p>
            )}
          </div>

          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Nova atividade (manual)</h2>
            <form action={createActivityAction} className="flex flex-col gap-2">
              <input
                name="title"
                required
                placeholder="Título da atividade"
                className={fieldClass}
              />
              <input name="subject" placeholder="Disciplina (opcional)" className={fieldClass} />
              <textarea name="content" placeholder="Conteúdo" rows={4} className={fieldClass} />
              <input name="tags" placeholder="Tags separadas por vírgula" className={fieldClass} />
              <SubmitButton type="submit" size="sm" variant="outline">
                Salvar atividade
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
