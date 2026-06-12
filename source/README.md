# On Education

SaaS educacional **multi-tenant** que atende, na mesma base de código, dois segmentos:

- 🏫 **Escola** (`organization`) — produto completo B2B.
- 👤 **Professor autônomo** (`individual`) — B2C freemium em autosserviço.

A diferença entre os segmentos **não é código**: é `tenant_type` + plano + **entitlements**.

## Documentos-fonte

- [`CLAUDE.md`](./CLAUDE.md) — manual de operação (processo).
- [`docs/SAAS-EDUCACIONAL-MASTER-SPEC.md`](./docs/SAAS-EDUCACIONAL-MASTER-SPEC.md) — arquitetura e produto.
- [`docs/ROADMAP-DELIVERIES.md`](./docs/ROADMAP-DELIVERIES.md) — fases, deliveries e critérios de aceite.
- [`docs/PROGRESS.md`](./docs/PROGRESS.md) — histórico vivo (onde paramos).
- [`docs/adr/`](./docs/adr/) — decisões de arquitetura.

## Estrutura

```
apps/web        Next.js 15 (App Router, TS strict, Tailwind, shadcn/ui)
apps/worker     jobs assíncronos (esqueleto)
packages/config       env (Zod), feature flags, modelos de IA, logger sem PII
packages/core         tipos/enums de domínio (Tenant, TenantType, Role)
packages/validation   schemas Zod compartilhados
packages/db           Drizzle + Postgres, RLS por tenant_id, client withTenant
packages/auth         RBAC + contexto de tenant da sessão
packages/entitlements fonte única plano → módulos/cotas
packages/ui           design system (cn + componentes)
packages/{modules,notifications,billing}  placeholders das próximas fases
```

## Comandos

```bash
pnpm install
pnpm dev          # turbo: sobe apps em modo dev
pnpm lint
pnpm typecheck
pnpm test         # inclui o teste anti-vazamento de tenant (RLS), pulado sem DATABASE_URL
pnpm build
pnpm db:generate  # gera SQL de migration a partir do schema (não precisa de banco)
pnpm db:migrate   # aplica migrations (precisa de DATABASE_URL)
```

## Antes de rodar com banco

Copie `.env.example` para `.env.local` e preencha `DATABASE_URL` (Postgres/Supabase). Nenhum
segredo é commitado. Detalhes de tenancy/RLS: ver `docs/adr/0002-tenancy-rls.md`.
