import { SubmitButton } from '@/components/submit-button';
import {
  getStudent,
  getTenantSettings,
  listClasses,
  listExitAuthorizationsForStudent,
  listGradeComponents,
  listGuardians,
  listOccurrenceLinks,
  listOccurrences,
  listStudentGuardians,
  weightedAverage,
} from '@on-education/module-nucleo';
import { listAttendanceForStudent, listGradesForStudent } from '@on-education/module-sala-de-aula';
import {
  listPortfolioForStudent,
  listStudentPoints,
  medalFor,
} from '@on-education/module-pedagogico';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { PrintButton } from '@/components/print-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  awardPointsAction,
  createExitAuthorizationAction,
  deleteStudentPointAction,
  linkGuardianAction,
  transferStudentClassAction,
  unlinkGuardianAction,
  updateExitAuthorizationStatusAction,
  updateStudentProfileAction,
  uploadStudentPhotoAction,
} from '../../actions';

export const dynamic = 'force-dynamic';

export default async function AlunoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();

  const isSchool = ctx.tenantType === 'organization';
  const [
    aluno,
    minhasNotas,
    minhasPresencas,
    meuPortfolio,
    vinculos,
    responsaveis,
    componentes,
    pontos,
    settings,
    todasOcorrencias,
    linksOcorrencias,
    turmas,
    autorizacoesSaida,
  ] = await Promise.all([
    getStudent(client, ctx, id).catch(() => null),
    listGradesForStudent(client, ctx, id).catch(() => []),
    listAttendanceForStudent(client, ctx, id).catch(() => []),
    listPortfolioForStudent(client, ctx, id).catch(() => []),
    listStudentGuardians(client, ctx, id).catch(() => []),
    isSchool ? listGuardians(client, ctx).catch(() => []) : Promise.resolve([]),
    isSchool ? listGradeComponents(client, ctx).catch(() => []) : Promise.resolve([]),
    listStudentPoints(client, ctx, id).catch(() => []),
    getTenantSettings(client, ctx).catch(() => null),
    isSchool ? listOccurrences(client, ctx).catch(() => []) : Promise.resolve([]),
    isSchool ? listOccurrenceLinks(client, ctx).catch(() => []) : Promise.resolve([]),
    listClasses(client, ctx).catch(() => [] as { id: string; name: string }[]),
    isSchool ? listExitAuthorizationsForStudent(client, ctx, id).catch(() => []) : Promise.resolve([]),
  ]);
  if (!aluno) redirect('/app/alunos');

  // Ocorrências deste aluno
  const idsComAluno = new Set(linksOcorrencias.filter((l) => l.studentId === id).map((l) => l.occurrenceId));
  const ocorrenciasDoAluno = todasOcorrencias.filter((o) => idsComAluno.has(o.id));

  const gamificacaoOn = settings?.gamificationEnabled ?? true;
  const totalPontos = pontos.reduce((s, p) => s + p.points, 0);
  const medalha = medalFor(
    totalPontos,
    settings
      ? { bronze: settings.medalBronze, prata: settings.medalPrata, ouro: settings.medalOuro }
      : undefined,
  );

  const vinculados = new Set(vinculos.map((v) => v.guardianId));
  const guardiansDisponiveis = responsaveis.filter((g) => !vinculados.has(g.id));

  const mediaNum = weightedAverage(minhasNotas, componentes);
  const media = mediaNum === null ? '—' : mediaNum.toFixed(1);
  const compNome = new Map(componentes.map((c) => [c.id, c.name]));
  const freq = minhasPresencas.length
    ? `${Math.round((minhasPresencas.filter((p) => p.present).length / minhasPresencas.length) * 100)}%`
    : '—';

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={aluno.fullName}
          description="Histórico do aluno."
          back={{ href: '/app/alunos', label: 'Voltar para alunos' }}
        />
        <span className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={`/app/alunos/${id}/relatorio`}
            className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            Relatório aos pais
          </Link>
          <PrintButton />
        </span>
      </div>

      {/* Foto do aluno */}
      <div className={`${cardClass} print:hidden`}>
        <div className="flex flex-wrap items-center gap-4">
          {aluno.photoUrl ? (
            /* Foto do aluno: URL pública do bucket, não requer next/image */
            <img
              src={aluno.photoUrl}
              alt={aluno.fullName}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground ring-2 ring-border">
              {aluno.fullName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{aluno.fullName}</p>
            {aluno.birthDate && (
              <p className="text-xs text-muted-foreground">
                {aluno.birthDate.split('-').reverse().join('/')}
              </p>
            )}
            <form action={uploadStudentPhotoAction} className="mt-2 flex items-center gap-2">
              <input type="hidden" name="studentId" value={aluno.id} />
              <input
                type="file"
                name="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Foto do aluno"
                className="text-xs file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
              />
              <SubmitButton type="submit" size="sm" variant="outline">
                {aluno.photoUrl ? 'Trocar foto' : 'Adicionar foto'}
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>

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
        {isSchool && (
          <div className={cardClass}>
            <div className="text-2xl font-semibold">{ocorrenciasDoAluno.length}</div>
            <div className="text-xs text-muted-foreground">Ocorrências</div>
          </div>
        )}
      </div>

      {/* Gamificação: conquistas do aluno (pode ser desligada por escola/professor) */}
      {gamificacaoOn && (
        <div className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                {medalha.emoji}
              </span>
              <div>
                <div className="text-sm font-medium">
                  {totalPontos} ponto{totalPontos === 1 ? '' : 's'}
                  {medalha.tier !== 'nenhuma' && (
                    <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs capitalize text-primary">
                      {medalha.tier}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {medalha.toNext > 0
                    ? `Faltam ${medalha.toNext} para a próxima medalha.`
                    : 'Medalha máxima alcançada! 🎉'}
                </p>
              </div>
            </div>
            <form
              action={awardPointsAction}
              className="flex w-full flex-wrap items-end gap-2 sm:w-auto"
            >
              <input type="hidden" name="studentId" value={aluno.id} />
              <input
                name="points"
                type="number"
                min={1}
                max={1000}
                defaultValue={10}
                className={`${fieldClass} w-16`}
                aria-label="Pontos"
              />
              <input
                name="reason"
                placeholder="Motivo (ex.: participação)"
                className={`${fieldClass} min-w-0 flex-1 sm:w-48 sm:flex-none`}
              />
              <SubmitButton type="submit" size="sm" variant="outline">
                Dar pontos
              </SubmitButton>
            </form>
          </div>
          {pontos.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3 text-xs">
              {pontos.slice(0, 8).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-muted-foreground"
                >
                  <span className="font-medium text-foreground">+{p.points}</span>
                  {p.reason && <span>{p.reason}</span>}
                  <form action={deleteStudentPointAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="studentId" value={aluno.id} />
                    <button
                      type="submit"
                      className="text-muted-foreground hover:text-danger"
                      aria-label="Remover pontos"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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

      {/* Faltas detalhadas */}
      {minhasPresencas.filter((p) => !p.present).length > 0 && (
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">
            Faltas ({minhasPresencas.filter((p) => !p.present).length})
          </h2>
          <ul className="space-y-1 text-sm">
            {minhasPresencas
              .filter((p) => !p.present)
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                  <span>{p.date.split('-').reverse().join('/')}</span>
                  {'justification' in p && (p as { justification?: string }).justification && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {(p as { justification?: string }).justification}
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Ocorrências */}
      {isSchool && ocorrenciasDoAluno.length > 0 && (
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">
            Ocorrências ({ocorrenciasDoAluno.length})
          </h2>
          <ul className="space-y-2 text-sm">
            {ocorrenciasDoAluno.map((o) => (
              <li key={o.id} className="flex items-start justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <div>
                  {'type' in o && (o as { type?: string }).type && (
                    <span className="mr-2 rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                      {(o as { type?: string }).type}
                    </span>
                  )}
                  <span>{'description' in o ? (o as { description?: string }).description : ''}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {o.date.split('-').reverse().join('/')}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/app/ocorrencias"
            className="mt-2 block text-xs text-primary underline-offset-4 hover:underline"
          >
            Ver todas as ocorrências →
          </Link>
        </div>
      )}

      {/* Dados pessoais completos */}
      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Dados pessoais</h2>
        <form action={updateStudentProfileAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={aluno.id} />
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">CPF</label>
              <input
                name="cpf"
                placeholder="000.000.000-00"
                defaultValue={(aluno as { cpf?: string | null }).cpf ?? ''}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">RG</label>
              <input
                name="rg"
                placeholder="00.000.000-0"
                defaultValue={(aluno as { rg?: string | null }).rg ?? ''}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Gênero</label>
              <select name="gender" defaultValue={(aluno as { gender?: string | null }).gender ?? ''} className={fieldClass}>
                <option value="">Não informado</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Nacionalidade</label>
              <input
                name="nationality"
                placeholder="Brasileira"
                defaultValue={(aluno as { nationality?: string | null }).nationality ?? ''}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Turno</label>
              <select name="shift" defaultValue={(aluno as { shift?: string | null }).shift ?? ''} className={fieldClass}>
                <option value="">Não informado</option>
                <option value="manhã">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="noite">Noite</option>
                <option value="integral">Integral</option>
              </select>
            </div>
          </div>
          <SubmitButton type="submit" size="sm" variant="outline">
            Salvar dados pessoais
          </SubmitButton>
        </form>
      </div>

      {/* Endereço */}
      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Endereço</h2>
        <form action={updateStudentProfileAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={aluno.id} />
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Endereço</label>
              <input
                name="address"
                placeholder="Rua, número, complemento"
                defaultValue={aluno.address ?? ''}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">CEP</label>
              <input
                name="zipCode"
                placeholder="00000-000"
                defaultValue={aluno.zipCode ?? ''}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Cidade</label>
              <input
                name="city"
                placeholder="Cidade"
                defaultValue={aluno.city ?? ''}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Estado</label>
              <input
                name="state"
                placeholder="UF"
                defaultValue={aluno.state ?? ''}
                className={fieldClass}
              />
            </div>
          </div>
          <SubmitButton type="submit" size="sm" variant="outline">
            Salvar endereço
          </SubmitButton>
        </form>
      </div>

      {/* Informações médicas */}
      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Informações de saúde</h2>
        <form action={updateStudentProfileAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={aluno.id} />
          {/* Preserva campos de outras seções (envia vazio = null, ok pois são opcionais) */}
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Tipo sanguíneo</label>
              <select name="bloodType" defaultValue={aluno.bloodType ?? ''} className={fieldClass}>
                <option value="">Não informado</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">Alergias</label>
              <input
                name="allergies"
                placeholder="Penicilina, amendoim, etc."
                defaultValue={aluno.allergies ?? ''}
                className={fieldClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Observações médicas</label>
            <textarea
              name="medicalNotes"
              rows={3}
              placeholder="Medicamentos, condições especiais, restrições de atividade física…"
              defaultValue={aluno.medicalNotes ?? ''}
              className={fieldClass}
            />
          </div>
          <SubmitButton type="submit" size="sm" variant="outline">
            Salvar informações de saúde
          </SubmitButton>
        </form>
      </div>

      {/* Contato de emergência */}
      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Contato de emergência</h2>
        <form action={updateStudentProfileAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={aluno.id} />
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">Nome</label>
              <input
                name="emergencyName"
                placeholder="Nome completo"
                defaultValue={aluno.emergencyName ?? ''}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Parentesco</label>
              <input
                name="emergencyRelation"
                placeholder="Mãe, pai, tio…"
                defaultValue={aluno.emergencyRelation ?? ''}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Telefone</label>
              <input
                name="emergencyPhone"
                placeholder="(11) 99999-9999"
                defaultValue={aluno.emergencyPhone ?? ''}
                className={fieldClass}
              />
            </div>
          </div>
          <SubmitButton type="submit" size="sm" variant="outline">
            Salvar contato de emergência
          </SubmitButton>
        </form>
      </div>

      {/* Turma */}
      {isSchool && (
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Turma</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Turma atual:{' '}
            <span className="font-medium text-foreground">
              {aluno.classId ? (turmas.find((t) => t.id === aluno.classId)?.name ?? 'desconhecida') : 'sem turma'}
            </span>
          </p>
          <form action={transferStudentClassAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="studentId" value={aluno.id} />
            <select name="classId" className={`${fieldClass} flex-1`} defaultValue={aluno.classId ?? ''}>
              <option value="">Sem turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <SubmitButton type="submit" size="sm" variant="outline">
              Salvar turma
            </SubmitButton>
          </form>
        </div>
      )}

      {/* Autorizações de saída */}
      {isSchool && (
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">
            Autorizações de saída ({autorizacoesSaida.length})
          </h2>

          {autorizacoesSaida.length > 0 && (
            <ul className="mb-4 space-y-2 text-sm">
              {autorizacoesSaida.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-start justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <span
                      className={`mr-2 rounded-full px-2 py-0.5 text-xs ${
                        a.status === 'approved'
                          ? 'bg-success/15 text-success'
                          : a.status === 'denied'
                            ? 'bg-danger/15 text-danger'
                            : a.status === 'executed'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-warning/15 text-warning'
                      }`}
                    >
                      {a.status === 'approved'
                        ? 'aprovada'
                        : a.status === 'denied'
                          ? 'negada'
                          : a.status === 'executed'
                            ? 'executada'
                            : 'pendente'}
                    </span>
                    <span>{a.reason}</span>
                    {a.authorizedByName && (
                      <span className="ml-1 text-xs text-muted-foreground">· por {a.authorizedByName}</span>
                    )}
                    {a.time && (
                      <span className="ml-1 text-xs text-muted-foreground">às {a.time}</span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {a.date.split('-').reverse().join('/')}
                    </span>
                    {a.status === 'pending' && (
                      <>
                        <form action={updateExitAuthorizationStatusAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="approved" />
                          <input type="hidden" name="studentId" value={aluno.id} />
                          <button
                            type="submit"
                            className="rounded-md bg-success/15 px-2 py-0.5 text-xs text-success hover:bg-success/25"
                          >
                            Aprovar
                          </button>
                        </form>
                        <form action={updateExitAuthorizationStatusAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="denied" />
                          <input type="hidden" name="studentId" value={aluno.id} />
                          <button
                            type="submit"
                            className="rounded-md bg-danger/15 px-2 py-0.5 text-xs text-danger hover:bg-danger/25"
                          >
                            Negar
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            action={createExitAuthorizationAction}
            className="flex flex-col gap-2 border-t border-border pt-3"
          >
            <input type="hidden" name="studentId" value={aluno.id} />
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Data</label>
                <input type="date" name="date" required className={fieldClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Horário</label>
                <input type="time" name="time" className={fieldClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Autorizado por</label>
                <input name="authorizedByName" placeholder="Nome do responsável" className={fieldClass} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Motivo</label>
              <input name="reason" placeholder="Ex.: consulta médica" required className={fieldClass} />
            </div>
            <SubmitButton type="submit" size="sm" variant="outline">
              Registrar autorização
            </SubmitButton>
          </form>
        </div>
      )}
    </>
  );
}
