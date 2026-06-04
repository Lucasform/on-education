import { SubmitButton } from '@/components/submit-button';
import { isAiConfigured } from '@on-education/module-ia';
import { listQuizzes } from '@on-education/module-pedagogico';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createQuizAction, deleteQuizAction, generateQuizAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Simulados · On Way Education' };

export default async function SimuladosPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const simulados = await listQuizzes(db(), ctx);
  const aiOn = isAiConfigured();

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
        <div className="flex flex-col gap-5">
          <div className={cardClass}>
            <h2 className="mb-1 flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              Gerar com o EduON
            </h2>
            <p className="mb-2 text-xs text-muted-foreground">
              O agente cria as questões. Você revisa e ajusta o gabarito.
            </p>
            {aiOn ? (
              <form action={generateQuizAction} className="flex flex-col gap-2">
                <input
                  name="topic"
                  required
                  placeholder="Tema (ex.: frações no 6º ano)"
                  className={fieldClass}
                />
                <input name="subject" placeholder="Disciplina (opcional)" className={fieldClass} />
                <div className="flex gap-2">
                  <select
                    name="level"
                    defaultValue="Médio"
                    className={fieldClass}
                    aria-label="Dificuldade"
                  >
                    <option value="Fácil">Fácil</option>
                    <option value="Médio">Médio</option>
                    <option value="Difícil">Difícil</option>
                  </select>
                  <input
                    name="count"
                    type="number"
                    min={1}
                    max={15}
                    defaultValue={5}
                    className={`${fieldClass} w-20`}
                    aria-label="Número de questões"
                  />
                </div>
                <SubmitButton type="submit" size="sm">
                  Gerar simulado
                </SubmitButton>
              </form>
            ) : (
              <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                EduON indisponível. Configure <code>ANTHROPIC_API_KEY</code> para gerar simulados.
              </p>
            )}
          </div>

          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Novo simulado (manual)</h2>
            <form action={createQuizAction} className="flex flex-col gap-2">
              <input
                name="title"
                required
                placeholder="Título do simulado"
                className={fieldClass}
              />
              <input name="subject" placeholder="Disciplina (opcional)" className={fieldClass} />
              <input name="description" placeholder="Descrição (opcional)" className={fieldClass} />
              <SubmitButton type="submit" size="sm" variant="outline">
                Criar e adicionar questões
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
