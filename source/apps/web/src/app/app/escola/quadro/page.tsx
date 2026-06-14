import { listTeachers, listTeachingAssignments } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { cardClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Quadro de funcionários · Edu On Way' };

const ROLE_ORDER = [
  'owner',
  'director',
  'vice_director',
  'coordinator',
  'teacher',
  'monitor',
  'staff_secretary',
  'staff_finance',
] as const;

const ROLE_LABEL: Record<string, string> = {
  owner: 'Direção (responsável)',
  director: 'Diretores',
  vice_director: 'Vice-diretores',
  coordinator: 'Coordenação',
  teacher: 'Professores',
  monitor: 'Monitores',
  staff_secretary: 'Secretaria',
  staff_finance: 'Financeiro',
  guardian: 'Responsáveis',
  student: 'Alunos',
};

export default async function QuadroPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const client = db();

  const [membros, vinculos] = await Promise.all([
    listTeachers(client, ctx).catch(() => []),
    listTeachingAssignments(client, ctx).catch(() => []),
  ]);

  // Quantos vínculos turma/matéria cada membership tem (para a coluna "leciona").
  const porMembership = new Map<string, number>();
  for (const v of vinculos)
    porMembership.set(v.membershipId, (porMembership.get(v.membershipId) ?? 0) + 1);

  const ordem = (r: string) => {
    const i = (ROLE_ORDER as readonly string[]).indexOf(r);
    return i === -1 ? 99 : i;
  };
  const grupos = [...new Set(membros.map((m) => m.role))]
    .sort((a, b) => ordem(a) - ordem(b))
    .map((role) => ({ role, pessoas: membros.filter((m) => m.role === role) }));

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="Quadro de funcionários"
          description="Equipe da escola por função. Convide novos membros e defina os vínculos de quem leciona."
        />
        <Link
          href="/app/escola/convites"
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:border-primary/50 hover:bg-accent"
        >
          + Convidar membro
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{membros.length}</div>
          <div className="text-xs text-muted-foreground">Membros</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">
            {membros.filter((m) => m.role === 'teacher').length}
          </div>
          <div className="text-xs text-muted-foreground">Professores</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{vinculos.length}</div>
          <div className="text-xs text-muted-foreground">Vínculos de aula</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{grupos.length}</div>
          <div className="text-xs text-muted-foreground">Funções</div>
        </div>
      </section>

      {membros.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum membro ainda. Use Convidar membro para montar a equipe.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {grupos.map((g) => (
            <div key={g.role} className={cardClass}>
              <h2 className="mb-3 text-sm font-medium">
                {ROLE_LABEL[g.role] ?? g.role} ({g.pessoas.length})
              </h2>
              <ul className="divide-y divide-border/60 text-sm">
                {g.pessoas.map((p) => {
                  const aulas = porMembership.get(p.membershipId) ?? 0;
                  return (
                    <li key={p.membershipId}>
                      <Link
                        href={`/app/escola/quadro/${p.membershipId}`}
                        className="-mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-2 transition-colors hover:bg-accent"
                      >
                        <span>
                          <span className="font-medium">{p.fullName || p.email}</span>
                          {p.fullName && (
                            <span className="block text-xs text-muted-foreground">{p.email}</span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                          {g.role === 'teacher' &&
                            (aulas > 0 ? `${aulas} vínculo(s)` : 'sem vínculos')}
                          <span aria-hidden className="text-base leading-none">
                            ›
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
