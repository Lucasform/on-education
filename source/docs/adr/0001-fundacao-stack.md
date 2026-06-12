# ADR 0001 — Stack e estrutura da fundação

- **Status:** aceito
- **Data:** 2026-06-01
- **Fase:** 0 (Fundação)

## Contexto

Precisávamos da base técnica de um SaaS educacional multi-tenant que atende dois segmentos
(escola `organization` e professor autônomo `individual`) na mesma base de código, conforme
o Master Spec. A decisão de stack precisava priorizar velocidade para um time pequeno sem
abrir mão de evolução para escala.

## Decisão

- **Monorepo** pnpm workspaces + Turborepo (`apps/*`, `packages/*`), fronteiras por pacote.
- **Web:** Next.js 15 (App Router) + TypeScript `strict` + Tailwind + shadcn/ui (via `cn` +
  CVA, sem rodar o CLI interativo).
- **Banco:** PostgreSQL (Supabase) + Drizzle ORM; migrations versionadas geradas por drizzle-kit.
- **Validação:** Zod como fonte única de schemas (`packages/validation`).
- **Qualidade:** ESLint 9 (flat config) + Prettier + husky + lint-staged + commitlint
  (Conventional Commits); Vitest para testes; GitHub Actions (lint → typecheck → test → build).
- **Config/segredos:** tudo em `packages/config` validado com Zod; nada hardcoded; nomes de
  modelos de IA e flags em config (fatos voláteis fora do código).
- **Imports internos sem extensão** (`moduleResolution: Bundler`), pacotes consumidos como
  TypeScript-source via `transpilePackages` no Next.

## Consequências

- Um único deploy/codebase serve os dois segmentos; o que muda é tenant_type + plano +
  entitlements (ver ADR 0002).
- Libs fazem `tsc --noEmit` no `build` (Turbo emite aviso "no output files" — inofensivo);
  o artefato real é só do `apps/web`.
- Evolução possível sem reescrita: schema-por-tenant/DB dedicado para enterprise, filas
  (pg-boss/Inngest) no worker, app containerizável (anti-lock-in).
