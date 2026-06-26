import { errorStats, listErrors } from '@on-education/module-nucleo';

import { db } from '@/server/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Erros · Admin' };

const CONTEXT_LABEL: Record<string, string> = {
  gerar_atividade: 'Gerar atividade',
  gerar_conteudo: 'Gerar conteúdo (WayOn)',
  correcao: 'Correção',
};

/** Classifica o erro pela mensagem e sugere como resolver. Objetivo: ler e agir rápido. */
function classify(message: string): { tipo: string; cls: string; resolver: string } {
  const m = (message || '').toLowerCase();
  if (m.includes('tempo excedido') || m.includes('timeout'))
    return {
      tipo: 'Tempo excedido',
      cls: 'bg-amber-500/15 text-amber-600',
      resolver:
        'Pedido grande ou pico de uso. Orientar a gerar menos exercícios / sem imagens. Avaliar subir o teto ou usar modelo mais rápido.',
    };
  if (m.includes('cota') || m.includes('quota') || m.includes('limit'))
    return {
      tipo: 'Cota / limite',
      cls: 'bg-violet-500/15 text-violet-600',
      resolver: 'Cota de IA do plano esgotada. Conferir o plano do tenant ou aguardar o reset mensal.',
    };
  if (m.includes('overloaded') || m.includes('rate') || m.includes('429') || m.includes('529'))
    return {
      tipo: 'IA sobrecarregada',
      cls: 'bg-orange-500/15 text-orange-600',
      resolver: 'Provedor de IA instável. Tentar de novo; se recorrente, checar status da Anthropic.',
    };
  if (m.includes('api key') || m.includes('apikey') || m.includes('config') || m.includes('env'))
    return {
      tipo: 'Configuração',
      cls: 'bg-sky-500/15 text-sky-600',
      resolver: 'Chave/variável de ambiente ausente ou inválida. Conferir em Integrações.',
    };
  return {
    tipo: 'Outro',
    cls: 'bg-muted text-muted-foreground',
    resolver: 'Ler a mensagem técnica e reproduzir o caso para entender a causa.',
  };
}

export default async function AdminErrosPage() {
  const client = db();
  const [erros, stats] = await Promise.all([
    listErrors(client, { limit: 300 }).catch(() => [] as Awaited<ReturnType<typeof listErrors>>),
    errorStats(client).catch(() => [] as Awaited<ReturnType<typeof errorStats>>),
  ]);

  return (
    <>
      <a href="/admin" className="text-xs text-primary underline-offset-4 hover:underline">
        ← Voltar para a visão geral
      </a>
      <h1 className="text-2xl font-semibold tracking-tight">Erros</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Falhas e lentidões registradas (ex.: geração de IA que travou ou estourou o tempo). Cada
        linha traz o usuário, o tipo do erro e como resolver, para você priorizar melhorias.
      </p>

      {stats.length > 0 && (
        <section className="mt-4 flex flex-wrap gap-3">
          {stats.map((s) => (
            <div key={s.context} className="rounded-lg border border-border bg-card px-4 py-3">
              <div className="text-2xl font-semibold">{s.total}</div>
              <div className="text-xs text-muted-foreground">
                {CONTEXT_LABEL[s.context] ?? s.context}
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Quando</th>
              <th className="px-4 py-2 font-medium">Usuário</th>
              <th className="px-4 py-2 font-medium">Escola</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Duração</th>
              <th className="px-4 py-2 font-medium">Como resolver</th>
            </tr>
          </thead>
          <tbody>
            {erros.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum erro registrado. 🎉
                </td>
              </tr>
            ) : (
              erros.map((e) => {
                const c = classify(e.message);
                return (
                  <tr key={e.id} className="border-b border-border/60 align-top last:border-0">
                    <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-2">{e.userName ?? e.userEmail ?? '—'}</td>
                    <td className="px-4 py-2">{e.tenantName ?? '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.cls}`}>
                        {c.tipo}
                      </span>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {CONTEXT_LABEL[e.context] ?? e.context}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                      {e.durationMs != null ? `${(e.durationMs / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="max-w-md px-4 py-2">
                      <p className="text-foreground/90">{c.resolver}</p>
                      <p className="mt-1 break-words text-[11px] text-muted-foreground">{e.message}</p>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
