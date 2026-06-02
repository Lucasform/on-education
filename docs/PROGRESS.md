# PROGRESS — Histórico vivo do projeto

> O Claude Code lê este arquivo no início de cada sessão para saber onde paramos, e adiciona uma nova entrada no TOPO do log ao fechar cada tarefa (checkpoint obrigatório — ver CLAUDE.md §5).
> Mais recente em cima. Não apagar entradas antigas.

## Estado atual (resumo de uma linha)

> Atualize esta linha a cada checkpoint.

**Fase atual:** 🚀 EM PRODUÇÃO · /admin trancado + IA→banco + dashboard · **Status:** EM ANDAMENTO · **Próximo passo:** Lucas setar `SUPER_ADMIN_EMAILS` em prod; depois Simulados/Quizzes, Mensagens internas, Relatórios. Prod: https://on-education-seven.vercel.app

---

## Log de checkpoints

### [2026-06-02 03:20] — Trava /admin + IA→banco + dashboard — STATUS: EM ANDAMENTO

- **Tarefa:** avançar autônomo: trancar o painel de admin, fechar o ciclo IA→banco e dar números reais no início.
- **Segmento:** 🏫👤 + super-admin
- **O que foi feito:**
  - **/admin trancado** por allowlist `SUPER_ADMIN_EMAILS` (server-only). Guard em `app/admin/layout.tsx`; `getSuperAdminEmail()` usa a sessão REAL do Supabase (ignora o cookie de impersonação) e valida o e-mail. Allowlist vazia = ninguém entra (seguro por padrão). Removido o banner "modo aberto".
  - **IA→banco:** `approveDraftToBankAction` aprova o rascunho e cria a atividade no banco pedagógico (kind activity/lesson_plan); botão "Aprovar e salvar no banco" em `/app/ia`. Fecha o human-in-the-loop.
  - **Dashboard `/app`:** cards de próximos eventos e rascunhos pendentes + lista dos próximos 5 eventos.
- **Arquivos principais:** `packages/config/src/env.ts`, `apps/web/src/server/session.ts`, `apps/web/src/app/admin/{layout.tsx,page.tsx}`, `apps/web/src/app/app/{actions.ts,ia/page.tsx,page.tsx}`, `.env.example`.
- **Migrations/RLS:** sem migration.
- **Testes:** lint/typecheck/build 14/14. Push `f22f396`.
- **Pendências / bloqueios:** **`SUPER_ADMIN_EMAILS` ainda NÃO setada em prod** → enquanto isso o `/admin` fica trancado para todos (inclusive o Lucas). Setar na Vercel com o e-mail do Lucas destrava. A tentativa automática foi barrada pelo classificador (não autorizo e-mail por adivinhação).
- **Credenciais/segredos necessários:** `SUPER_ADMIN_EMAILS` (e-mail(s) de super-admin, separados por vírgula) na Vercel.
- **Próximo passo sugerido:** Simulados/Quizzes; Mensagens internas; Relatórios/dashboards de direção.
- **Commit(s):** `feat: trava /admin (allowlist super-admin), IA->banco e dashboard com eventos` (`f22f396`).

### [2026-06-02 02:45] — Exclusão segura (soft delete + lixeira + RBAC) — STATUS: EM ANDAMENTO

- **Tarefa:** permitir apagar com segurança (poder voltar) + permissões + confirmação em ações de alto impacto.
- **Segmento:** 🏫👤 + super-admin
- **O que foi feito:**
  - RBAC (`packages/auth/rbac.ts`): dono/diretor/coordenador gerenciam tudo da escola; professor cria/edita/exclui conteúdo pedagógico da própria org; resto só leitura.
  - **Soft delete + restaurar** em turmas, alunos, atividades, comunicados, eventos (set `deletedAt`); listas filtram `deletedAt`; **/app/lixeira** restaura. Sem migration (deletedAt já existia).
  - **/admin**: excluir escola (soft, reversível) + aba "ver excluídas" + restaurar + **excluir definitivo** (`purgeTenant` apaga dados de todas as tabelas do tenant, exige digitar o nome). **NÃO apaga contas de auth** (Supabase Auth compartilhado com o app financeiro) — decisão de segurança.
  - **ConfirmButton** (client) em ações de alto impacto: excluir turma, comunicado, evento, escola, e exclusão definitiva.
