import { listClasses, listSubjects } from '@on-education/module-nucleo';
import { listLessonPlans } from '@on-education/module-sala-de-aula';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createLessonPlanAction, deleteLessonPlanAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Planejamento · On Way Education' };

const KIND_LABEL: Record<string, string> = {
  aula: 'Aula',
  avaliacao: 'Avaliação',
  trabalho: 'Trabalho',
};

export default async function PlanejamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const isSchool = ctx.tenantType === 'organization';

  const turmas = await listClasses(client, ctx);
  const turmaId = classId || turmas[0]?.id || '';
  const [planos, disciplinas] = await Promise.all([
    turmaId ? listLessonPlans(client, ctx, turmaId) : Promise.resolve([]),
    isSchool ? listSubjects(client, ctx) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title="Planejamento"
        description="Planos de aula, avaliações e trabalhos por turma e matéria. No diário, você liga o registro ao plano."
      />

      {turmas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Crie uma turma primeiro.</p>
      ) : (
        <>
          <form method="get" className={`${cardClass} flex flex-wrap items-end gap-3`}>
            <label className="flex flex-col gap-1 text-sm">
              Turma
              <select name="classId" defaultValue={turmaId} className={fieldClass}>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" size="sm" variant="outline">
              Ver turma
            </Button>
          </form>

          <div className="grid gap-5 md:grid-cols-2">
            <div className={cardClass}>
              <h2 className="mb-3 text-sm font-medium">Planejado ({planos.length})</h2>
              {planos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada planejado para esta turma.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {planos.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-start justify-between gap-2 border-b border-border/60 pb-2 last:border-0"
                    >
                      <span>
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                          {KIND_LABEL[p.kind] ?? p.kind}
                        </span>{' '}
                        <span className="font-medium">{p.title}</span>
                        <span className="text-muted-foreground">
                          {p.subjectName ? ` · ${p.subjectName}` : ''}
                          {p.date ? ` · ${p.date.split('-').reverse().join('/')}` : ''}
                        </span>
                        {p.content && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {p.content}
                          </span>
                        )}
                      </span>
                      <form action={deleteLessonPlanAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          message="Remover este item do planejamento?"
                          className="h-6 px-1.5 text-xs"
                        >
                          ✕
                        </ConfirmButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={cardClass}>
              <h2 className="mb-3 text-sm font-medium">Novo item</h2>
              <form action={createLessonPlanAction} className="flex flex-col gap-2">
                <input type="hidden" name="classId" value={turmaId} />
                <select name="kind" className={fieldClass} defaultValue="aula">
                  <option value="aula">Plano de aula</option>
                  <option value="avaliacao">Avaliação</option>
                  <option value="trabalho">Trabalho</option>
                </select>
                {isSchool && (
                  <select name="subjectId" className={fieldClass} defaultValue="">
                    <option value="">Matéria (opcional)</option>
                    {disciplinas.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
                <input name="title" required placeholder="Título" className={fieldClass} />
                <input name="date" type="date" className={fieldClass} />
                <textarea
                  name="content"
                  rows={4}
                  placeholder="Objetivos, conteúdo, instruções…"
                  className={fieldClass}
                />
                <Button type="submit" size="sm">
                  Adicionar ao planejamento
                </Button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
