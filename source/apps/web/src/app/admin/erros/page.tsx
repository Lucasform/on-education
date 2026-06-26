import { errorStats, listErrors } from '@on-education/module-nucleo';

import { db } from '@/server/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Erros · Admin' };

const CONTEXT_LABEL: Record<string, string> = {
  gerar_atividade: 'Gerar atividade',
  gerar_conteudo: 'Gerar conteúdo (WayOn)',
  correcao: 'Correção',
};

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
        Falhas e lentidões registradas (ex.: geração de IA que travou ou estourou o tempo). Use para
        entender padrões e priorizar melhorias.
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
              <th className="px-4 py-2 font-medium">Escola</th>
              <th className="px-4 py-2 font-medium">Contexto</th>
              <th className="px-4 py-2 font-medium">Duração</th>
              <th className="px-4 py-2 font-medium">Mensagem</th>
            </tr>
          </thead>
          <tbody>
            {erros.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum erro registrado. 🎉
                </td>
              </tr>
            ) : (
              erros.map((e) => (
                <tr key={e.id} className="border-b border-border/60 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-2">{e.tenantName ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {CONTEXT_LABEL[e.context] ?? e.context}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                    {e.durationMs != null ? `${(e.durationMs / 1000).toFixed(1)}s` : '—'}
                  </td>
                  <td className="break-words px-4 py-2 text-muted-foreground">{e.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
