import { SubmitButton } from '@/components/submit-button';
import {
  getClass,
  getTenantSettings,
  listClassSubjects,
  listStudents,
  listSubjects,
  weightedAverage,
  listGradeComponents,
} from '@on-education/module-nucleo';
import { listMaterials, medalFor, pointsTotals } from '@on-education/module-pedagogico';
import { listGrades, listAttendance } from '@on-education/module-sala-de-aula';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import { signedUrlForTenantFile } from '@/server/storage';

import {
  deleteMaterialAction,
  linkClassSubjectAction,
  unlinkClassSubjectAction,
  updateClassDetailsAction,
  uploadMaterialAction,
} from '../../actions';

/** Formata bytes em KB/MB para a UI. */
function formatBytes(n: number | null): string {
  if (!n) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Turma · Edu On Way' };

export default async function TurmaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const isSchool = ctx.tenantType === 'organization';

  const [turma, alunos, materias, disciplinas, materiais, totais, settings, todasNotas, todasFaltas, componentes] = await Promise.all([
    getClass(client, ctx, id).catch(() => null),
    listStudents(client, ctx).catch(() => []),
    listClassSubjects(client, ctx, id).catch(() => []),
    isSchool ? listSubjects(client, ctx).catch(() => []) : Promise.resolve([]),
    listMaterials(client, ctx, id).catch(() => []),
    pointsTotals(client, ctx).catch(() => new Map<string, number>()),
    getTenantSettings(client, ctx).catch(() => null),
    listGrades(client, ctx).catch(() => []),
    listAttendance(client, ctx).catch(() => []),
    isSchool ? listGradeComponents(client, ctx).catch(() => []) : Promise.resolve([]),
  ]);
  if (!turma) redirect('/app/turmas');

  const gamificacaoOn = settings?.gamificationEnabled ?? true;
  const faixas = settings
    ? { bronze: settings.medalBronze, prata: settings.medalPrata, ouro: settings.medalOuro }
    : undefined;
  const daTurma = alunos.filter((a) => a.classId === id);

  // Estatísticas da turma
  const mediasPorAluno = daTurma.map((a) => {
    const notasAluno = todasNotas.filter((g) => g.studentId === a.id && g.classId === id);
    return { id: a.id, nome: a.fullName, media: weightedAverage(notasAluno, componentes) };
  });
  const mediasValidas = mediasPorAluno.filter((m) => m.media !== null) as { id: string; nome: string; media: number }[];
  const mediaGeral = mediasValidas.length
    ? mediasValidas.reduce((s, m) => s + m.media, 0) / mediasValidas.length
    : null;
  const freqPorAluno = daTurma.map((a) => {
    const reg = todasFaltas.filter((f) => f.studentId === a.id && f.classId === id);
    return reg.length ? Math.round((reg.filter((f) => f.present).length / reg.length) * 100) : null;
  });
  const freqsValidas = freqPorAluno.filter((f) => f !== null) as number[];
  const freqGeral = freqsValidas.length
    ? Math.round(freqsValidas.reduce((s, f) => s + f, 0) / freqsValidas.length)
    : null;
  // Ranking de pontos da turma (gamificação): só entra quem já tem pontos.
  const ranking = gamificacaoOn
    ? daTurma
        .map((a) => ({ id: a.id, nome: a.fullName, pontos: totais.get(a.id) ?? 0 }))
        .filter((r) => r.pontos > 0)
        .sort((a, b) => b.pontos - a.pontos)
    : [];
  const jaVinculadas = new Set(materias.map((m) => m.subjectId));
  const disponiveis = disciplinas.filter((s) => !jaVinculadas.has(s.id));

  // Link de download temporário (signed URL) por material — gerado no servidor.
  const materiaisComLink = await Promise.all(
    materiais.map(async (m) => ({
      ...m,
      url: await signedUrlForTenantFile(m.storagePath).catch(() => ''),
    })),
  ).catch(() => [] as (typeof materiais[number] & { url: string })[]);

  return (
    <>
      <PageHeader title={turma.name} description="Detalhes da turma, alunos e grade de matérias." />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/app/turmas" className="text-sm text-primary underline-offset-4 hover:underline">
          ← Voltar para turmas
        </Link>
        {daTurma.length > 0 && (
          <Link
            href={`/app/turmas/${id}/boletim`}
            className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            Boletim consolidado →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{daTurma.length}</div>
          <div className="text-xs text-muted-foreground">Alunos</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">
            {mediaGeral !== null ? mediaGeral.toFixed(1) : '—'}
          </div>
          <div className="text-xs text-muted-foreground">Média da turma</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">
            {freqGeral !== null ? `${freqGeral}%` : '—'}
          </div>
          <div className="text-xs text-muted-foreground">Frequência média</div>
        </div>
        {isSchool && (
          <div className={cardClass}>
            <div className="text-2xl font-semibold">{materias.length}</div>
            <div className="text-xs text-muted-foreground">Matérias</div>
          </div>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Dados da turma</h2>
          <form action={updateClassDetailsAction} className="flex flex-col gap-2">
            <input type="hidden" name="classId" value={turma.id} />
            <label className="flex flex-col gap-1 text-sm">
              Série/ano
              <input
                name="gradeLevel"
                defaultValue={turma.gradeLevel ?? ''}
                placeholder="ex.: 6º ano"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Faixa etária
              <input
                name="ageRange"
                defaultValue={turma.ageRange ?? ''}
                placeholder="ex.: 11-12 anos"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Descrição
              <input
                name="description"
                defaultValue={turma.description ?? ''}
                placeholder="Descrição (opcional)"
                className={fieldClass}
              />
            </label>
            <SubmitButton type="submit" size="sm">
              Salvar dados
            </SubmitButton>
          </form>
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Alunos da turma ({daTurma.length})</h2>
          {daTurma.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum aluno nesta turma. Defina a turma ao cadastrar o aluno.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {daTurma.map((a) => {
                const pts = totais.get(a.id) ?? 0;
                return (
                  <li key={a.id} className="flex items-center justify-between gap-2">
                    <Link href={`/app/alunos/${a.id}`} className="hover:underline">
                      {a.fullName}
                    </Link>
                    {gamificacaoOn && pts > 0 && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {medalFor(pts, faixas).emoji} {pts}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Estatísticas por aluno */}
      {mediasValidas.length > 0 && (
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Desempenho por aluno</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Aluno</th>
                  <th className="pb-2 pr-4 font-medium text-right">Média</th>
                  <th className="pb-2 font-medium text-right">Frequência</th>
                </tr>
              </thead>
              <tbody>
                {daTurma
                  .map((a, i) => ({
                    ...a,
                    media: mediasPorAluno[i]?.media ?? null,
                    freq: freqPorAluno[i] ?? null,
                  }))
                  .sort((a, b) => (b.media ?? -1) - (a.media ?? -1))
                  .map((a) => (
                    <tr key={a.id} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 pr-4">
                        <Link href={`/app/alunos/${a.id}`} className="hover:underline">
                          {a.fullName}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-4 text-right font-medium">
                        {a.media !== null ? a.media.toFixed(1) : '—'}
                      </td>
                      <td
                        className={`py-1.5 text-right text-xs ${
                          a.freq !== null && a.freq < 75
                            ? 'font-medium text-destructive'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {a.freq !== null ? `${a.freq}%` : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ranking.length > 0 && (
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">🏆 Ranking de pontos da turma</h2>
          <ol className="space-y-1 text-sm">
            {ranking.map((r, i) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="w-5 text-right text-xs text-muted-foreground">{i + 1}º</span>
                  <Link href={`/app/alunos/${r.id}`} className="hover:underline">
                    {r.nome}
                  </Link>
                  <span>{medalFor(r.pontos, faixas).emoji}</span>
                </span>
                <span className="font-medium">{r.pontos} pts</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {isSchool && (
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Matérias da turma ({materias.length})</h2>
          {materias.length === 0 ? (
            <p className="mb-3 text-sm text-muted-foreground">Nenhuma matéria vinculada ainda.</p>
          ) : (
            <ul className="mb-3 flex flex-wrap gap-2">
              {materias.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-full border border-border bg-muted/40 py-1 pl-3 pr-1 text-sm"
                >
                  <span>{m.subjectName ?? 'Matéria'}</span>
                  <form action={unlinkClassSubjectAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="classId" value={turma.id} />
                    <ConfirmButton
                      size="sm"
                      variant="ghost"
                      aria-label="Remover matéria da turma"
                      message="Remover esta matéria da turma?"
                      className="h-6 px-2 text-xs"
                    >
                      ✕
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {disponiveis.length > 0 ? (
            <form action={linkClassSubjectAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="classId" value={turma.id} />
              <select name="subjectId" required className={fieldClass} defaultValue="">
                <option value="" disabled>
                  Selecione a matéria
                </option>
                {disponiveis.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <SubmitButton type="submit" size="sm" variant="outline">
                Adicionar matéria
              </SubmitButton>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground">
              {disciplinas.length === 0
                ? 'Cadastre disciplinas em Escola › Disciplinas para montar a grade.'
                : 'Todas as disciplinas já estão vinculadas a esta turma.'}
            </p>
          )}
        </div>
      )}

      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Materiais da turma ({materiaisComLink.length})</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Arquivos privados da turma (PDF, slides, imagens). O link de download expira por
          segurança. Em breve o WayOn usa esses materiais para gerar conteúdo.
        </p>

        {materiaisComLink.length > 0 && (
          <ul className="mb-4 divide-y divide-border/60 text-sm">
            {materiaisComLink.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  {m.url ? (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {m.title}
                    </a>
                  ) : (
                    <span className="font-medium">{m.title}</span>
                  )}
                  <span className="block truncate text-xs text-muted-foreground">
                    {m.fileName}
                    {m.subject ? ` · ${m.subject}` : ''}
                    {m.sizeBytes ? ` · ${formatBytes(m.sizeBytes)}` : ''}
                  </span>
                </span>
                <form action={deleteMaterialAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <ConfirmButton
                    size="sm"
                    variant="ghost"
                    message={`Excluir o material "${m.title}"? O arquivo é removido.`}
                    className="h-7 px-2 text-xs"
                  >
                    Excluir
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={uploadMaterialAction} className="flex flex-col gap-2">
          <input type="hidden" name="classId" value={turma.id} />
          <input
            name="title"
            placeholder="Título (opcional; usa o nome do arquivo)"
            className={fieldClass}
          />
          <input name="subject" placeholder="Matéria (opcional)" className={fieldClass} />
          <input
            type="file"
            name="file"
            required
            aria-label="Arquivo do material"
            className="text-xs file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
          />
          <span className="text-[11px] text-muted-foreground">Até 25 MB por arquivo.</span>
          <div>
            <SubmitButton type="submit" size="sm" variant="outline">
              Enviar material
            </SubmitButton>
          </div>
        </form>
      </div>
    </>
  );
}