- **Arquivos principais:** `packages/auth/src/rbac.ts`, `packages/modules/nucleo/src/{classes,events,admin}.ts`, `packages/modules/pedagogico/src/activities.ts`, `packages/modules/comunicacao/src/index.ts`, `apps/web/src/components/confirm-button.tsx`, `apps/web/src/app/app/lixeira/*`, `apps/web/src/app/admin/*`.
- **Migrations/RLS:** sem migration (usa `deletedAt` de auditCols).
- **Testes:** lint/typecheck/build 14/14. Push `aebbf1f`.
- **Pendências / bloqueios:** lixeira não tem "excluir definitivo" por item ainda (só restaurar; purge total é no /admin por escola); exclusão de conta de auth fica de fora por design (auth compartilhado). `/admin` ainda aberto (sem login).
- **Próximo passo sugerido:** aprovar rascunho de IA virando atividade no banco; Simulados; Dashboards; depois travar /admin.
- **Commit(s):** `feat: exclusao segura (soft delete + lixeira + confirmacao + RBAC)` (`aebbf1f`).

### [2026-06-02 02:05] — Profundidade + agenda — STATUS: EM ANDAMENTO

- **Tarefa:** import em lote (turmas/alunos), chamada, calendário/eventos, detalhe do aluno, excluir nas listas.
- **Segmento:** 🏫👤
- **O que foi feito:**
  - Import em lote (textarea, estilo Condomínio) em turmas e alunos; `createClassesBulk`/`createStudentsBulk` (respeita cota). Excluir em turmas/alunos (`deleteClass`/`deleteStudent`).
  - Chamada: `/app/sala/chamada` marca presença da turma inteira por data (`recordAttendanceBulk`, upsert).
  - Calendário: tabela `events` (RLS, migration `0006`) + `module-nucleo/events` + `/app/calendario` (agenda por data, criar/excluir).
  - Detalhe do aluno `/app/alunos/[id]`: média, frequência, notas, responsáveis, portfólio.
  - Nav: Calendário (Visão geral) e Chamada (Sala de aula).
- **Migrations/RLS:** `0006` (events) aplicada em prod + grant `authenticated`.
- **Testes:** lint/typecheck/build 14/14. Push `08e0b37`.
- **Pendências / bloqueios:** criação de atividades ainda simples (IA não joga no banco ao aprovar); Simulados/BNCC/Dashboards/Mensagens placeholder; `/admin` aberto.
- **Próximo passo sugerido:** aprovar rascunho de IA virando atividade; Simulados; Dashboards.
- **Commit(s):** `feat: import em lote, chamada, calendario e detalhe do aluno` (`08e0b37`).

### [2026-06-02 01:15] — IA (redação/tutor) + Portfólio — STATUS: EM ANDAMENTO

- **Tarefa:** avançar "em breve" sem ações manuais — correção de redação, tutor do aluno, portfólio.
- **Segmento:** 🏫👤
- **O que foi feito:** IA ganhou tipos `essay` e `tutor` (reusa `ai_drafts`, sem migration) com prompts próprios; páginas `/app/ia/redacao` e `/app/ia/tutor` (componente `IaGenerator`). Portfólio: tabela `portfolio_entries` (RLS, migration `0005`) + `module-pedagogico` (create/list) + página `/app/portfolio`. Nav: 3 itens saem de em-breve.
- **Migrations/RLS:** `0005` (portfolio_entries) aplicada em prod + grant `authenticated`.
- **Testes:** lint/typecheck/build 14/14. Deploy via push (`e5035ee`).
- **Pendências / bloqueios:** `/admin` ainda aberto; essay gated em `ai.activities` (demo usa o mesmo gate; correção fina de plano depois). Simulados, BNCC, Mensagens/WhatsApp, Gestão, Financeiro, Marketplace ainda placeholder.
- **Próximo passo sugerido:** Simulados/BNCC, ou travar /admin.
- **Commit(s):** `feat: correcao de redacao e tutor (IA) + portfolio` (`e5035ee`).

