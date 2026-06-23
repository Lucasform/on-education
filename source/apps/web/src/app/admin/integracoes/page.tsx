export const dynamic = 'force-dynamic';
export const metadata = { title: 'Integrações · Admin' };

/**
 * Diagnóstico de configuração (super-admin): mostra, em runtime, quais variáveis de ambiente
 * estão configuradas no Vercel — SEM expor os valores. Como a página roda no servidor de
 * produção, o status reflete exatamente o que está setado no projeto. Cada linha traz o que a
 * variável libera e como configurá-la.
 */

type Status = 'ok' | 'faltando';

interface EnvRow {
  envs: string[]; // nomes das variáveis (todas precisam estar setadas para ficar "ok")
  label: string;
  provider?: string; // serviço/ferramenta por trás (ex.: Supabase, Claude, Resend)
  unlocks: string;
  essencial?: boolean;
  hint?: string;
}

const GRUPOS: { titulo: string; rows: EnvRow[] }[] = [
  {
    titulo: 'Essenciais',
    rows: [
      {
        envs: ['DATABASE_URL'],
        label: 'Banco de dados',
        provider: 'Supabase',
        unlocks: 'Base de tudo no app.',
        essencial: true,
      },
      {
        envs: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
        label: 'Autenticação',
        provider: 'Supabase Auth',
        unlocks: 'Login e cadastro.',
        essencial: true,
      },
      {
        envs: ['ANTHROPIC_API_KEY'],
        label: 'WayOn',
        provider: 'Claude',
        unlocks: 'IA para conteúdo e correção.',
        essencial: true,
      },
    ],
  },
  {
    titulo: 'Recursos de IA',
    rows: [
      {
        envs: ['OPENAI_API_KEY'],
        label: 'WayOn Imagens',
        provider: 'OpenAI',
        unlocks: 'IA para geração de imagens + chave do usuário.',
      },
      {
        envs: ['YOUTUBE_API_KEY'],
        label: 'Vídeo sugerido',
        provider: 'YouTube',
        unlocks: 'Sugere vídeo nos planos de aula.',
        hint: 'Google Cloud › API YouTube Data v3 › chave de API. Cota gratuita diária.',
      },
      {
        envs: ['APP_ENCRYPTION_KEY'],
        label: 'BYOK',
        unlocks: 'Mantém a chave de IA do usuário salva para uso.',
        hint: 'Sem isso, a BYOK ainda funciona (fallback), mas a chave salva pode expirar num redeploy. Use um valor forte e ESTÁVEL.',
      },
    ],
  },
  {
    titulo: 'Comunicação',
    rows: [
      {
        envs: ['RESEND_API_KEY'],
        label: 'E-mail',
        provider: 'Resend',
        unlocks: 'E-mails do app, comunicados e relatórios.',
      },
      {
        envs: ['EVOLUTION_API_URL', 'EVOLUTION_API_KEY'],
        label: 'WhatsApp',
        provider: 'Evolution API',
        unlocks: 'Inbox e envio.',
      },
    ],
  },
];

function check(envs: string[]): Status {
  return envs.every((e) => Boolean(process.env[e] && String(process.env[e]).trim())) ? 'ok' : 'faltando';
}

export default async function IntegracoesPage() {
  const total = GRUPOS.flatMap((g) => g.rows);
  const okCount = total.filter((r) => check(r.envs) === 'ok').length;
  const faltamEssenciais = total.filter((r) => r.essencial && check(r.envs) === 'faltando');

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Status das variáveis de ambiente neste deploy. {okCount}/{total.length} configuradas.
          Os valores nunca aparecem aqui, só se estão presentes.
        </p>
      </div>

      {faltamEssenciais.length > 0 && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Atenção: {faltamEssenciais.length} variável(is) essencial(is) faltando (
          {faltamEssenciais.map((r) => r.envs.join('/')).join(', ')}).
        </div>
      )}

      {GRUPOS.map((g) => (
        <section key={g.titulo} className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">{g.titulo}</h2>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <tbody>
                {g.rows.map((r) => {
                  const st = check(r.envs);
                  return (
                    <tr key={r.label} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
                              st === 'ok' ? 'bg-success' : 'bg-warning'
                            }`}
                          />
                          <span className="font-medium">{r.label}</span>
                          {r.essencial && (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              essencial
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {r.provider ? `${r.provider} · ${r.unlocks}` : r.unlocks}
                        </p>
                        {r.hint && <p className="mt-1 text-xs text-muted-foreground/80">{r.hint}</p>}
                        <code className="mt-1.5 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {r.envs.join(' + ')}
                        </code>
                      </td>
                      <td className="w-px whitespace-nowrap px-4 py-3 text-right align-top">
                        {st === 'ok' ? (
                          <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                            ✓ configurada
                          </span>
                        ) : (
                          <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                            faltando
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="rounded-lg border border-border bg-card p-4 text-sm">
        <h2 className="mb-2 font-medium">Adicionar uma variável no Vercel</h2>
        <ol className="ml-4 list-decimal space-y-1.5 text-muted-foreground">
          <li>
            Abra as{' '}
            <a
              href="https://vercel.com/lucas-carvalho-s-projects1/on-education/settings/environment-variables"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              variáveis de ambiente do projeto
            </a>
            .
          </li>
          <li>
            Cole o nome em <strong>Key</strong> e o valor em <strong>Value</strong>.
          </li>
          <li>
            Marque <strong>Production</strong>, <strong>Preview</strong> e{' '}
            <strong>Development</strong> e salve.
          </li>
          <li>
            Em <strong>Deployments</strong>, faça <strong>Redeploy</strong> do último.
          </li>
          <li>A bolinha fica verde quando o deploy subir com a variável.</li>
        </ol>
      </section>
    </>
  );
}
