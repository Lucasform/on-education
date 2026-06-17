import { z } from 'zod';

/**
 * Fonte única de configuração validada. NUNCA hardcodar segredos (CLAUDE.md, Master Spec §7.3).
 * Tudo vem de variáveis de ambiente; aqui só validamos formato e exigimos o que é obrigatório.
 *
 * Validação preguiçosa: chamamos `loadEnv()` no boot do server/worker. O client do Next
 * nunca deve importar isto (segredos são server-only).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Banco — obrigatório para qualquer operação de dados / migrations / testes de RLS.
  DATABASE_URL: z.string().url().optional(),

  // Supabase (auth/storage) — opcionais na Fase 0; exigidos quando os módulos os usarem.
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // IA — exigido a partir das fases de IA.
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  // Geração de imagem (OpenAI gpt-image-1) — opcional; sem ela, a função de imagem fica off.
  OPENAI_API_KEY: z.string().min(1).optional(),
  // Teto GLOBAL de imagens por mês na plataforma inteira (kill-switch de custo). Default 2000.
  IMAGE_MONTHLY_GLOBAL_CAP: z.coerce.number().int().positive().optional(),

  // Observabilidade — opcional.
  SENTRY_DSN: z.string().url().optional(),

  // Sessão de desenvolvimento (cookie assinada por HMAC) — stopgap até o Supabase Auth.
  // Server-only; gere um valor aleatório forte. NÃO usar em produção sem auth real.
  DEV_SESSION_SECRET: z.string().min(16).optional(),

  // E-mails autorizados a acessar o painel /admin (super-admin), separados por vírgula.
  // Vazio = /admin fica totalmente trancado (ninguém entra). Server-only.
  SUPER_ADMIN_EMAILS: z.string().optional(),

  // Stripe (cobrança da assinatura do SaaS). Opcionais: sem STRIPE_SECRET_KEY o app fica
  // em modo "ativação imediata" (sem cobrança). Os price IDs por plano/funcionalidade são
  // lidos sob demanda de STRIPE_PRICE_* (ver server/billing.ts). Server-only.
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  // URL pública do app para as páginas de sucesso/cancelamento do checkout (ex.:
  // https://on-education-seven.vercel.app). Se ausente, usa a origem da requisição.
  APP_PUBLIC_URL: z.string().url().optional(),

  // Pagamento da MENSALIDADE (família -> escola), agnóstico de PSP. Distinto do Stripe
  // (assinatura do SaaS). Sem PAYMENTS_PROVIDER + chave, o app fica como hoje (2ª via
  // read-only, baixa manual). Ver apps/web/src/server/payments.ts. Server-only.
  PAYMENTS_PROVIDER: z.enum(['asaas', 'iugu']).optional(),
  ASAAS_API_KEY: z.string().min(1).optional(),
  ASAAS_WEBHOOK_TOKEN: z.string().min(1).optional(),
  IUGU_API_KEY: z.string().min(1).optional(),
  IUGU_WEBHOOK_TOKEN: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Carrega e valida o ambiente uma única vez. Lança erro legível se algo obrigatório faltar. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  // Variável vazia ('') = não setada (ex.: CI passa `DATABASE_URL: ${{ secrets.X }}` vazio).
  // Sem isso, `z.string().url().optional()` reclamaria de "Invalid url" no '' em vez de ignorar.
  const cleaned = Object.fromEntries(
    Object.entries(source).map(([k, v]) => [k, v === '' ? undefined : v]),
  );
  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Exige uma variável que é opcional no schema mas obrigatória no contexto de uso. */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = loadEnv()[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${String(key)}. ` +
        `Adicione-a ao seu .env.local (ver .env.example).`,
    );
  }
  return value as NonNullable<Env[K]>;
}

export const isProduction = (): boolean => loadEnv().NODE_ENV === 'production';
export const isTest = (): boolean => loadEnv().NODE_ENV === 'test';