### [2026-06-02 00:45] — Fase 1A.3 / Comunicação / Comunicados com IA — STATUS: EM ANDAMENTO

- **Tarefa:** comunicados (escrever ou gerar por IA, publicar, excluir).
- **Segmento:** 🏫👤
- **O que foi feito:** tabela `communications` (RLS, migration `0004`); `@on-education/module-comunicacao` (create/list/publish/delete + `generateCommunication` via provider do module-ia, com cota + rascunho human-in-the-loop); página `/app/comunicados`; nav Comunicados vira rota real.
- **Migrations/RLS:** `0004` (communications) aplicada em prod + grant `authenticated`.
- **Testes:** lint/typecheck/build 14/14. Deploy READY (`7a208ee`), prod 200.
- **Pendências / bloqueios:** Notification Service (e-mail/push), bilhetes, portal do responsável; `/admin` ainda aberto.
- **Próximo passo sugerido:** auth de super-admin no /admin, ou Simulados/Portfólio.
- **Commit(s):** `feat: comunicados com geracao por IA` (`7a208ee`).

### [2026-06-02 00:10] — Fase 1A.2 / Sala de aula + restrutura de navegação — STATUS: EM ANDAMENTO

- **Tarefa:** sidebar com uma rota por funcionalidade + overview; sala de aula real (diário/notas/faltas/boletim); link mágico.
- **Segmento:** 🏫👤
- **O que foi feito:**
  - `/app` virou layout com **sidebar** (padrão On Condomínio): grupos + itens com ícone e rota ativa; cada funcionalidade tem sua página. `/app` = overview (cards + atalhos).
  - **Sala de aula** (`module-sala-de-aula`): `lessons`/`grades`/`attendance` (migration `0003`, RLS); páginas `/app/sala/{diario,notas,faltas,boletim}`; boletim com média + frequência.
  - Itens não construídos viram `/app/em-breve/[slug]` (navegáveis).
  - **Link mágico**: rota `/auth/confirm` (verifyOtp por token_hash, sem SMTP); links gerados via Admin API.
- **Migrations/RLS:** `0003` (lessons/grades/attendance) aplicada em prod + grant `authenticated`.
- **Testes:** lint/typecheck/build 13/13. Deploy READY (`de92ed0`), prod 200.
- **Pendências / bloqueios:** `/admin` e view-as ainda ABERTOS (sem auth) — travar antes de divulgar. Demais "em breve" (comunicados, simulados, portfólio, financeiro, etc.) seguem como placeholder.
- **Próximo passo sugerido:** auth de super-admin no `/admin`, ou avançar Comunicados/Simulados.
- **Commit(s):** `feat: sidebar com uma rota por funcionalidade e overview` (`e2d288a`), `feat: sala de aula real` (`de92ed0`).

### [2026-06-01 21:40] — UI/Admin / Tema escuro + admin view-as + escola — STATUS: CONCLUÍDO

- **Tarefa:** UI bonita (tema escuro padrão + toggle claro), admin do app com visão de todas as contas e "entrar como" (view-as), e onboarding/gestão da escola.
- **Segmento:** ambos + super-admin
- **O que foi feito:**
  - Tema: `next-themes` (escuro padrão, toggle), tokens HSL (escuro/claro), Tailwind `darkMode:class` + cores (card/muted/border/primary). Telas reestilizadas (home/login/signup/app/admin) com cards, hero, brilho.
  - `/admin` (aberto, TEMPORÁRIO): stats do app (tenants/escolas/professores/usuários/alunos/turmas/atividades) + lista de contas + **Entrar como** (view-as via cookie de impersonação). `module-nucleo/admin.ts` (`listAllTenants`, `getAppStats`).
  - View-as: `resolveContextForTenant` + `getAuthContext` lê o cookie de impersonação; banner no `/app` + "Sair do modo admin".
  - Escola: `/signup/escola` (organization) + `SchoolAdmin` no `/app` (unidades, convites, ano letivo/períodos/disciplinas, responsáveis).
