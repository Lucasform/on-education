import { isAiConfigured } from '@on-education/module-ia';
import { listActivities } from '@on-education/module-pedagogico';
import { Button } from '@on-education/ui';
import { Sparkles } from 'lucide-react';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createActivityAction, generateActivityAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Banco de atividades · On Way Education' };

export default async function AtividadesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const atividades = await listActivities(db(), ctx, {});
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
            <ul className="space-y-1 text-sm text-muted-foreground">
              {atividades.map((a) => (
                <li key={a.id}>
                  {a.title}
                  {a.tags.length > 0 && <span className="opacity-60"> · {a.tags.join(', ')}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-5">
          <div className={cardClass}>
            <h2 className="mb-1 flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              Gerar com o EduON
            </h2>
            <p className="mb-2 text-xs text-muted-foreground">
              O agente cria a atividade e salva no banco. Você edita se quiser.
            </p>
            {aiOn ? (
              <form action={generateActivityAction} className="flex flex-col gap-2">
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
                <Button type="submit" size="sm">
                  Gerar atividade
                </Button>
              </form>
            ) : (
              <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                EduON indisponível. Configure <code>ANTHROPIC_API_KEY</code> para gerar atividades.
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
              <Button type="submit" size="sm" variant="outline">
                Salvar atividade
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
