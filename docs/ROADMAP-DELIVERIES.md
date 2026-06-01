# SaaS Educacional — Roadmap de Deliveries

> Fonte da verdade da **ordem de entrega**. O _o quê/como/padrões_ está em `SAAS-EDUCACIONAL-MASTER-SPEC.md`; aqui está o _em que ordem e com quais critérios de aceite_. Cada delivery passa pelo fluxo do `CLAUDE.md` (planejar → executar → validar → checkpoint).
>
> **Legenda de maturidade:** `[MVP]` mínimo viável · `[V1]` primeira versão completa · `[V2]` evolução posterior.
> **Segmento:** 🏫 escola (`organization`) · 👤 professor autônomo (`individual`) · 🏫👤 ambos.
> **Status:** `[ ]` não iniciado · `[~]` em andamento · `[x]` concluído.

---

## Estratégia de sequenciamento

1. **Fase 0 — Fundação** é pré-requisito de tudo.
2. Depois há dois caminhos possíveis para o primeiro produto com valor real:
   - **Fase 1B — Professor Pro (👤)**: caminho rápido para **receita B2C** (autosserviço, freemium). Recomendado começar por aqui.
   - **Fase 1A — MVP Escola (🏫)**: caminho **B2B**, ticket maior, ciclo de venda mais longo.
3. As duas fases 1 compartilham o Núcleo (Fase 0 + parte do módulo 1). A partir da Fase 2, evoluímos por módulo conforme demanda comercial.

> A ordem das fases 2→5 não é rígida: priorizar pelo que destrava receita/retenção. Mudança de ordem que afete arquitetura → ADR.

---

## Fase 0 — Fundação 🏫👤 `[MVP]` ✅ CONCLUÍDA (2026-06-01)

Base técnica multi-tenant. Nenhuma feature de produto.

- [x] Monorepo pnpm + Turborepo (estrutura do Master Spec §13).
- [x] `apps/web` Next.js 15 (App Router) + TS strict + Tailwind + shadcn/ui (shell).
- [x] `apps/worker` esqueleto de jobs assíncronos.
- [x] `packages/db` Drizzle + Postgres (Supabase): tabelas-base com `tenant_id` + `tenant_type` e **RLS** habilitado.
- [x] `packages/auth` esqueleto RBAC + resolução de `tenant_id` da sessão.
- [x] `packages/entitlements` Plan/Entitlement (planos placeholder).
- [x] `packages/config`, `packages/core`, `packages/validation`, `packages/ui`.
- [x] Qualidade: ESLint + Prettier + husky + lint-staged + commitlint (Conventional Commits).
- [x] Scripts: `dev`, `lint`, `typecheck`, `test`, `build`, `db:generate`, `db:migrate`.
- [x] CI (GitHub Actions): lint → typecheck → test → build, bloqueando em falha.
- [x] Vitest + **teste de isolamento de tenant** (anti-vazamento via RLS, inclusive cross-segmento) — roda com `DATABASE_URL`; pulado sem ele.
- [x] `.env.example` (nomes das variáveis, sem valores) + observabilidade mínima (logger sem PII, Sentry placeholder).

**Critérios de aceite:** `pnpm install/lint/typecheck/test/build` verdes ✓; teste anti-vazamento escrito (executa quando há `DATABASE_URL`) ✓; CI bloqueando em falha ✓; nenhum segredo no código ✓.
**Decisões:** ver `docs/adr/0001-fundacao-stack.md` e `docs/adr/0002-tenancy-rls.md`.

---

## Fase 1B — Professor Pro 👤 `[MVP]` → receita B2C

Workspace pessoal do professor autônomo, freemium. Tenant `individual` com um único membro.

### 1B.1 Núcleo individual `[MVP]`

- [ ] Signup self-service instantâneo (magic link / SSO Google) → cria tenant `individual` + membership owner/teacher.
- [ ] Plano `teacher_free` aplicado por padrão; entitlements e `usage_meters` (cota de IA) ativos.
- [ ] Gestão leve de turmas/alunos próprios (sem aparato institucional).