- **Migrations/RLS:** sem mudança.
- **Testes:** lint/typecheck/build 12/12; prod validado (200 em /, /login, /signup, /signup/escola, /admin).
- **Pendências / bloqueios:** **/admin e view-as estão ABERTOS (sem auth)** — travar com auth de super-admin antes de divulgar. Aceite de convite via UI ainda não (só criar/listar). Magic link/SSO depois.
- **Próximo passo sugerido:** 1A.2 (sala de aula) ou auth de admin (proteger /admin).
- **Commit(s):** `feat: tema escuro + admin view-as + onboarding da escola` (`2c872ee`).

### [2026-06-01 20:55] — Deploy / Vercel produção — STATUS: CONCLUÍDO

- **Tarefa:** publicar o On Education na Vercel (GitHub + Vercel).
- **O que foi feito:** repo `Lucasform/on-education` no GitHub (branch `main`); projeto Vercel `on-education` (time `lucas-carvalho-s-projects1`) ligado ao repo, Root Directory `apps/web`, Next.js; 5 env vars setadas (prod/preview/dev); `ssoProtection` desativado (público); deploy de produção READY e validado (HTTP 200 em `/`, `/login`, `/signup`).
- **Prod:** https://on-education-seven.vercel.app (auto-deploy a cada push em `main`).
- **Credenciais/segredos necessários:** nenhuma nova; token Vercel do Lucas (revogável).
- **Próximo passo sugerido:** UI de onboarding da escola (fecha 1A.1 visível) ou 1A.2 (sala de aula).
- **Commit(s):** sem mudança de código (deploy via API/Vercel).

### [2026-06-01 20:25] — Fase 1B.1 / Auth / Supabase e-mail+senha — STATUS: CONCLUÍDO

- **Tarefa:** substituir a cookie de dev pelo Supabase Auth real (e-mail+senha).
- **Segmento:** 👤 professor (vale p/ ambos)
- **O que foi feito:**
  - `apps/web`: `@supabase/ssr` + `@supabase/supabase-js`. `server/supabase.ts` (client de sessão por cookie + client admin service_role). `server/session.ts` agora deriva AuthContext da sessão Supabase → `resolveContextForUser`. `middleware.ts` faz refresh de sessão.
  - Signup cria usuário no Supabase (service_role, `email_confirm:true` → sem SMTP) + provisiona tenant + loga. `/login`, `/logout`. `/app` redireciona p/ `/login` sem sessão.
  - `module-nucleo/context.ts`: `resolveContextForUser` (auth user → membership/tenant).
- **Arquivos principais:** `apps/web/src/server/{supabase,session}.ts`, `apps/web/src/middleware.ts`, `apps/web/src/app/{signup,login,app}/*`, `packages/modules/nucleo/src/context.ts`.
- **Migrations/RLS:** sem mudança.
- **Testes:** lint/typecheck/test/build 12/12; smoke test real: Supabase admin createUser/deleteUser ok.
- **Decisões (ADR?):** auth e-mail+senha com auto-confirm via service_role (evita SMTP); magic link/SSO depois.
- **Pendências / bloqueios:** deploy (GitHub+Vercel); magic link exigiria SMTP Resend no Supabase. Multi-tenant switch futuro.
- **Credenciais/segredos necessários:** nenhuma nova (todas no `.env.local`).
- **Próximo passo sugerido:** 1A.2 (sala de aula) ou UI de onboarding da escola; depois deploy.
- **Commit(s):** `feat: auth com email e senha via Supabase (substitui cookie de dev)` (`99604af`).

### [2026-06-01 19:55] — Infra / Supabase conectado (schema isolado) — STATUS: CONCLUÍDO

