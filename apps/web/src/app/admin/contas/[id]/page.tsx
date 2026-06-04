import { getTenantDetail } from '@on-education/module-nucleo';
import { notFound } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';

import { enterTenantAction, restoreTenantAction, softDeleteTenantAction } from '../../actions';

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
  const t = await getTenantDetail(db(), id).catch(() => null);
  if (!t) notFound();

  return (
    <>
      <a href="/admin/contas" className="text-xs text-primary underline-offset-4 hover:underline">
        ← Voltar para contas
      </a>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
              {t.tenantType === 'organization' ? '🏫 escola' : '👤 professor'}
            </span>
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
          Para ver e operar tudo desta escola (turmas, diário, financeiro, EduON), use “Entrar
          como”.
        </p>
      </section>
    </>
  );
}
