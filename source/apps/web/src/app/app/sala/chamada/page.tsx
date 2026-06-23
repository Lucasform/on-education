import { SubmitButton } from '@/components/submit-button';
import { listClasses, listStudents, listSubjects } from '@on-education/module-nucleo';
import { listAttendanceForDateClass } from '@on-education/module-sala-de-aula';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { ProductTour } from '@/components/product-tour';
import { hojeISO } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { recordChamadaAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Chamada · Edu On Way' };

export default async function ChamadaPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; subjectId?: string; date?: string }>;
}) {
  const { classId, subjectId, date: dateParam } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [turmas, alunos, disciplinas] = await Promise.all([
    listClasses(client, ctx).catch(() => []),
    listStudents(client, ctx).catch(() => []),
    listSubjects(client, ctx).catch(() => []),
  ]);

  const turmaId = classId || turmas[0]?.id || '';
  const subjId = subjectId ?? '';
  const date = dateParam ?? hojeISO();

  // Ordena alunos da turma alfabeticamente
  const daTurma = alunos
    .filter((a) => a.classId === turmaId)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'));

  // Carrega chamada já registrada para esse dia+turma+matéria
  const registrosExistentes =
    turmaId && date
      ? await listAttendanceForDateClass(client, ctx, turmaId, date, subjId || null).catch(() => [])
      : [];

  const jaRegistrada = registrosExistentes.length > 0;
  const presencaMap = new Map(registrosExistentes.map((r) => [r.studentId, r.present]));

  const turmaLabel = turmas.find((t) => t.id === turmaId)?.name ?? 'Turma';
  const aulaLabel = subjId ? (disciplinas.find((s) => s.id === subjId)?.name ?? '') : 'dia';
  const faltasExistentes = registrosExistentes.filter((r) => !r.present).length;

  return (
    <>
      <PageHeader
        title="Chamada"
        description="Marque só quem faltou. Quem não for marcado entra como presente."
      />
      <ProductTour
        id="chamada"
        steps={[
          { selector: 'h1', title: 'Chamada', body: 'Marque só quem faltou — o resto entra como presente automaticamente.' },
          { selector: '[data-tour="chamada-filtro"]', title: 'Escolha a turma e o dia', body: 'Selecione a turma, a matéria e a data; a lista de alunos aparece abaixo para você marcar.' },
        ]}
      />

      {/* Filtro */}
      <form method="get" data-tour="chamada-filtro" className={`${cardClass} flex flex-wrap items-end gap-3`}>
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
        <label className="flex flex-col gap-1 text-sm">
          Matéria
          <select name="subjectId" defaultValue={subjId} className={fieldClass}>
            <option value="">Chamada do dia</option>
            {disciplinas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Data
          <input name="date" type="date" defaultValue={date} className={fieldClass} />
        </label>
        <SubmitButton type="submit" size="sm" variant="outline">
          Carregar
        </SubmitButton>
      </form>

      {turmas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Crie uma turma e adicione alunos primeiro.</p>
      ) : (
        <form action={recordChamadaAction} className={cardClass}>
          <input type="hidden" name="classId" value={turmaId} />
          <input type="hidden" name="subjectId" value={subjId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="studentIds" value={daTurma.map((a) => a.id).join(',')} />

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">{turmaLabel} · {date.split('-').reverse().join('/')} · {aulaLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {daTurma.length} aluno(s)
              </p>
            </div>
            <div className="flex items-center gap-3">
              {jaRegistrada && (
                <span className="flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
                  ⚠ Já registrada · {faltasExistentes} falta(s)
                </span>
              )}
              <SubmitButton type="submit" size="sm">
                {jaRegistrada ? 'Atualizar chamada' : 'Salvar chamada'}
              </SubmitButton>
            </div>
          </div>

          {daTurma.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum aluno nesta turma.</p>
          ) : (
            <ul className="divide-y divide-border">
              {daTurma.map((a) => {
                const foiPresente = presencaMap.get(a.id);
                const defaultChecked = jaRegistrada ? foiPresente === false : false;
                return (
                  <li key={a.id}>
                    <label className="flex cursor-pointer items-center justify-between gap-2 py-2.5 text-sm hover:bg-accent/30 px-2 -mx-2 rounded">
                      <div className="flex items-center gap-2">
                        {jaRegistrada && (
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${foiPresente === false ? 'bg-danger' : 'bg-success'}`}
                          />
                        )}
                        <span>{a.fullName}</span>
                      </div>
                      <span className="flex items-center gap-2 text-xs text-danger">
                        <input
                          type="checkbox"
                          name={`absent_${a.id}`}
                          defaultChecked={defaultChecked}
                          className="h-5 w-5 accent-danger"
                        />
                        faltou
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </form>
      )}
    </>
  );
}
