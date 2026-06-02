import { listActivities } from '@on-education/module-pedagogico';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createActivityAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Banco de atividades · On Education' };

export default async function AtividadesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const atividades = await listActivities(db(), ctx, {});

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
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Nova atividade</h2>
          <form action={createActivityAction} className="flex flex-col gap-2">
            <input name="title" required placeholder="Título da atividade" className={fieldClass} />
            <input name="subject" placeholder="Disciplina (opcional)" className={fieldClass} />
            <textarea name="content" placeholder="Conteúdo" rows={4} className={fieldClass} />
            <input name="tags" placeholder="Tags separadas por vírgula" className={fieldClass} />
            <Button type="submit" size="sm">
              Salvar atividade
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
