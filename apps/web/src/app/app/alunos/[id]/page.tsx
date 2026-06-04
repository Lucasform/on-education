import { SubmitButton } from '@/components/submit-button';
import {
  listGradeComponents,
  listGuardians,
  listStudentGuardians,
  listStudents,
  weightedAverage,
} from '@on-education/module-nucleo';
import { listAttendance, listGrades } from '@on-education/module-sala-de-aula';
import { listPortfolioEntries } from '@on-education/module-pedagogico';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { linkGuardianAction, unlinkGuardianAction } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function AlunoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();

  const isSchool = ctx.tenantType === 'organization';
  const [alunos, notas, presencas, portfolio, vinculos, responsaveis, componentes] =
    await Promise.all([
      listStudents(client, ctx),
      listGrades(client, ctx),
      listAttendance(client, ctx),
      listPortfolioEntries(client, ctx),
      listStudentGuardians(client, ctx, id),
      isSchool ? listGuardians(client, ctx) : Promise.resolve([]),
      isSchool ? listGradeComponents(client, ctx) : Promise.resolve([]),
    ]);

  const aluno = alunos.find((a) => a.id === id);
  if (!aluno) redirect('/app/alunos');

  const vinculados = new Set(vinculos.map((v) => v.guardianId));
  const guardiansDisponiveis = responsaveis.filter((g) => !vinculados.has(g.id));

  const minhasNotas = notas.filter((n) => n.studentId === id);
  const minhasPresencas = presencas.filter((p) => p.studentId === id);
  const meuPortfolio = portfolio.filter((p) => p.studentId === id);
  const mediaNum = weightedAverage(minhasNotas, componentes);
  const media = mediaNum === null ? '—' : mediaNum.toFixed(1);
  const compNome = new Map(componentes.map((c) => [c.id, c.name]));
  const freq = minhasPresencas.length
    ? `${Math.round((minhasPresencas.filter((p) => p.present).length / minhasPresencas.length) * 100)}%`
    : '—';

  return (
    <>
      <PageHeader title={aluno.fullName} description="Histórico do aluno." />
      <Link href="/app/alunos" className="text-sm text-primary underline-offset-4 hover:underline">
        ← Voltar para alunos
      </Link>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{media}</div>
          <div className="text-xs text-muted-foreground">Média</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{freq}</div>
          <div className="text-xs text-muted-foreground">Frequência</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{minhasNotas.length}</div>
          <div className="text-xs text-muted-foreground">Notas</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{meuPortfolio.length}</div>
          <div className="text-xs text-muted-foreground">Portfólio</div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Notas</h2>
          {minhasNotas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem notas.</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {minhasNotas.map((n) => (
                <li key={n.id} className="flex justify-between gap-2">
                  <span>
                    {n.label}
                    {n.kind !== 'formal' && (
                      <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                        {n.kind === 'participacao' ? 'participação' : 'anotação'}
                      </span>
                    )}
                    {n.componentId && compNome.get(n.componentId) && (
                      <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                        {compNome.get(n.componentId)}
                      </span>
                    )}
                    {n.note && <span className="block text-xs opacity-80">{n.note}</span>}
                  </span>
                  <span className="font-medium text-foreground">
                    {n.value === null ? '—' : n.value}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Responsáveis</h2>
          {vinculos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem responsáveis vinculados.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {vinculos.map((v) => (
                <li key={v.id} className="flex items-start justify-between gap-2">
                  <span>
                    <span className="font-medium">{v.guardianName ?? 'Responsável'}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      · {v.relation ?? 'responsável'}
                      {v.isFinancial ? ' · financeiro' : ''}
                      {v.canPickup ? ' · busca' : ''}
                      {v.isEmergency ? ' · emergência' : ''}
                    </span>
                    {v.guardianPhone && (
                      <span className="block text-xs text-muted-foreground">{v.guardianPhone}</span>
                    )}
                  </span>
                  {isSchool && (
                    <form action={unlinkGuardianAction}>
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="studentId" value={aluno.id} />
                      <ConfirmButton
                        size="sm"
                        variant="ghost"
                        message="Desvincular este responsável?"
                        className="h-7 px-2 text-xs"
                      >
                        Desvincular
                      </ConfirmButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isSchool && (
            <form
              action={linkGuardianAction}
              className="mt-4 flex flex-col gap-2 border-t border-border pt-3"
            >
              <input type="hidden" name="studentId" value={aluno.id} />
              <select name="guardianId" required className={fieldClass} defaultValue="">
                <option value="" disabled>
                  Vincular responsável…
                </option>
                {guardiansDisponiveis.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.fullName}
                  </option>
                ))}
              </select>
              <input name="relation" placeholder="Parentesco (ex.: mãe)" className={fieldClass} />
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" name="isFinancial" /> financeiro
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" name="canPickup" /> pode buscar
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" name="isEmergency" /> emergência
                </label>
              </div>
              <SubmitButton type="submit" size="sm" variant="outline">
                Vincular
              </SubmitButton>
              {responsaveis.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Cadastre responsáveis em Escola › Responsáveis primeiro.
                </p>
              )}
            </form>
          )}
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Portfólio</h2>
        {meuPortfolio.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem registros.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {meuPortfolio.map((p) => (
              <li key={p.id}>
                <span className="font-medium">{p.title}</span>
                {p.description && <span className="text-muted-foreground"> · {p.description}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
