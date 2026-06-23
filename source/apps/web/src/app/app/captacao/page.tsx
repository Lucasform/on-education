import { listLeads } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { KpiCard as Kpi } from '@/components/kpi-card';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createLeadAction, deleteLeadAction, setLeadStageAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Captação (CRM) · Edu On Way' };

const STAGES = [
  { id: 'novo', label: 'Novo' },
  { id: 'contato', label: 'Em contato' },
  { id: 'visita', label: 'Visita' },
  { id: 'matriculado', label: 'Matriculado' },
  { id: 'perdido', label: 'Perdido' },
] as const;
const SOURCE: Record<string, string> = {
  site: 'Site',
  indicacao: 'Indicação',
  redes: 'Redes sociais',
  passagem: 'Passou na porta',
  outro: 'Outro',
};

export default async function CaptacaoPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const leads = await listLeads(db(), ctx).catch(() => []);

  const total = leads.length;
  const matriculados = leads.filter((l) => l.stage === 'matriculado').length;
  const emAndamento = leads.filter((l) => !['matriculado', 'perdido'].includes(l.stage)).length;
  const conversao = total > 0 ? Math.round((matriculados / total) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Captação (CRM)"
        description="Funil de matrícula: do primeiro contato até a matrícula."
      />

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Leads" value={String(total)} />
        <Kpi label="Em andamento" value={String(emAndamento)} />
        <Kpi label="Matriculados" value={String(matriculados)} cor="text-emerald-500" />
        <Kpi label="Conversão" value={`${conversao}%`} />
      </section>

      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Novo lead</h2>
        <form action={createLeadAction} className="flex flex-wrap items-end gap-2">
          <input name="name" required placeholder="Nome do interessado" className={`${fieldClass} min-w-[10rem] flex-1`} />
          <input name="guardianName" placeholder="Responsável" className={fieldClass} />
          <input name="contact" placeholder="Telefone/e-mail" className={fieldClass} />
          <input name="interestGrade" placeholder="Série de interesse" className={`${fieldClass} w-40`} />
          <select name="source" className={fieldClass} defaultValue="outro">
            {Object.entries(SOURCE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <SubmitButton type="submit" size="sm">
            Adicionar
          </SubmitButton>
        </form>
      </section>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {STAGES.map((col) => {
          const cards = leads.filter((l) => l.stage === col.id);
          return (
            <div key={col.id} className={`${cardClass} flex flex-col gap-3`}>
              <h2 className="flex items-center justify-between text-sm font-medium">
                {col.label}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {cards.length}
                </span>
              </h2>
              {cards.length === 0 ? (
                <p className="text-xs text-muted-foreground">Vazio.</p>
              ) : (
                cards.map((l) => (
                  <div key={l.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                    <p className="font-medium">{l.name}</p>
                    {l.guardianName && (
                      <p className="text-xs text-muted-foreground">Resp.: {l.guardianName}</p>
                    )}
                    {l.contact && <p className="text-xs text-muted-foreground">{l.contact}</p>}
                    <p className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                      <span>{SOURCE[l.source] ?? l.source}</span>
                      {l.interestGrade && <span>· {l.interestGrade}</span>}
                    </p>
                    <div className="mt-2 flex items-center gap-1 border-t border-border pt-2">
                      <form action={setLeadStageAction} className="flex flex-1 items-center gap-1">
                        <input type="hidden" name="id" value={l.id} />
                        <select name="stage" defaultValue={l.stage} className={`${fieldClass} h-7 px-1 py-0 text-xs`}>
                          {STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-accent"
                        >
                          Mover
                        </button>
                      </form>
                      <form action={deleteLeadAction}>
                        <input type="hidden" name="id" value={l.id} />
                        <ConfirmButton size="sm" variant="ghost" message="Excluir este lead?">
                          ✕
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
