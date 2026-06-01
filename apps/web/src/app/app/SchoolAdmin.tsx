import type { AuthContext } from '@on-education/auth';
import { ROLES } from '@on-education/core';
import { Button } from '@on-education/ui';
import {
  listAcademicYears,
  listGuardians,
  listInvitations,
  listSubjects,
  listTerms,
  listUnits,
} from '@on-education/module-nucleo';

import { db } from '@/server/db';

import {
  createAcademicYearAction,
  createGuardianAction,
  createSubjectAction,
  createTermAction,
  createUnitAction,
  inviteMemberAction,
} from './actions';

const input = 'rounded-md border px-3 py-2 text-sm';

/** Gestão institucional (Fase 1A.1), visível só para tenants `organization`. */
export async function SchoolAdmin({ ctx }: { ctx: AuthContext }) {
  const client = db();
  const [unidades, convites, anos, periodos, disciplinas, responsaveis] = await Promise.all([
    listUnits(client, ctx),
    listInvitations(client, ctx),
    listAcademicYears(client, ctx),
    listTerms(client, ctx),
    listSubjects(client, ctx),
    listGuardians(client, ctx),
  ]);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">Gestão da escola</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Unidades */}
        <div className="rounded-md border p-4">
          <h3 className="mb-3 text-sm font-medium">Unidades ({unidades.length})</h3>
          <ul className="mb-4 space-y-1 text-sm">
            {unidades.map((u) => (
              <li key={u.id}>{u.name}</li>
            ))}
          </ul>
          <form action={createUnitAction} className="flex flex-col gap-2">
            <input name="name" required placeholder="Nome da unidade" className={input} />
            <Button type="submit" size="sm">
              Adicionar unidade
            </Button>
          </form>
        </div>

        {/* Convites */}
        <div className="rounded-md border p-4">
          <h3 className="mb-3 text-sm font-medium">Convites ({convites.length})</h3>
          <ul className="mb-4 space-y-1 text-sm">
            {convites.map((c) => (
              <li key={c.id}>
                {c.email}{' '}
                <span className="opacity-60">
                  · {c.role} · {c.status}
                </span>
              </li>
            ))}
          </ul>
          <form action={inviteMemberAction} className="flex flex-col gap-2">
            <input
              name="email"
              type="email"
              required
              placeholder="E-mail do convidado"
              className={input}
            />
            <select name="role" className={input} defaultValue="teacher">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm">
              Convidar
            </Button>
          </form>
        </div>

        {/* Ano letivo + períodos */}
        <div className="rounded-md border p-4">
          <h3 className="mb-3 text-sm font-medium">Ano letivo ({anos.length})</h3>
          <ul className="mb-3 space-y-1 text-sm">
            {anos.map((a) => (
              <li key={a.id}>{a.name}</li>
            ))}
          </ul>
          <form action={createAcademicYearAction} className="mb-4 flex flex-col gap-2">
            <input name="name" required placeholder="Ex.: 2026" className={input} />
            <Button type="submit" size="sm">
              Adicionar ano letivo
            </Button>
          </form>

          <h3 className="mb-3 text-sm font-medium">Períodos ({periodos.length})</h3>
          <ul className="mb-3 space-y-1 text-sm">
            {periodos.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
          {anos.length > 0 ? (
            <form action={createTermAction} className="flex flex-col gap-2">
              <select name="academicYearId" className={input} defaultValue={anos[0]!.id}>
                {anos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <input name="name" required placeholder="Ex.: 1º bimestre" className={input} />
              <Button type="submit" size="sm">
                Adicionar período
              </Button>
            </form>
          ) : (
            <p className="text-xs opacity-60">Crie um ano letivo para adicionar períodos.</p>
          )}
        </div>

        {/* Disciplinas */}
        <div className="rounded-md border p-4">
          <h3 className="mb-3 text-sm font-medium">Disciplinas ({disciplinas.length})</h3>
          <ul className="mb-4 space-y-1 text-sm">
            {disciplinas.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
          <form action={createSubjectAction} className="flex flex-col gap-2">
            <input name="name" required placeholder="Ex.: Matemática" className={input} />
            <Button type="submit" size="sm">
              Adicionar disciplina
            </Button>
          </form>
        </div>
      </div>

      {/* Responsáveis */}
      <div className="rounded-md border p-4">
        <h3 className="mb-3 text-sm font-medium">Responsáveis ({responsaveis.length})</h3>
        <ul className="mb-4 space-y-1 text-sm">
          {responsaveis.map((g) => (
            <li key={g.id}>
              {g.fullName}
              {g.phone && <span className="opacity-60"> · {g.phone}</span>}
            </li>
          ))}
        </ul>
        <form action={createGuardianAction} className="grid gap-2 sm:grid-cols-3">
          <input name="fullName" required placeholder="Nome do responsável" className={input} />
          <input name="email" type="email" placeholder="E-mail (opcional)" className={input} />
          <input name="phone" placeholder="Telefone (opcional)" className={input} />
          <div className="sm:col-span-3">
            <Button type="submit" size="sm">
              Adicionar responsável
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
