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

### 1B.1 Núcleo individual `[MVP]` ✅ CONCLUÍDA (2026-06-01)

- [x] Signup self-service → `/signup` (e-mail+senha via **Supabase Auth**, usuário auto-confirmado) provisiona o tenant `individual` e abre sessão. `/login` e `/logout` ok.
- [x] Plano `teacher_free` aplicado por padrão; entitlements e `usage_meters` (cota de IA) ativos.
- [x] Gestão leve de turmas/alunos próprios — serviços + **UI no dashboard** (`/app`): cria/lista turmas e alunos, com checagem tripla + cota.

**Aceite:** ✅ professor cria conta (auth real), cai no workspace e gerencia turmas/alunos; cota de IA medida por tenant. Validado contra o Supabase real.
**Decisão:** ver `docs/adr/0003-provisionamento-tenant-individual.md`.
**Evolução futura:** magic link / SSO Google (precisam SMTP/OAuth); troca de tenant (multi-membership).

### 1B.2 IA pedagógica `[MVP]` 🚧 EM ANDAMENTO

- [x] Gerador de plano de aula e de atividades (Sonnet), human-in-the-loop — `module-ia` + UI `/app/ia` (gerar/aprovar/descartar). `ANTHROPIC_API_KEY` ligado em prod.
- [x] Cota por plano + medição de tokens por tenant — `usage_meters`, `assertWithinQuota`/`recordUsage`.
- [x] IA extra: **correção de redação** (`/app/ia/redacao`) e **tutor do aluno** (`/app/ia/tutor`).
- [x] IA→banco: aprovar rascunho de atividade/plano de aula materializa a atividade no banco pedagógico (human-in-the-loop completo).
- [~] Guardrails: isolamento por tenant (RLS + checagem tripla) ok; upload/RAG depois.

**Aceite:** ✅ professor gera/corrige/pergunta com IA; cota medida por tenant.

### 1B.3 Pedagógico (banco pessoal) `[MVP]` 🚧 EM ANDAMENTO

- [x] Banco de atividades pessoal (CRUD, tags, busca) — `@on-education/module-pedagogico`.
- [x] Portfólio (`/app/portfolio`, tabela `portfolio_entries`, migration `0005`).
- [x] Simulados/quizzes — múltipla escolha com correção automática, tentativas e nota por aluno. `module-pedagogico` (`quizzes.ts`), tabelas `quizzes`/`quiz_questions`/`quiz_attempts` (migration `0007`, RLS), páginas `/app/simulados` e `/app/simulados/[id]`. **Geração pelo EduON (IA)**: o agente cria as questões (`generateQuizWithEduON`, cota + parse JSON) e o professor revisa.

### 1B.4 Marketplace `[V1]`

- [ ] Publicar/comprar conteúdo entre professores (e escolas).
- [ ] Assinatura SaaS `teacher_free → teacher_pro` (Stripe/Paddle), idempotente.

### 1B.5 Comunicação leve `[V1]`

- [ ] Boletim/relatório simples para os pais dos próprios alunos; comunicação só com seus alunos.

---

## Fase 1A — MVP Escola 🏫 `[MVP]` → B2B

### 1A.1 Núcleo institucional `[MVP]` 🚧 EM ANDAMENTO

- [~] Onboarding assistido: cria tenant `organization`, unidades, convida membros (RBAC completo). — `provisionOrganizationTenant` (owner+director, plano `school_starter`, unidade Sede), `createUnit/listUnits`, `inviteMember/acceptInvitation/listInvitations`. **Checklist de primeiros passos no início** (progresso, marca o que foi preenchido, sem travar).
- [x] Personalização da escola — `/app/escola/personalizacao`: logo (URL), cor do tema (presets, aplicada como `--primary` em todo o app), regimento e modelos de documento. Tabela `tenant_settings` (migration `0009`, RLS). Escrita restrita à gestão.
- [~] AnoLetivo/Período, disciplinas, responsáveis (N:N) — `academic_years`/`terms`/`subjects`, `guardians` + `student_guardians` (financeiro/busca/emergência) com serviços. Turmas/alunos reusam `classes`/`students`. Falta UI; séries (grades) e vínculo professor↔disciplina↔turma em 1A.2.
- [ ] MFA obrigatório para perfis administrativos; auditoria nas operações sensíveis.

### 1A.2 Sala de Aula (Acadêmico) `[MVP]` 🚧 EM ANDAMENTO

- [x] Diário (lessons), notas (grades), faltas (attendance) e boletim (média + frequência) — `@on-education/module-sala-de-aula`, RLS, páginas `/app/sala/*`. Migration `0003` (lessons/grades/attendance).
- [x] Chamada por turma (lista de presença marcando todos os alunos de uma vez) e detalhe do aluno (`/app/alunos/[id]`).
- [ ] Ocorrências; `[V1]` conselho de classe.

