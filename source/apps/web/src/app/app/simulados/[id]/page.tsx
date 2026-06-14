import { SubmitButton } from '@/components/submit-button';
import { getQuiz, listQuizAttempts } from '@on-education/module-pedagogico';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { addQuizQuestionAction, submitQuizAttemptAction } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function SimuladoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  const data = await getQuiz(db(), ctx, id).catch(() => null);
  if (!data) notFound();
  const { quiz, questions } = data;
  const attempts = await listQuizAttempts(db(), ctx, id).catch(() => []);

  return (
    <>
      <PageHeader title={quiz.title} description={quiz.description ?? 'Simulado'} />
      <Link
        href="/app/simulados"
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        ← Voltar aos simulados
      </Link>

      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Questões ({questions.length})</h2>
        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma questão ainda. Adicione abaixo.</p>
        ) : (
          <ol className="space-y-3 text-sm">
            {questions.map((q, i) => (
              <li key={q.id} className="rounded-md border border-border p-3">
                <p className="font-medium">
                  {i + 1}. {q.prompt}
                </p>
                <ul className="mt-2 space-y-1">
                  {q.options.map((opt, oi) => (
                    <li
                      key={oi}
                      className={
                        oi === q.correctIndex ? 'text-emerald-500' : 'text-muted-foreground'
                      }
                    >
                      {String.fromCharCode(65 + oi)}) {opt}
                      {oi === q.correctIndex && ' ✓'}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Adicionar questão</h2>
          <form action={addQuizQuestionAction} className="flex flex-col gap-2">
            <input type="hidden" name="quizId" value={quiz.id} />
            <textarea
              name="prompt"
              required
              rows={2}
              placeholder="Enunciado"
              className={fieldClass}
            />
            <label className="text-xs text-muted-foreground">Opções (uma por linha)</label>
            <textarea
              name="options"
              required
              rows={4}
              placeholder={'Opção A\nOpção B\nOpção C'}
              className={fieldClass}
            />
            <label className="text-xs text-muted-foreground">
              Número da opção correta (1, 2, 3...)
            </label>
            <input
              name="correct"
              type="number"
              min={1}
              defaultValue={1}
              className={`${fieldClass} w-24`}
            />
            <SubmitButton type="submit" size="sm">
              Adicionar questão
            </SubmitButton>
          </form>
        </section>

        {questions.length > 0 && (
          <section className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Responder (correção automática)</h2>
            <form action={submitQuizAttemptAction} className="flex flex-col gap-3">
              <input type="hidden" name="quizId" value={quiz.id} />
              <input type="hidden" name="count" value={questions.length} />
              <input
                name="studentName"
                placeholder="Nome do aluno (opcional)"
                className={fieldClass}
              />
              {questions.map((q, i) => (
                <fieldset key={q.id} className="rounded-md border border-border p-3">
                  <legend className="px-1 text-xs text-muted-foreground">Questão {i + 1}</legend>
                  <p className="mb-2 text-sm font-medium">{q.prompt}</p>
                  <div className="space-y-1 text-sm">
                    {q.options.map((opt, oi) => (
                      <label key={oi} className="flex items-center gap-2">
                        <input type="radio" name={`q_${i}`} value={oi} required={oi === 0} />
                        {String.fromCharCode(65 + oi)}) {opt}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <SubmitButton type="submit" size="sm">
                Enviar respostas
              </SubmitButton>
            </form>
          </section>
        )}
      </div>

      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Resultados ({attempts.length})</h2>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma resposta registrada ainda.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {attempts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <span>{a.studentName || 'Anônimo'}</span>
                <span className="font-medium">
                  {a.score} / {a.total}
                  <span className="ml-2 text-muted-foreground">
                    {a.total > 0 ? Math.round((a.score / a.total) * 100) : 0}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
