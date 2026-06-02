import { listQuizzes } from '@on-education/module-pedagogico';
import { Button } from '@on-education/ui';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createQuizAction, deleteQuizAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Simulados · On Education' };

export default async function SimuladosPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const simulados = await listQuizzes(db(), ctx);

  return (
    <>
      <PageHeader
        title="Simulados e quizzes"
        description="Monte questões de múltipla escolha e corrija automaticamente."
      />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Seus simulados ({simulados.length})</h2>
          {simulados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum simulado ainda.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {simulados.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/app/simulados/${q.id}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {q.title}
                    {q.subject && <span className="text-muted-foreground"> · {q.subject}</span>}
                  </Link>
                  <form action={deleteQuizAction}>
                    <input type="hidden" name="id" value={q.id} />
                    <ConfirmButton
                      size="sm"
                      variant="ghost"
                      message={`Excluir o simulado "${q.title}"?`}
                    >
                      Excluir
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Novo simulado</h2>
          <form action={createQuizAction} className="flex flex-col gap-2">
            <input name="title" required placeholder="Título do simulado" className={fieldClass} />
            <input name="subject" placeholder="Disciplina (opcional)" className={fieldClass} />
            <input name="description" placeholder="Descrição (opcional)" className={fieldClass} />
            <Button type="submit" size="sm">
              Criar e adicionar questões
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