**Aceite:** um novo professor cria conta e tem valor no primeiro uso; cota de IA medida por tenant.

### 1B.2 IA pedagógica `[MVP]`

- [ ] Gerador de plano de aula e de atividades (Sonnet), com human-in-the-loop (rascunho aprovável).
- [ ] Cota por plano (free vs pro) + medição de tokens por tenant + sinalização de conteúdo gerado por IA.
- [ ] Guardrails: isolamento por tenant, conteúdo de upload tratado como dado não confiável.

**Aceite:** professor gera plano/atividade, edita e salva; free esbarra na cota, pro amplia.

### 1B.3 Pedagógico (banco pessoal) `[MVP]`

- [ ] Banco de atividades pessoal (CRUD, tags, busca).
- [ ] Simulados/quizzes simples + portfólio leve.

### 1B.4 Marketplace `[V1]`

- [ ] Publicar/comprar conteúdo entre professores (e escolas).
- [ ] Assinatura SaaS `teacher_free → teacher_pro` (Stripe/Paddle), idempotente.

### 1B.5 Comunicação leve `[V1]`

- [ ] Boletim/relatório simples para os pais dos próprios alunos; comunicação só com seus alunos.

---

## Fase 1A — MVP Escola 🏫 `[MVP]` → B2B

### 1A.1 Núcleo institucional `[MVP]`

- [ ] Onboarding assistido: cria tenant `organization`, unidades, convida membros (RBAC completo).
- [ ] AnoLetivo/Período, séries, turmas, alunos, responsáveis (N:N), disciplinas, professores/staff.
- [ ] MFA obrigatório para perfis administrativos; auditoria nas operações sensíveis.

### 1A.2 Sala de Aula (Acadêmico) `[MVP]`

- [ ] Diário, notas, faltas, boletim, ocorrências.
- [ ] `[V1]` conselho de classe.

### 1A.3 Comunicação institucional `[MVP]`

- [ ] Notification Service (in-app + e-mail + push), bilhetes, comunicados, portal do responsável.
- [ ] `[V1]` WhatsApp Cloud API oficial (templates por categoria, janela de serviço gratuita).

---

## Fase 2 — Financeiro institucional 🏫 `[V1]`

- [ ] Mensalidades, régua de cobrança, inadimplência (Asaas/Iugu — PIX/boleto/cartão).
- [ ] NFS-e automática ao confirmar pagamento; webhooks idempotentes e assinados.
- [ ] `[V2]` bolsas/descontos, loja, split (rede). PCI: nunca armazenar cartão.

## Fase 3 — Gestão & Analytics 🏫 `[V1]`

- [ ] Dashboards de direção, multi-unidade/rede.
- [ ] Relatórios secretaria/Censo INEP, evasão, mapa de habilidades.

## Fase 4 — Operações & Inclusão 🏫 `[V1/V2]`

- [ ] Operações: portaria, saída, ponto, espaços, transporte, inventário.
- [ ] Inclusão & bem-estar: laudos/PEI, adaptação NEE, socioemocional, saúde (campos sensíveis criptografados, acesso auditado).

## Fase 5 — Plataforma de Integrações 🏫👤 `[V1/V2]`

- [ ] API aberta (OpenAPI), webhooks.
- [ ] Google Classroom / Microsoft Teams, integração contábil.
- [ ] Evolução do marketplace e portabilidade professor↔escola (cópia com consentimento, tenants isolados).

---

## Caminhos de conversão (transversais — Master Spec §3.4)

- [ ] Programa de indicação professor → escola.
- [ ] Escola absorve professor: convite + portabilidade opcional do conteúdo pessoal (cópia, não fusão).

---

_Fim do roadmap. Marcar `[x]` a cada delivery concluído no checkpoint (CLAUDE.md §5)._
