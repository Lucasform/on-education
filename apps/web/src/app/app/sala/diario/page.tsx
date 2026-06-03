import { listClasses } from '@on-education/module-nucleo';
import { listLessonPlans, listLessons } from '@on-education/module-sala-de-aula';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { hojeISO, inicioPeriodo, type Periodo } from '@/lib/date';

import { createLessonAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Diário de classe · On Way Education' };

export default async function DiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: Periodo }>;
}) {
  const { periodo = 'mes' } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [todasAulas, turmas, planos] = await Promise.all([
    listLessons(client, ctx),
    listClasses(client, ctx),
    listLessonPlans(client, ctx),
  ]);
  const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));
  const planoTitulo = new Map(planos.map((p) => [p.id, p.title]));

  const desde = inicioPeriodo(periodo);
  const aulas = desde ? todasAulas.filter((a) => a.date >= desde) : todasAulas;
  const periodoLabel: Record<Periodo, string> = {
    semana: 'Última semana',
    mes: 'Último mês',
    tudo: 'Tudo',
  };

  return (
    <>
      <PageHeader
        title="Diário de classe"
        description="Registre os conteúdos dados em cada aula."
      />

      <form method="get" className={`${cardClass} flex flex-wrap items-end gap-3`}>
        <label className="flex flex-col gap-1 text-sm">
          Período
          <select name="periodo" defaultValue={periodo} className={fieldClass}>
            <option value="semana">Última semana</option>
            <option value="mes">Último mês</option>
            <option value="tudo">Tudo</option>
          </select>
        </label>
        <Button type="submit" size="sm" variant="outline">
          Aplicar
        </Button>
        <span className="text-xs text-muted-foreground">{periodoLabel[periodo]}</span>
      </form>
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Aulas registradas ({aulas.length})</h2>
          {aulas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma aula registrada ainda.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {aulas.map((a) => (
                <li key={a.id} className="rounded-md border border-border p-2">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{a.topic}</span>
                    <span className="text-muted-foreground">{a.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {turmaNome.get(a.classId) ?? 'Turma'}
                    {a.notes ? ` · ${a.notes}` : ''}
                    {a.lessonPlanId && planoTitulo.get(a.lessonPlanId) && (
                      <span className="text-primary">
                        {' '}
                        · plano: {planoTitulo.get(a.lessonPlanId)}
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Registrar aula</h2>
          <form action={createLessonAction} className="flex flex-col gap-2">
            <select name="classId" required className={fieldClass} defaultValue="">
              <option value="" disabled>
                Selecione a turma
              </option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              name="date"
              type="date"
              required
              defaultValue={hojeISO()}
              className={fieldClass}
            />
            <input
              name="topic"
              required
              placeholder="Conteúdo / tema da aula"
              className={fieldClass}
            />
            {planos.length > 0 && (
              <select name="lessonPlanId" className={fieldClass} defaultValue="">
                <option value="">Vincular a um plano (opcional)</option>
                {planos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                    {p.subjectName ? ` · ${p.subjectName}` : ''}
                  </option>
                ))}
              </select>
            )}
            <textarea
              name="notes"
              placeholder="Observações (opcional)"
              rows={2}
              className={fieldClass}
            />
            <Button type="submit" size="sm">
              Registrar
            </Button>
          </form>
          {turmas.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Crie uma turma antes de registrar aulas.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
