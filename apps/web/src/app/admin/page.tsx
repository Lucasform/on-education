import { getAppStats, listAllTenants } from '@on-education/module-nucleo';
import { Button } from '@on-education/ui';

import { ThemeToggle } from '@/components/theme-toggle';
import { db } from '@/server/db';

import { enterTenantAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin · On Education' };

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default async function AdminPage() {
  const client = db();
  const [stats, tenants] = await Promise.all([getAppStats(client), listAllTenants(client)]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-fuchsia-500" />
          <div>
            <h1 className="text-lg font-semibold leading-none">On Education</h1>
            <p className="text-xs text-muted-foreground">Admin do app</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-500">
        Modo admin aberto (temporário, sem login). Travar com autenticação de admin antes do
        lançamento.
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
          <h2 className="text-sm font-medium">Contas ({tenants.length})</h2>
          <div className="flex gap-2">
            <a href="/signup">
              <Button size="sm" variant="outline">
                + Professor
              </Button>
            </a>
            <a href="/signup/escola">
              <Button size="sm" variant="outline">
                + Escola
              </Button>
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
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
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhuma conta ainda. Crie um professor ou uma escola acima.
                  </td>
                </tr>
              )}
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 font-medium">{t.name}</td>
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
                      <Button type="submit" size="sm">
                        Entrar
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
