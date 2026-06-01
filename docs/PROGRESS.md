# PROGRESS — Histórico vivo do projeto

> O Claude Code lê este arquivo no início de cada sessão para saber onde paramos, e adiciona uma nova entrada no TOPO do log ao fechar cada tarefa (checkpoint obrigatório — ver CLAUDE.md §5).
> Mais recente em cima. Não apagar entradas antigas.

## Estado atual (resumo de uma linha)

> Atualize esta linha a cada checkpoint.

**Fase atual:** Fase 1B · **Status:** EM ANDAMENTO · **Próximo passo:** depende de você (Supabase/`DATABASE_URL` + `ANTHROPIC_API_KEY`) para destravar auth real, integração e geração de IA. Sem credencial, próximos candidatos: UI de IA no `/app`, ou começar 1A (escola).

---

## Log de checkpoints

### [2026-06-01 18:25] — Fase 1B.2 / IA pedagógica / Cota + rascunho — STATUS: EM ANDAMENTO

- **Tarefa:** scaffolding da IA — geração com human-in-the-loop, cota por plano e medição de tokens.
- **Segmento:** 🏫👤 (gates `ai.lessonPlan`/`ai.activities`)
- **O que foi feito:**
  - `packages/db`: tabela `ai_drafts` (tenant-scoped + RLS, status draft/approved/discarded, tokens); migration `0003`.
  - `packages/validation`: `generateDraftSchema` + `aiDraftKindSchema`.
  - Novo módulo `@on-education/module-ia`: `provider.ts` (contrato `AiProvider` + `createAnthropicProvider` via fetch, modelo de config; `isAiConfigured`), `quota.ts` (`getUsedTokens`/`tokensRemaining`/`assertWithinQuota`/`recordUsage` upsert em `usage_meters`), `drafts.ts` (`generateDraft` com checagem tripla + cota + persiste rascunho + mede tokens, provider injetável; `approveDraft`/`discardDraft`/`listDrafts`).
- **Arquivos principais:** `packages/db/src/schema.ts`, `packages/db/drizzle/0003_*.sql`, `packages/validation/src/index.ts`, `packages/modules/ia/src/*`.
- **Migrations/RLS:** sim — `0003` com `ai_drafts` + RLS.
- **Testes:** verde — module-ia 3 unit ✓ (cota) + 1 integração (provider fake, roda só com `DATABASE_URL`); total lint/typecheck/test/build 12/12.
- **Decisões (ADR?):** —
- **Pendências / bloqueios:** geração real precisa de `ANTHROPIC_API_KEY`; UI de IA no `/app` não feita; integração precisa de `DATABASE_URL`. Cache de prompt e RAG (pgvector) ficam para evolução.
- **Credenciais/segredos necessários:** `ANTHROPIC_API_KEY` (geração), `DATABASE_URL` + `DEV_SESSION_SECRET` (rodar/local), trio Supabase (auth real).
- **Próximo passo sugerido:** com credenciais — Supabase Auth + integração + geração real + UI de IA. Sem credenciais — UI de geração/aprovação (inerte sem key) ou iniciar 1A (escola).
- **Commit(s):** `feat: IA pedagogica - cota, rascunho human-in-the-loop e provider Anthropic (Fase 1B.2)`.

### [2026-06-01 18:05] — Fase 1B.1 / Web / Signup + dashboard — STATUS: EM ANDAMENTO

- **Tarefa:** colocar o produto de pé no `apps/web` — signup do professor e workspace (turmas/alunos/atividades).
- **Segmento:** 👤 professor
- **O que foi feito:**
  - `apps/web/src/server`: `db.ts` (client server-only) e `session.ts` (sessão por cookie **assinada por HMAC** com `DEV_SESSION_SECRET`; tenant derivado do servidor, nunca do client). Stopgap até Supabase Auth.
  - `/signup` (form + server action `signupAction`): provisiona tenant individual e abre sessão.
  - `/app` (RSC `force-dynamic`): lista turmas/alunos/atividades e formulários (server actions) para criar cada um, via serviços dos módulos.
  - `next.config` transpila os pacotes do monorepo; home com links.
  - Ajuste: `@on-education/db` deixou de reexportar `migrate` no entry (o `new URL('../drizzle')` quebrava o webpack do Next); agora em `@on-education/db/migrate`.