- **Tarefa:** ligar o On Education ao Supabase reusando o projeto do On Way Financial, isolado.
- **Segmento:** ambos
- **O que foi feito:**
  - `.env.local` com DATABASE_URL (Session pooler), SUPABASE_URL, SUPABASE_ANON_KEY (publishable) e DEV_SESSION_SECRET gerado.
  - **Isolamento por schema**: tudo em `on_education` (pgSchema), journal de migrations em `drizzle_oe`; `public`/`drizzle` do financeiro intocados.
  - **Fix de RLS**: predicado usa `nullif(current_setting('app.tenant_id',true),'')::uuid` (GUC vazio → zero linhas, não erro de uuid).
  - **`withTenant` roda como papel `authenticated`** (sem BYPASSRLS) para o RLS isolar de fato; `postgres` bypassaria. Migration `0002` concede `authenticated` no schema + default privileges. Provisionamento admin segue como `postgres`.
  - Migrations aplicadas (0000 schema, 0001 fix policies, 0002 grants). Dados de teste truncados.
- **Migrations/RLS:** sim — schema recriado em `on_education`; RLS validado contra o banco real.
- **Testes:** **12/12 verdes contra o Supabase real** (RLS anti-vazamento 3/3, provisionamento professor+escola, turmas/alunos/atividades, IA com cota, convites, acadêmico, responsáveis). lint/typecheck/build 12/12.
- **Decisões (ADR?):** isolamento por schema + papel authenticated no withTenant (atualizar ADR 0002 depois).
- **Pendências / bloqueios:** `SUPABASE_SERVICE_ROLE_KEY` (auth real), `ANTHROPIC_API_KEY` (IA real), GitHub+Vercel (deploy). Supabase Free pode reiniciar o instance (recovery transitório).
- **Credenciais/segredos necessários:** acima. (DATABASE_URL/anon/DEV_SESSION_SECRET já no `.env.local`.)
- **Próximo passo sugerido:** trocar a cookie de dev pelo Supabase Auth (quando vier service_role), e seguir 1A.2.
- **Commit(s):** `feat: conecta Supabase com isolamento por schema on_education` (`04cd2f0`).

### [2026-06-01 19:35] — Fase 1A.1b / Escola / Estrutura acadêmica + responsáveis — STATUS: EM ANDAMENTO

- **Tarefa:** ano letivo/período, disciplinas e vínculo N:N aluno↔responsável.
- **Segmento:** 🏫 escola
- **O que foi feito:**
  - `packages/db`: `academic_years`, `terms`, `subjects`, `guardians`, `student_guardians` (N:N com financeiro/busca/emergência) — tenant-scoped + RLS; migration `0005`. Helper `tenantPolicy` para reduzir repetição.
  - `packages/validation`: schemas de ano/período/disciplina/responsável/vínculo.
  - `module-nucleo`: `academic.ts` (createAcademicYear/listAcademicYears, createTerm/listTerms, createSubject/listSubjects) e `guardians.ts` (createGuardian/listGuardians, linkGuardian, listStudentGuardians) — RBAC + RLS.
- **Arquivos principais:** `packages/db/src/schema.ts`, `packages/db/drizzle/0005_*.sql`, `packages/validation/src/index.ts`, `packages/modules/nucleo/src/{academic,guardians}.ts`.
- **Migrations/RLS:** sim — `0005` com 5 tabelas + RLS.
- **Testes:** verde — module-nucleo agora 3 unit ✓ + 6 integração puladas; total lint/typecheck/test/build 12/12.
- **Decisões (ADR?):** —
- **Pendências / bloqueios:** UI de onboarding/secretaria; séries (grades) e vínculo professor↔disciplina↔turma (1A.2); MFA/auditoria. Integração precisa de `DATABASE_URL`.
- **Credenciais/segredos necessários:** `DATABASE_URL`, trio Supabase, `ANTHROPIC_API_KEY`.
- **Próximo passo sugerido:** UI de onboarding da escola, ou 1A.2 (diário/notas/faltas/boletim).
- **Commit(s):** `feat: escola - estrutura academica e responsaveis (1A.1b)`.

