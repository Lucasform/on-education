import { getAppStats, listAllTenants } from '@on-education/module-nucleo';
import { Button } from '@on-education/ui';

import { db } from '@/server/db';

import { enterTenantAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Visão geral · Admin' };

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

const EMPTY_STATS = {
  tenants: 0,
  organizations: 0,
  individuals: 0,
  users: 0,
  students: 0,
  classes: 0,
  activities: 0,
};

/** Garante que a página renderize mesmo se o banco estiver lento (não fica girando pra sempre). */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

export default async function AdminOverviewPage() {
  const client = db();
  // Blindagem: falha OU lentidão do banco não pode deixar o painel girando. Degrada em ~7s.
  const [stats, tenants] = await Promise.all([
    withTimeout(
      getAppStats(client).catch(() => EMPTY_STATS),
      7000,
      EMPTY_STATS,
    ),
    withTimeout(
      listAllTenants(client).catch(() => []),
      7000,
      [] as Awaited<ReturnType<typeof listAllTenants>>,
    ),
  ]);
  const recentes = tenants.slice(0, 6);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Painel do produto. Entre em qualquer escola para usar o app completo dela.
          </p>
        </div>
        <a href="/admin/contas">
          <Button size="sm" variant="outline">
            Ver todas as contas
          </Button>
        </a>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Tenants" value={stats.tenants} />
        <StatCard label="Escolas" value={stats.organizations} />
        <StatCard label="Professores" value={stats.individuals} />
        <StatCard label="Usuários" value={stats.users} />
        <StatCard label="Alunos" value={stats.students} />
        <StatCard label="Turmas" value={stats.classes} />
        <StatCard label="Atividades" value={stats.activities} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Últimas contas</h2>
          <a
            href="/admin/contas"
            className="text-xs text-primary underline-offset-4 hover:underline"
          >
            ver todas
          </a>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Membros</th>
                <th className="px-4 py-2 font-medium">Alunos</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {recentes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhuma conta ainda.
                  </td>
                </tr>
              )}
              {recentes.map((t) => (
                <tr key={t.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 font-medium">
                    <a href={`/admin/contas/${t.id}`} className="hover:underline">
                      {t.name}
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                      {t.tenantType === 'organization' ? '🏫 escola' : '👤 professor'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{t.members}</td>
                  <td className="px-4 py-2 text-muted-foreground">{t.students}</td>
                  <td className="px-4 py-2 text-right">
                    <form action={enterTenantAction}>
                      <input type="hidden" name="tenantId" value={t.id} />
                      <input type="hidden" name="tenantType" value={t.tenantType} />
                      <Button type="submit" size="sm">
                        Entrar como
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