### 1A.3 Comunicação institucional `[MVP]` 🚧 EM ANDAMENTO

- [~] Comunicados (criar, gerar por IA, publicar, excluir) — `@on-education/module-comunicacao`, tabela `communications` (migration `0004`), página `/app/comunicados`. Falta Notification Service (e-mail/push), bilhetes, portal do responsável.
- [x] Mensagens internas para responsáveis (registro por responsável/aluno) — tabela `messages` (migration `0008`, RLS), `module-comunicacao/messages`, página `/app/mensagens`. Falta envio (e-mail/WhatsApp) e resposta do responsável (portal).
- [ ] `[V1]` WhatsApp Cloud API oficial (templates por categoria, janela de serviço gratuita).

---

## Fase 2 — Financeiro institucional 🏫 `[V1]`

- [ ] Mensalidades, régua de cobrança, inadimplência (Asaas/Iugu — PIX/boleto/cartão).
- [ ] **Histórico de pagamento por responsável** (extrato: pago/aberto/vencido, por aluno) — ver item 5.1.1.
- [ ] NFS-e automática ao confirmar pagamento; webhooks idempotentes e assinados.
- [ ] `[V2]` bolsas/descontos, loja, split (rede). PCI: nunca armazenar cartão.

## Fase 3 — Gestão & Analytics 🏫 `[V1]`

- [x] Relatórios de direção (MVP): `/app/relatorios` com KPIs da escola (turmas, alunos, média geral, frequência, atividades, simulados) e desempenho por turma. Falta multi-unidade/rede e dashboards avançados.
- [ ] Dashboards de direção avançados, multi-unidade/rede.
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

---

## Transversal — Plataforma (serve aos dois segmentos) 🏫👤

Entregas que cruzam módulos e não pertencem a uma única fase.

### T.1 Produtividade do dia a dia `[MVP]` ✅

- [x] Importação em lote de turmas, alunos, disciplinas e responsáveis (uma por linha; alunos/responsáveis aceitam campos extras com `;`) — `/app/turmas`, `/app/alunos`, `/app/escola/disciplinas`, `/app/escola/responsaveis`.
- [x] Calendário/agenda de eventos — tabela `events`, `@on-education/module-nucleo` (`events.ts`), página `/app/calendario` + próximos eventos no overview.
- [x] Dashboard de início (`/app`) com números reais: turmas, alunos, atividades, próximos eventos, rascunhos de IA pendentes + lista dos próximos eventos.

### T.2 Exclusão segura e permissões `[MVP]` ✅

- [x] Soft delete + restaurar em turmas, alunos, atividades, comunicados e eventos; página `/app/lixeira`.
- [x] RBAC: dono/diretor/coordenador gerenciam tudo da escola; professor exclui conteúdo pedagógico da própria org; resto só leitura (`packages/auth/src/rbac.ts`).
- [x] Confirmação em ações de alto impacto (excluir turma, comunicado, evento, escola, exclusão definitiva).

### T.3 Super-admin (operação do app) `[MVP]` 🚧 EM ANDAMENTO

- [x] Painel `/admin`: estatísticas, listar contas, "entrar como" (view-as por cookie de impersonação).
- [x] Excluir escola (soft, reversível), lixeira de contas, restaurar e excluir definitivo (purga dados do tenant, exige digitar o nome). NÃO apaga contas de auth (Supabase Auth compartilhado com o app financeiro).
- [x] `/admin` trancado por allowlist `SUPER_ADMIN_EMAILS` (login Supabase + e-mail na lista; vazio = trancado para todos). Env setada em prod com o e-mail do Lucas (autorizado 2026-06-02).

---

---

## Escola — visão detalhada (backlog priorizado, 2026-06-03)

Desenho completo do produto Escola pedido pelo Lucas. Status: `[x]` feito · `[~]` parcial · `[ ]` a fazer.

### Pessoas e estrutura

- [~] **1. Quadro e cadastro de funcionários** (diretor, coordenador, secretário, monitor, professor). Hoje: convites + papéis (`/app/escola/convites`, roleEnum). Falta: tela de quadro, papel `monitor`, perfis de visualização por papel, vínculo funcionário↔turma.
- [x] **2. Documentos: regimento + modelos gerais** (`/app/escola/personalizacao`). Evoluir: anexos de arquivo (Storage).
- [~] **3. Turmas, séries, idades.** Turmas existem (nome/descrição). Falta: campos série/ano e faixa etária na turma.
  - [ ] **3.1** Cadastro de material didático + vínculo com a turma.
  - [~] **3.2** Matérias da turma. Disciplinas existem; falta vínculo turma↔matéria.
  - [ ] **3.3** Anexo de materiais didáticos por turma e por matéria (Storage).
