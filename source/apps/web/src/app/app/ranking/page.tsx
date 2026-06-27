import { getTenantSettings, listClasses, listStudents } from '@on-education/module-nucleo';
import { medalFor, pointsTotals } from '@on-education/module-pedagogico';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cardClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ranking · Edu On Way' };

const MEDAL_COLORS: Record<number, string> = {
  0: 'text-yellow-500',
  1: 'text-slate-400',
  2: 'text-amber-600',
};

const POSITION_LABELS: Record<number, string> = {
  0: '1º',
  1: '2º',
  2: '3º',
};

export default async function RankingPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');

  const client = db();

  const [alunos, turmas, totais, settings] = await Promise.all([
    listStudents(client, ctx).catch(() => [] as Awaited<ReturnType<typeof listStudents>>),
    listClasses(client, ctx).catch(() => [] as Awaited<ReturnType<typeof listClasses>>),
    pointsTotals(client, ctx).catch(() => new Map<string, number>()),
    getTenantSettings(client, ctx).catch(() => null),
  ]);

  const gamificacaoOn = settings?.gamificationEnabled ?? true;
  const faixas = settings
    ? { bronze: settings.medalBronze, prata: settings.medalPrata, ouro: settings.medalOuro }
    : undefined;
  const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));

  const ranking = alunos
    .map((a) => ({
      id: a.id,
      nome: a.fullName,
      turma: a.classId ? (turmaNome.get(a.classId) ?? null) : null,
      pontos: totais.get(a.id) ?? 0,
    }))
    .filter((r) => r.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos);

  const totalAlunos = alunos.length;

  return (
    <>
      <PageHeader
        title="Ranking"
        description="Classificacao geral dos alunos por pontos de gamificacao."
      />

      {!gamificacaoOn && (
        <div className={cardClass}>
          <p className="text-sm text-muted-foreground">
            A gamificacao esta desativada para esta escola. Ative em{' '}
            <Link href="/app/escola" className="underline">
              Configuracoes da Escola
            </Link>{' '}
            para comecar a premiar alunos com pontos.
          </p>
        </div>
      )}

      {gamificacaoOn && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className={cardClass}>
              <div className="text-2xl font-semibold">{totalAlunos}</div>
              <div className="text-xs text-muted-foreground">Alunos cadastrados</div>
            </div>
            <div className={cardClass}>
              <div className="text-2xl font-semibold">{ranking.length}</div>
              <div className="text-xs text-muted-foreground">Com pontos</div>
            </div>
            <div className={cardClass}>
              <div className="text-2xl font-semibold">
                {ranking[0] ? ranking[0].pontos : 0}
              </div>
              <div className="text-xs text-muted-foreground">Pontuacao do lider</div>
            </div>
          </div>

          <div className={cardClass}>
            <h2 className="mb-4 text-sm font-medium">Classificacao geral</h2>

            {ranking.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="text-3xl">🏆</span>
                <p className="text-sm font-medium">Nenhum aluno tem pontos ainda.</p>
                <p className="text-xs text-muted-foreground">
                  Premeie alunos pela ficha de cada aluno para que eles aparecam aqui.
                </p>
              </div>
            ) : (
              <ol className="divide-y divide-border/60">
                {ranking.map((r, i) => {
                  const medal = medalFor(r.pontos, faixas);
                  const isTop3 = i < 3;
                  return (
                    <li
                      key={r.id}
                      className={`flex items-center gap-3 py-2.5 ${isTop3 ? 'font-medium' : ''}`}
                    >
                      <span
                        className={`w-7 shrink-0 text-right text-sm tabular-nums ${
                          MEDAL_COLORS[i] ?? 'text-muted-foreground'
                        }`}
                      >
                        {POSITION_LABELS[i] ?? `${i + 1}º`}
                      </span>

                      <span className="text-base">{medal.emoji}</span>

                      <span className="min-w-0 flex-1">
                        <Link
                          href={`/app/alunos/${r.id}`}
                          className="hover:underline"
                        >
                          {r.nome}
                        </Link>
                        {r.turma && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {r.turma}
                          </span>
                        )}
                      </span>

                      <span
                        className={`shrink-0 tabular-nums text-sm ${
                          isTop3 ? MEDAL_COLORS[i] ?? '' : 'text-muted-foreground'
                        }`}
                      >
                        {r.pontos} pts
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </>
      )}
    </>
  );
}
