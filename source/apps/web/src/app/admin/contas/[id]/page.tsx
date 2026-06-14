import {
  getTenantDetail,
  listTenantActivities,
  listTenantClasses,
  listTenantMembers,
} from '@on-education/module-nucleo';
import { notFound } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';

import {
  enterTenantAction,
  restoreTenantAction,
  softDeleteTenantAction,
  toggleTenantClientAction,
} from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Detalhe da conta · Admin' };

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Dono',
  director: 'Diretor',
  coordinator: 'Coordenador',
  secretary: 'Secretário',
  teacher: 'Professor',
  monitor: 'Monitor',
};

export default async function ContaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = db();
  // Blindagem: lentidão do banco não pode deixar a página girando pra sempre (degrada em ~7s).
  const t = await Promise.race([
    getTenantDetail(client, id).catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), 7000)),
  ]);
  if (!t) notFound();

  // Listas reais do tenant (drill-down). Degradam para vazio sem derrubar a página.
  const [membros, turmas, atividades] = await Promise.all([
    listTenantMembers(client, id).catch(() => []),
    listTenantClasses(client, id).catch(() => []),
    listTenantActivities(client, id).catch(() => []),
  ]);

  return (
    <>
      <a href="/admin/contas" className="text-xs text-primary underline-offset-4 hover:underline">
        ← Voltar para contas
      </a>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
              {t.tenantType === 'organization' ? '🏫 escola' : '👤 professor'}
            </span>
            {t.isClient && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600">
                ★ cliente
              </span>
            )}
            Criada em {new Date(t.createdAt).toLocaleDateString('pt-BR')}
            {t.deletedAt && <span className="text-red-500">· na lixeira</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {t.deletedAt ? (
            <form action={restoreTenantAction}>
              <input type="hidden" name="tenantId" value={t.id} />
              <SubmitButton type="submit" size="sm" variant="outline">
                Restaurar
              </SubmitButton>
            </form>
          ) : (
            <>
              <form action={toggleTenantClientAction}>
                <input type="hidden" name="tenantId" value={t.id} />
                <input type="hidden" name="isClient" value={(!t.isClient).toString()} />
                <SubmitButton type="submit" size="sm" variant="outline">
                  {t.isClient ? 'Desmarcar cliente' : 'Marcar como cliente'}
                </SubmitButton>
              </form>
              <form action={enterTenantAction}>
                <input type="hidden" name="tenantId" value={t.id} />
                <input type="hidden" name="tenantType" value={t.tenantType} />
                <SubmitButton type="submit" size="sm">
                  Entrar como
                </SubmitButton>
              </form>
              <form action={softDeleteTenantAction}>
                <input type="hidden" name="tenantId" value={t.id} />
                <ConfirmButton
                  size="sm"
                  variant="ghost"
                  message={`Excluir "${t.name}"? Vai para a lixeira e pode ser restaurada.`}
                >
                  Excluir
                </ConfirmButton>
              </form>
            </>
          )}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Membros" value={t.members} />
        <StatCard label="Alunos" value={t.students} />
        <StatCard label="Turmas" value={t.classes} />
        <StatCard label="Atividades" value={t.activities} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Equipe por papel</h2>
        <div className="rounded-lg border border-border bg-card p-4">
          {t.roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum membro ainda.</p>
          ) : (
            <ul className="flex flex-wrap gap-2 text-sm">
              {t.roles.map((r) => (
                <li
                  key={r.role}
                  className="rounded-full border border-border px-3 py-1 text-muted-foreground"
                >
                  {ROLE_LABEL[r.role] ?? r.role}: <span className="text-foreground">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Para ver e operar tudo desta escola (turmas, diário, financeiro, WayOn), use “Entrar
          como”.
        </p>
      </section>

      {/* Drill-down: usuários reais */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Usuários ({membros.length})</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">E-mail</th>
                <th className="px-4 py-2 font-medium">Papel</th>
              </tr>
            </thead>
            <tbody>
              {membros.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum usuário.
                  </td>
                </tr>
              ) : (
                membros.map((m) => (
                  <tr key={m.userId} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2 font-medium">{m.name ?? '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{m.email ?? '—'}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        {ROLE_LABEL[m.role] ?? m.role}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Drill-down: turmas reais */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Turmas ({turmas.length})</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Turma</th>
                <th className="px-4 py-2 font-medium">Série</th>
                <th className="px-4 py-2 font-medium">Alunos</th>
              </tr>
            </thead>
            <tbody>
              {turmas.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhuma turma.
                  </td>
                </tr>
              ) : (
                turmas.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2 font-medium">{c.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{c.gradeLevel ?? '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{c.students}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Drill-down: atividades reais (clicar abre o conteúdo completo) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Atividades ({atividades.length})</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Título</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Disciplina</th>
                <th className="px-4 py-2 font-medium">Criada</th>
              </tr>
            </thead>
            <tbody>
              {atividades.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhuma atividade.
                  </td>
                </tr>
              ) : (
                atividades.map((a) => (
                  <tr key={a.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2 font-medium">
                      <a
                        href={`/admin/contas/${id}/atividade/${a.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {a.title}
                      </a>
                      {!a.approved && (
                        <span className="ml-2 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] text-warning">
                          rascunho
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{a.kind}</td>
                    <td className="px-4 py-2 text-muted-foreground">{a.subject ?? '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