- **Arquivos principais:** `apps/web/src/server/{db,session}.ts`, `apps/web/src/app/signup/*`, `apps/web/src/app/app/*`, `apps/web/next.config.mjs`, `packages/db/{src/index.ts,package.json}`.
- **Migrations/RLS:** sem mudança (reuso de `0001`/`0002`).
- **Testes:** lint/typecheck/test/build 11/11 verdes; `/app` build como dinâmica, `/signup` estática.
- **Decisões (ADR?):** sessão de dev documentada em `session.ts` (substituível por Supabase Auth sem mudar a interface).
- **Pendências / bloqueios:** auth real (Supabase) e execução com banco dependem de credenciais; UI não exercitada em runtime aqui (sem `DATABASE_URL`).
- **Credenciais/segredos necessários:** `DATABASE_URL` + `DEV_SESSION_SECRET` para rodar local; trio Supabase para auth real; `ANTHROPIC_API_KEY` para IA.
- **Próximo passo sugerido:** scaffolding de IA (1B.2): cota via `usage_meters`, rascunho human-in-the-loop, adapter Anthropic com geração plugável na key.
- **Commit(s):** `feat: web — signup e dashboard do professor (Fase 1B.1)`.

### [2026-06-01 17:35] — Fase 1B.3 / Pedagógico / Banco de atividades — STATUS: EM ANDAMENTO

- **Tarefa:** banco de atividades pessoal (CRUD, tags, busca) do professor.
- **Segmento:** 🏫👤 (gate `activities.bank`)
- **O que foi feito:** tabela `activities` (tenant-scoped + RLS, `tags text[]`, `ai_generated`; migration `0002`); schemas Zod (create/update/search); módulo `@on-education/module-pedagogico` com `createActivity/updateActivity/deleteActivity(soft)/listActivities` (busca por tag e título), checagem tripla.
- **Arquivos principais:** `packages/db/src/schema.ts`, `packages/db/drizzle/0002_*.sql`, `packages/validation/src/index.ts`, `packages/modules/pedagogico/src/*`.
- **Migrations/RLS:** sim — `0002` com `activities` + RLS.
- **Testes:** verde — pedagogico 1 unit ✓ + 1 integração pulada; total lint/typecheck/test/build 11/11.
- **Decisões (ADR?):** —
- **Pendências / bloqueios:** simulados/portfólio (1B.3 restante) não feitos; integração roda com `DATABASE_URL`.
- **Credenciais/segredos necessários:** `DATABASE_URL` (testes); `ANTHROPIC_API_KEY` (IA, 1B.2).
- **Próximo passo sugerido:** wiring web + UI; depois scaffolding de IA (cota + rascunho).
- **Commit(s):** `feat: banco de atividades pessoal (Fase 1B.3)`.

### [2026-06-01 17:05] — Fase 1B.1 / Núcleo individual / Provisionamento + turmas — STATUS: EM ANDAMENTO

- **Tarefa:** núcleo do professor autônomo — provisionamento do tenant `individual` e gestão leve de turmas/alunos.
- **Segmento:** 👤 professor
- **O que foi feito:**
  - `packages/db`: novas tabelas `classes` e `students` (tenant-scoped + RLS); migration `0001_sparkling_jetstream.sql`.
  - `packages/validation`: schemas `individualSignupSchema`, `createClassSchema`, `createStudentSchema`.
  - Novo módulo `packages/modules/nucleo` (`@on-education/module-nucleo`):
    - `provisionIndividualTenant` (admin/server-only): cria tenant + membership owner/teacher + subscription `teacher_free` + entitlements semeados + `usage_meter` de `ai_tokens`.
    - `entitlement.ts`: `getTenantPlanId` + `assertEntitled` (perna comercial da checagem tripla).
    - `classes.ts`: `createClass/listClasses/createStudent/listStudents` com RBAC + entitlement + RLS; cota de alunos por plano.
  - Workspace passou a incluir `packages/modules/*`.
- **Arquivos principais:** `packages/db/src/schema.ts`, `packages/db/drizzle/0001_*.sql`, `packages/validation/src/index.ts`, `packages/modules/nucleo/src/*`.
- **Migrations/RLS:** sim — `0001` com `classes`/`students` + `ENABLE RLS` + `CREATE POLICY`.
- **Testes:** verde — `module-nucleo` 2 unit ✓ (plano default) + 2 integração escritos e PULADOS sem `DATABASE_URL`; demais suites ok. lint 10/10, typecheck 10/10, build 10/10.
- **Decisões (ADR?):** `docs/adr/0003-provisionamento-tenant-individual.md`.
- **Pendências / bloqueios:** sem `DATABASE_URL`/Supabase não dá pra (a) rodar os testes de integração, (b) wirar auth real ao signup, (c) construir a UI do fluxo. Provisionamento e serviços estão prontos para plugar.
- **Credenciais/segredos necessários:** `DATABASE_URL` (ou trio Supabase) para destravar; depois `ANTHROPIC_API_KEY` (1B.2 IA).
- **Próximo passo sugerido:** criar projeto Supabase, setar `DATABASE_URL`, aplicar migrations (`pnpm db:migrate`), rodar os testes de integração; em seguida wiring de Supabase Auth no signup + UI de signup/dashboard. Depois 1B.2 (IA pedagógica).
- **Commit(s):** `feat: nucleo individual — provisionamento de tenant e gestao de turmas/alunos (Fase 1B.1)`.

