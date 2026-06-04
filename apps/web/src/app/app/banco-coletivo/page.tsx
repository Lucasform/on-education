import { SubmitButton } from '@/components/submit-button';
import { listActivities, listCollective } from '@on-education/module-pedagogico';
import { Button } from '@on-education/ui';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { copyCollectiveAction, shareCollectiveAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Banco coletivo · On Way Education' };

const FAIXAS = [
  { v: '', label: 'Todas' },
  { v: 'EI', label: 'Ed. Infantil' },
  { v: 'EF1', label: 'Fund. I' },
  { v: 'EF2', label: 'Fund. II' },
  { v: 'EM', label: 'Ensino Médio' },
  { v: 'outro', label: 'Outro' },
];
const ROTULO: Record<string, string> = {
  EI: 'Ed. Infantil',
  EF1: 'Fund. I',
  EF2: 'Fund. II',
  EM: 'Ensino Médio',
  outro: 'Outro',
};

export default async function BancoColetivoPage({
  searchParams,
}: {
  searchParams: Promise<{ faixa?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const { faixa } = await searchParams;
  const client = db();
  const [coletivas, minhas] = await Promise.all([
    listCollective(client, faixa || undefined),
    listActivities(client, ctx, {}),
  ]);

  return (
    <>
      <PageHeader
        title="Banco coletivo"
        description="Biblioteca compartilhada de atividades por faixa etária (padrão On Way). Copie para o seu banco ou contribua com as suas."
      />

      <div className="flex flex-wrap gap-2">
        {FAIXAS.map((f) => (
          <Link key={f.v} href={f.v ? `/app/banco-coletivo?faixa=${f.v}` : '/app/banco-coletivo'}>
            <Button size="sm" variant={(faixa ?? '') === f.v ? 'default' : 'outline'}>
              {f.label}
            </Button>
          </Link>
        ))}
      </div>

      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Atividades da comunidade ({coletivas.length})</h2>
        {coletivas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nada por aqui ainda. Seja o primeiro a compartilhar uma atividade abaixo.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {coletivas.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <span>
                  <span className="font-medium">{c.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {ROTULO[c.ageRange ?? 'outro'] ?? c.ageRange}
                    {c.subject ? ` · ${c.subject}` : ''}
                  </span>
                </span>
                <form action={copyCollectiveAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <SubmitButton type="submit" size="sm" variant="outline">
                    Copiar para meu banco
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Compartilhar uma atividade sua</h2>
        {minhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Crie uma atividade no seu banco para poder compartilhar aqui.
          </p>
        ) : (
          <form action={shareCollectiveAction} className="flex flex-col gap-2 sm:flex-row">
            <select name="activityId" required className={fieldClass} defaultValue="">
              <option value="" disabled>
                Escolha uma atividade
              </option>
              {minhas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
            <select name="ageRange" defaultValue="outro" className={`${fieldClass} sm:w-48`}>
              {FAIXAS.filter((f) => f.v).map((f) => (
                <option key={f.v} value={f.v}>
                  {f.label}
                </option>
              ))}
            </select>
            <SubmitButton type="submit" size="sm">
              Compartilhar
            </SubmitButton>
          </form>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Só o conteúdo da atividade é compartilhado. Nada da sua escola ou dos alunos vai junto.
        </p>
      </section>
    </>
  );
}