- [~] **4. Responsáveis + vínculo com aluno.** `guardians` + `student_guardians` existem; falta UI de vínculo.
  - [ ] **4.1 / 10. Ocorrências dos alunos** (1 ou múltiplos alunos). **← em construção agora.**
- [~] **5. Alunos + vínculo responsável/turma.** Aluno↔turma ok; falta UI de vínculo com responsável.
  - [ ] **5.1** Acompanhamento financeiro do responsável (vínculo aluno↔responsável↔financeiro). Fase 2.
    - [ ] **5.1.1 Histórico de pagamento do responsável** (mensalidades pagas/em aberto/vencidas por responsável, com vínculo ao(s) aluno(s); extrato e status). Base da régua de cobrança da Fase 2.

### Acadêmico e rotina

- [x] **6. Calendário escolar** (`/app/calendario`).
- [ ] **7. Cronograma das turmas** (horários semanais, com alterações).
  - [ ] **7.1** Plano de aulas por turma/matéria, vínculo com diário e com o cronograma.
  - [~] **7.2** Diário de classe vinculado ao planejamento (diário existe; falta o vínculo).
  - [ ] **7.3** Planejamento de avaliações e trabalhos.
- [~] **8. Chamada vinculada aos alunos + relatórios** (chamada ok; relatórios parciais em `/app/relatorios`).
  - [ ] **8.1 Faltas por matéria** (a chamada/falta deve contar por disciplina, não só por dia).
  - [ ] **8.2 Geração de documento de faltas** (da turma e individual; por turma, por matéria), com geração fácil (PDF/impressão).
- [~] **9. Notas: participação, formais e anotações por aluno** (notas formais ok; falta participação + anotações).
- [ ] **9.1 Relatórios com geração de doc fácil** (faltas, atividades, notas, ocorrências) — exportar/imprimir em PDF.
- [ ] **17. Vínculos do professor** (membership ↔ matéria ↔ turma): cada professor leciona matérias específicas em turmas específicas. Base para diário/notas/faltas por professor.
- [ ] **18. Formato simplificado do professor autônomo (👤):** o individual NÃO usa tudo da escola. Definir um subconjunto enxuto (turmas/alunos, EduON, banco, simulados, agenda) e esconder gestão institucional. Aprimorar caso a caso.

### EduON (IA) ancorado no material da escola

- [~] **11. Atividades por IA com base no material didático.** EduON gera por tema; falta ancorar no material anexado (RAG).
  - [x] **11.1** Criação de atividade por descrição/solicitação do professor (`/app/atividades`).
  - [ ] **11.2** Provas com base no material anexado.
  - [ ] **11.3** Trabalhos com base no material ou sugestão.
  - [ ] **11.4** Roteiros de estudo com base no material e na prova criada.
  - [ ] **11.5** Padronização das atividades pelo padrão da escola (provas/lição de casa/bilhetes/roteiros por turma).

### Comunicação e acervo

- [ ] **12. Mural informativo para os pais.**
- [ ] **13. Banco de atividades coletivas** (padrão On Way, sem vínculo com a escola, por faixa etária).

### Secretaria (escola)

- [ ] **19. Módulo Secretaria:**
  - [ ] **19.1** Envio de informativos. **Por e-mail para todos os responsáveis** (em massa) e **informativos internos** (mural/app). Depende de SMTP/serviço de e-mail (Resend).
  - [ ] **19.2** Solicitações (pais/responsáveis pedem documentos; secretaria atende e marca status).
  - [ ] **19.3** Gestão de documentações necessárias por aluno (checklist do que falta entregar).
  - [ ] **19.4** Histórico escolar (registro acadêmico do aluno; geração de documento padronizado).
  - [ ] **19.5** Anexos e **criação de arquivo padronizado** (declarações, históricos, autorizações) a partir de modelos da escola → exportar PDF.

### Visão geral

- [~] **14. Painel geral de acompanhamento** (visão consolidada da escola: turmas, alunos, frequência, notas, ocorrências, pendências). Hoje: `/app` (início) + `/app/relatorios`. Evoluir para um painel único e rico.
- [ ] **15. Divisão e formato de visualização** (filtros por turma/série/período; alternar entre cartões, tabela e gráficos).

### Plataforma

- [~] **16. App mobile** com os assuntos centralizados e o melhor UI possível. Hoje: web responsivo (sidebar vira drawer no mobile). Evoluir: navegação inferior por seções e/ou app nativo (PWA como primeiro passo).

### Pendências transversais já mapeadas

- [ ] Importação por planilha (CSV/Excel: baixar modelo → preencher → importar) para alunos/turmas/responsáveis.
- [ ] Visualização por semana/mês/período no diário e na chamada.
- [ ] Planejamento BNCC (banco de habilidades por disciplina/ano).

---

_Fim do roadmap. Marcar `[x]` a cada delivery concluído no checkpoint (CLAUDE.md §5)._