### [2026-06-01 16:10] — Fase 0 / Fundação / Bootstrap do monorepo — STATUS: CONCLUÍDO

- **Tarefa:** montar a fundação multi-tenant (sem feature de produto) conforme PROMPT-INICIAL §A e Master Spec §13.
- **Segmento:** ambos
- **O que foi feito:**
  - Organização do repo: `git init`, docs movidos para `docs/`, `docs/adr/` criada.
  - `docs/ROADMAP-DELIVERIES.md` **corrigido** (era cópia do Master Spec) → roadmap real (Fases 0, 1B, 1A, 2–5).
  - Monorepo pnpm + Turborepo; `apps/web` (Next 15 + TS strict + Tailwind + shadcn-style), `apps/worker` (esqueleto).
  - `packages/`: config (env Zod + flags + modelos IA + logger sem PII), core (Tenant/TenantType/Role), validation (Zod), db (Drizzle + 8 tabelas + RLS + `withTenant`), auth (RBAC + contexto de tenant), entitlements (planos + `canUse`), ui (cn + Button).
  - Qualidade: ESLint 9 flat + Prettier + husky (pre-commit/commit-msg) + lint-staged + commitlint; CI GitHub Actions (lint→typecheck→test→build).
  - Migration inicial gerada (`packages/db/drizzle/0000_*.sql`) com `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` em todas as tabelas tenant-scoped.
- **Arquivos principais:** `package.json`, `turbo.json`, `tsconfig.base.json`, `eslint.config.mjs`, `apps/web/*`, `packages/*/src/*`, `.github/workflows/ci.yml`, `docs/adr/0001-*.md`, `docs/adr/0002-*.md`.
- **Migrations/RLS:** sim — `0000_petite_kronos.sql` (RLS por `tenant_id = current_setting('app.tenant_id', true)::uuid`).
- **Testes:** `pnpm test` verde — entitlements 4✓; teste anti-vazamento de tenant (db) escrito e PULADO por falta de `DATABASE_URL`. lint 9/9, typecheck 9/9, build 9/9 (Next compilou).
- **Decisões (ADR?):** `docs/adr/0001-fundacao-stack.md`, `docs/adr/0002-tenancy-rls.md`.
- **Pendências / bloqueios:**
  - Rodar o teste de RLS de verdade exige um Postgres (`DATABASE_URL`); sem ele o suite é pulado.
  - `apps/worker` e `packages/{modules,notifications,billing}` são placeholders.
  - Auth/RBAC e resolução de tenant são esqueletos (implementação real no Núcleo).
- **Credenciais/segredos necessários:** `DATABASE_URL` (ou `SUPABASE_URL`+`SUPABASE_ANON_KEY`+`SUPABASE_SERVICE_ROLE_KEY`); `ANTHROPIC_API_KEY` (fases de IA); `SENTRY_DSN` (opcional). Nenhum valor no repo.
- **Próximo passo sugerido:** **Fase 1B — Professor Pro (1B.1 Núcleo individual)** para caminho rápido de receita B2C; alternativa: Fase 1A.1 (Núcleo institucional).
- **Commit(s):** `chore: bootstrap do monorepo multi-tenant (Fase 0)`.

### [AAAA-MM-DD HH:MM] — Fase 0 / Núcleo / Bootstrap — STATUS: EM ANDAMENTO

- **Tarefa:** projeto iniciado; documentos-fonte adicionados.
- **Segmento:** ambos
- **O que foi feito:** specs e CLAUDE.md no repositório; PROGRESS.md criado.
- **Arquivos principais:** CLAUDE.md, docs/SAAS-EDUCACIONAL-MASTER-SPEC.md, docs/ROADMAP-DELIVERIES.md, docs/PROGRESS.md
- **Migrations/RLS:** não
- **Testes:** —
- **Decisões (ADR?):** —
- **Pendências / bloqueios:** executar a Fase 0 (fundação do monorepo).
- **Credenciais/segredos necessários:** a definir no bootstrap (provável: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY).
- **Próximo passo sugerido:** rodar o "Prompt de BOOTSTRAP".
- **Commit(s):** docs: adiciona specs, CLAUDE.md e PROGRESS inicial