### [2026-06-01 19:10] — Fase 1A.1 / Escola / Núcleo institucional (provisionamento + convites) — STATUS: EM ANDAMENTO

- **Tarefa:** onboarding da escola (tenant `organization`), unidades e convite/aceite de membros.
- **Segmento:** 🏫 escola
- **O que foi feito:**
  - `packages/db`: tabelas `units` e `invitations` (tenant-scoped + RLS; `invitations.token` único); migration `0004`.
  - `packages/validation`: `organizationSignupSchema`, `createUnitSchema`, `inviteMemberSchema`, `acceptInvitationSchema`.
  - `module-nucleo/organization.ts`: `provisionOrganizationTenant` (owner+director, plano `school_starter`, entitlements, usage_meter, unidade "Sede"); `createUnit/listUnits`; `inviteMember` (gera token), `listInvitations`, `acceptInvitation` (admin/server-only: cria membership e marca convite aceito — mesmo padrão do provisionamento, ADR 0003).
- **Arquivos principais:** `packages/db/src/schema.ts`, `packages/db/drizzle/0004_*.sql`, `packages/validation/src/index.ts`, `packages/modules/nucleo/src/organization.ts`.
- **Migrations/RLS:** sim — `0004` com `units`/`invitations` + RLS.
- **Testes:** verde — module-nucleo 3 unit ✓ + 4 integração puladas; total lint/typecheck/test/build 12/12.
- **Decisões (ADR?):** reusa o padrão administrativo do ADR 0003 para `acceptInvitation`.
- **Pendências / bloqueios:** estrutura acadêmica (anos/períodos/séries/disciplinas/responsáveis N:N) e UI de onboarding da escola; MFA/auditoria. Integração precisa de `DATABASE_URL`.
- **Credenciais/segredos necessários:** `DATABASE_URL` (testes/rodar), trio Supabase (auth real), `ANTHROPIC_API_KEY` (IA).
- **Próximo passo sugerido:** 1A.1b — `academic_years`/`terms`/`subjects` + `guardians`/`student_guardians` (N:N); depois UI de onboarding.
- **Commit(s):** `feat: nucleo institucional da escola - provisionamento, unidades e convites (1A.1)`.

### [2026-06-01 18:45] — Fase 1B.2 / Web / UI de IA — STATUS: EM ANDAMENTO

- **Tarefa:** expor a IA no dashboard — gerar rascunho, revisar, aprovar/descartar (human-in-the-loop).
- **Segmento:** 👤 professor
- **O que foi feito:** `/app` ganhou seção de IA: form de geração (kind + prompt) visível só quando `isAiConfigured()`; senão um aviso pedindo `ANTHROPIC_API_KEY`. Lista de rascunhos com ações Aprovar/Descartar. Server actions `generateDraftAction/approveDraftAction/discardDraftAction`.
- **Arquivos principais:** `apps/web/src/app/app/{page.tsx,actions.ts}`, `apps/web/{package.json,next.config.mjs}`.
- **Migrations/RLS:** sem mudança.
- **Testes:** lint/typecheck/test/build 12/12 verdes.
- **Decisões (ADR?):** —
- **Pendências / bloqueios:** geração real precisa de `ANTHROPIC_API_KEY`; exercício em runtime precisa de `DATABASE_URL`. Com isso, o loop 1B (signup → turmas/alunos/atividades → gerar/aprovar IA) está completo na UI.
- **Credenciais/segredos necessários:** `ANTHROPIC_API_KEY`, `DATABASE_URL`, `DEV_SESSION_SECRET`, trio Supabase.
- **Próximo passo sugerido:** com credenciais — Supabase Auth + migrate + integração + geração real. Sem — Fase 1A (escola) ou 1B.3 (simulados/portfólio).
- **Commit(s):** `feat: UI de IA no dashboard (1B.2)`.

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
