import { SubmitButton } from '@/components/submit-button';
import {
  getClass,
  getCouncil,
  listCouncilRemarks,
  listStudentsForCouncil,
} from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { closeCouncilAction, saveCouncilRemarkAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Conselho · Edu On Way' };

const STATUS_LABEL: Record<string, string> = { draft: 'Em andamento', closed: 'Encerrado' };
const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-500',
  closed: 'bg-muted text-muted-foreground',
};

const RECOMMENDATION_OPTIONS = [
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'reforco', label: 'Reforço' },
  { value: 'dependencia', label: 'Dependência' },
  { value: 'reprovado', label: 'Reprovado' },
];

export default async function ConselhoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const council = await getCouncil(client, ctx, id).catch(() => null);
  if (!council) redirect('/app/conselho-classe');

  const [turma, alunos, pareceres] = await Promise.all([
    getClass(client, ctx, council.classId).catch(() => null),
    listStudentsForCouncil(client, ctx, council.classId).catch(() => []),
    listCouncilRemarks(client, ctx, id).catch(() => []),
  ]);

  const parecerPorAluno = new Map(pareceres.map((r) => [r.studentId, r]));

  return (
    <>
      <PageHeader
        title={council.title}
        description={`Turma: ${turma?.name ?? ''} · ${council.date.split('-').reverse().join('/')}`}
        back={{ href: '/app/conselho-classe', label: 'Conselhos' }}
      />

      <div className="mb-4 flex items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[council.status] ?? STATUS_CLASS.draft}`}
        >
          {STATUS_LABEL[council.status] ?? council.status}
        </span>
        {council.status === 'draft' && (
          <form action={closeCouncilAction}>
            <input type="hidden" name="id" value={council.id} />
            <SubmitButton size="sm" variant="outline">
              Encerrar conselho
            </SubmitButton>
          </form>
        )}
      </div>

      {alunos.length === 0 ? (
        <div className={cardClass}>
          <p className="text-sm text-muted-foreground">
            Nenhum aluno cadastrado nesta turma.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alunos.map((aluno) => {
            const parecer = parecerPorAluno.get(aluno.id);
            return (
              <div key={aluno.id} className={cardClass}>
                <h3 className="mb-3 text-sm font-medium">{aluno.fullName}</h3>
                {council.status === 'closed' ? (
                  <div className="space-y-1 text-sm">
                    {parecer?.recommendation && (
                      <p>
                        <span className="text-muted-foreground">Situação:</span>{' '}
                        {parecer.recommendation}
                      </p>
                    )}
                    {parecer?.remark && (
                      <p className="whitespace-pre-wrap text-muted-foreground">{parecer.remark}</p>
                    )}
                    {!parecer && (
                      <p className="text-muted-foreground">Sem parecer registrado.</p>
                    )}
                  </div>
                ) : (
                  <form action={saveCouncilRemarkAction} className="flex flex-col gap-2">
                    <input type="hidden" name="councilId" value={council.id} />
                    <input type="hidden" name="studentId" value={aluno.id} />
                    <div className="flex flex-wrap gap-3 text-sm">
                      {RECOMMENDATION_OPTIONS.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="recommendation"
                            value={opt.value}
                            defaultChecked={parecer?.recommendation === opt.value}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                    <textarea
                      name="remark"
                      rows={2}
                      placeholder="Observação (opcional)"
                      defaultValue={parecer?.remark ?? ''}
                      className={fieldClass}
                    />
                    <SubmitButton type="submit" size="sm">
                      Salvar parecer
                    </SubmitButton>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
