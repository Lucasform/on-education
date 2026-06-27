# Arquitetura — Edu On Way (On Education)

SaaS educacional multi-tenant. Next.js 15 (App Router) + Drizzle + Supabase (Postgres + RLS),
monorepo pnpm + Turborepo. Este doc é o mapa de alto nível para quem chega no código.

## Visão geral

Uma escola ou um professor autônomo é um **tenant**. Todo dado é isolado por tenant via Row Level
Security no Postgres. O app entrega gestão escolar (turmas, alunos, notas, frequência, financeiro),
comunicação com as famílias e um conjunto de geradores de conteúdo com IA (o agente "WayOn").

## Estrutura do monorepo

```
apps/
  web/                 Next.js (App Router): páginas, server actions, rotas de API, componentes
packages/
  db/                  Schema Drizzle + cliente (withTenant / db) + testes de RLS
  auth/                AuthContext (userId, tenantId, tenantType, roles) + RBAC (assertCan)
  entitlements/        Planos e limites por plano (canUse, limitFor)
  validation/          Schemas Zod compartilhados (entrada de actions/rotas)
  config/              loadEnv, logger
  core/                Tipos base (TenantType, ...), logger
  notifications/       Notificações
  ui/                  Componentes base compartilhados
  modules/
    nucleo/            Domínio central: tenants, alunos, turmas, financeiro, suporte, portais...
    ia/                Provider de IA (BYOK + default), drafts, cota
    pedagogico/        Banco de atividades, ratings, gamificação
    sala-de-aula/      Chamada, notas, diário
    comunicacao/       Comunicados, portal do responsável, WhatsApp
```

## Camadas (fluxo de uma requisição)

```
Página / Server Action (apps/web)
  -> função de módulo (packages/modules/*)
       -> cliente de banco (packages/db) com RLS por tenant
            -> Postgres (Supabase)
```

Regra: a UI não fala com o banco direto. Ela chama uma função de módulo, que aplica RBAC
(`assertCan`) e roda dentro do escopo do tenant.

## Multi-tenancy e RLS (o ponto mais importante)

O cliente de banco expõe dois caminhos:

- `client.withTenant(tenantId, (tx) => ...)` — abre a transação com `app.tenant_id` setado. As
  policies de RLS (`tenantPolicy`) filtram tudo por `tenant_id = current_setting('app.tenant_id')`.
  Use isto para QUALQUER operação em nome de um usuário logado.
- `client.db` — conexão dona (bypassa RLS). Use só para operações de sistema/cross-tenant
  (admin do produto, cron, acesso público por token), e SEMPRE filtrando `tenant_id` na query.

Toda tabela com dado de tenant tem `...auditCols` (createdAt/updatedAt/createdBy/deletedAt),
índice por `tenant_id` e uma `tenantPolicy('<tabela>_tenant_isolation')`. O teste
`packages/db/src/__tests__/tenant-isolation.test.ts` prova que um tenant não enxerga o outro.

## Auth e provisionamento

Supabase Auth (link mágico, sem senha por padrão). O usuário nasce só no Auth; o **tenant é
provisionado no 1º acesso** em `apps/web/src/app/auth/confirm/route.ts` (`ensureTenant`), que também
dispara o e-mail de boas-vindas (best-effort, nunca bloqueia o login). Papéis ficam em
`AuthContext.roles`; `isGestao` e `canSeeFinanceValues` (em `nucleo/work-requests.ts`) decidem
acesso de gestão e field-level security do financeiro.

## IA (WayOn)

`resolveTenantProvider(client, ctx, tier)` (`modules/ia`) resolve o provider a partir da config do
tenant: usa a chave do próprio cliente (BYOK: Anthropic/OpenAI/Gemini) ou o default da plataforma.
Tiers: `haiku` (barato, chat/tutor) e `sonnet` (geração). O **custo roda sempre na conta do
tenant**. A "casa de geração" alinhada à BNCC fica em `nucleo/content-skill.ts` + `nucleo/bncc.ts`
(regra de ouro: citar código de habilidade real OU marcar "(a confirmar)", nunca inventar).

## Billing (modo lançamento)

`apps/web/src/server/billing.ts`. A cobrança só liga com `BILLING_LIVE=1` no ambiente E o Stripe
configurado (`STRIPE_SECRET_KEY`, os 4 `STRIPE_PRICE_PLAN_*`, `STRIPE_WEBHOOK_SECRET`). Sem isso o
app fica em "ativação imediata": todo plano é liberado de graça, sem checkout. Um único interruptor
para ligar quando a hora chegar.

## Convenções

- TypeScript strict. ESLint (sem variável não usada, sem unicode invisível). Sem travessão no meio
  de frase em textos pt-BR.
- Páginas de dados são `export const dynamic = 'force-dynamic'` (conteúdo por tenant/usuário).
- Testes: Vitest (`pnpm test` via Turbo). Testes de banco usam `describe.skipIf(!DATABASE_URL)`.
- CI: `.github/workflows/ci.yml` roda install -> lint -> typecheck -> test -> build em push e PR.
- Migrations: gerar/aplicar via Drizzle; em hotfix usa-se um script ESM descartável idempotente
  (`packages/db/_t.mjs`, removido após rodar).
- Deploy: Vercel (região gru1), automático no push para `main`.

## Pontos de atenção (dívida conhecida)

- `apps/web/src/app/app/actions.ts` está grande (~2.8k linhas, importado por ~90 arquivos). Vale
  fatiar por domínio com barrel re-export, mas é refactor de risco: fazer em passe dedicado, com
  build verde a cada etapa.
- Sem cache de página (multi-tenant dinâmico); ganho de performance vem de índice/consulta e do
  pooler do Supabase (`max:1`), não de cachear telas.
- Observabilidade: há logger próprio e painel `admin/erros`; falta APM/monitoramento externo
  (Sentry) e tracing.
- Segurança: RLS + RBAC + FLS no lugar; pendente avaliar `FORCE ROW LEVEL SECURITY` (precisa de
  janela testada, pois afeta a conexão dona).
