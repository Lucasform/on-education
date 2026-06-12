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
- [x] **Correção de redação por FOTO (visão):** professor fotografa a folha → `transcribeEssay` (provider multimodal) transcreve fiel; o ilegível **não é inventado**, vira marcador 〖?N〗 + lista com linha/contexto para o professor preencher; aceita objetivo + comentários; depois corrige reusando `generateDraft`. Rota `/api/ia/redacao/transcrever` + `redacao-foto.tsx` (câmera + downscale client).
- [x] IA→banco: aprovar rascunho de atividade/plano de aula materializa a atividade no banco pedagógico (human-in-the-loop completo).
- [x] **RAG-lite (Fatia 3):** WayOn gera atividade baseada nos materiais da turma — texto extraído no upload (`unpdf`/txt, `materials.extracted_text`, migration `0027`) entra como contexto no prompt; select de turma em `/app/atividades`. Sem embeddings/credencial nova.
- [x] **Flashcards** pelo WayOn (frente/verso) — `flashcard_decks` (mig. `0032`), `/app/ia/flashcards` + estudo com flip; segue o "Meu padrão".
- [x] **Geração de IMAGEM (OpenAI gpt-image-1)** — `/app/ia/imagem`; entitlement `ai.images` + cota `imagesPerMonth` por plano + teto global `IMAGE_MONTHLY_GLOBAL_CAP`; histórico `generated_images` (mig. `0033`). Texto segue no Claude. Falta: pôr envs no Vercel; imagem dentro de flashcards/atividades (futuro).
- [x] **Meu padrão com modelos por tipo** (prova/atividade/outro) — `ai_standard_samples` (mig. `0029`/`0031`); upload extrai texto e entra rotulado nas gerações.
- [x] **Trabalho** gerado com modo individual/grupo (+ nº alunos) e materiais sugeridos.
- [~] Guardrails: isolamento por tenant (RLS + checagem tripla) ok; material entra como dado de referência, não instrução. Embeddings/pgvector p/ acervo grande = futuro.
- [ ] **Próximas melhorias de visão (backlog):** ler por foto também em (a) lançar respostas de prova/gabarito, (b) tutor lendo o enunciado do exercício; persistir a transcrição junto do draft; suporte a HEIC.

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

### 2.F — Cobrança ponta a ponta (FASE FINAL do projeto)

> Bloco a ser feito **bem no final**, depois que escola/acadêmico estiverem maduros. Exige credenciais de PSP e prefeitura. Tudo idempotente; webhooks assinados; nunca armazenar cartão.

- [ ] **Emissão de boletos via API** (PSP: Asaas/Iugu) — gerar boleto/PIX por mensalidade, com linha digitável/QR.
- [ ] **Emissão de notas (NFS-e)** integrada à prefeitura/PSP.
- [ ] **Confirmação de pagamento** automática via webhook do PSP (baixa no extrato do responsável, item 5.1.1).
- [ ] **Envio automático do comprovante e da nota** ao responsável (e-mail/WhatsApp) ao confirmar o pagamento.
- [ ] Conciliação e relatórios financeiros; régua de inadimplência automática.
- **Credenciais necessárias (no momento):** chave do PSP (Asaas/Iugu), credenciais de NFS-e (prefeitura), e-mail (Resend) e/ou WhatsApp Cloud API.

**Processo e necessidades técnicas das conexões bancárias (manter em mente desde já):**

- **PSP, não banco direto:** integrar via gateway/PSP (Asaas, Iugu, Pagar.me, Stripe) que já fala com os bancos. Evita homologação banco a banco. Decisão de qual PSP → ADR antes de codar.
- **Credenciais por tenant:** cada escola tem a própria conta no PSP. Guardar chaves do PSP **por tenant**, criptografadas (nunca em texto puro, nunca em log, nunca no client). Provável tabela `payment_accounts` (tenant_id, provider, credenciais cifradas, status).
- **Webhooks assinados + idempotência:** receber confirmação de pagamento por webhook do PSP; **verificar assinatura** e tratar entrega duplicada com chave de idempotência. Toda baixa/_envio de comprovante_ é idempotente.
- **Modelo de dados financeiro:** `invoices`/`charges` (mensalidade → boleto/PIX), `payments` (baixa), `payment_events` (auditoria do webhook). Vínculo com responsável (5.1.1) e aluno.
- **Sandbox → produção:** começar no ambiente sandbox do PSP; só promover com testes de webhook de ponta a ponta. Variáveis de ambiente separadas por ambiente.
- **Segurança/compliance:** **PCI — nunca tocar/armazenar cartão** (tokenização no PSP). LGPD em dados financeiros do responsável. Auditoria nas operações sensíveis.
- **NFS-e:** emissão municipal varia por cidade; usar provedor de NFS-e (PlugNotas/Focus NFe) em vez de integrar prefeitura a prefeitura.
- **Antifragilidade:** retries com backoff, fila para emissão/envio, e _circuit breaker_ para o PSP fora do ar (mesma postura do Segue Financeira).

## Fase 3 — Gestão & Analytics 🏫 `[V1]`

- [x] Relatórios de direção (MVP): `/app/relatorios` com KPIs da escola (turmas, alunos, média geral, frequência, atividades, simulados) e desempenho por turma. Falta multi-unidade/rede e dashboards avançados.
- [x] **Dashboards** (`/app/dashboards`): KPIs financeiros + % inadimplência, distribuição de notas (faixas) e frequência geral. Falta multi-unidade/rede e gráficos temporais.
- [ ] Relatórios secretaria/Censo INEP, evasão, mapa de habilidades. _(INEP adiado p/ v2.)_

## Fase 4 — Operações & Inclusão 🏫 `[V1/V2]`

- [ ] Operações: portaria, saída, ponto, espaços, transporte, inventário.
- [ ] Inclusão & bem-estar: laudos/PEI, adaptação NEE, socioemocional, saúde (campos sensíveis criptografados, acesso auditado).

## Fase 5 — Plataforma de Integrações 🏫👤 `[V1/V2]`

- [x] **API aberta (REST v1):** chaves por tenant com **hash sha256** (mostrada 1x), criar/listar/revogar em `/app/api`; endpoint `/api/v1/{students,classes}` autenticado por `Authorization: Bearer` (migration `0026`). Falta: OpenAPI spec, webhooks e mais recursos/escrita.
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

- [~] **1. Quadro e cadastro de funcionários** (diretor, coordenador, secretário, monitor, professor). Hoje: **quadro** em `/app/escola/quadro`, convites + papéis (inclui **monitor**, no enum), vínculo funcionário↔turma via `/app/escola/professores`. Falta: perfis de visualização por papel (item 11 da lista).
- [x] **2. Documentos: regimento + modelos gerais** (`/app/escola/personalizacao`). Evoluir: anexos de arquivo (Storage).

> **Storage ativo (2026-06-04, ADR 0005):** 2 buckets no Supabase — `public-assets` (público, branding) e `tenant-files` (privado, materiais por signed URL). Upload via service role no servidor (`apps/web/src/server/storage.ts`). **Fatia 1 entregue:** upload da logo da escola em `/app/escola/personalizacao` (`uploadLogoAction` + `<LogoUpload>`). **Falta no Vercel:** `SUPABASE_SERVICE_ROLE_KEY` no ambiente de produção. Próximas fatias: 3.1/3.3 (materiais) e RAG no EduON.

- [x] **3. Turmas, séries, idades.** `classes.grade_level` + `classes.age_range`; detalhe da turma em `/app/turmas/[id]` (editar série/idade/descrição).
  - [x] **3.1 / 3.3** Materiais didáticos por turma (upload + listagem + download) — bucket privado `tenant-files` + signed URL, tabela `materials` (migration `0022`, RLS), módulo `module-pedagogico/materials`, seção "Materiais da turma" em `/app/turmas/[id]`. **Fatia 3 (RAG-lite) feita:** texto extraído no upload (PDF via `unpdf` / txt; `materials.extracted_text`, migration `0027`) e usado como contexto ao gerar atividade no WayOn (select de turma em `/app/atividades`). Sem embeddings/credencial nova; futuro: embeddings/pgvector p/ acervo grande.
  - [x] **3.2** Matérias da turma — tabela `class_subjects` (N:N turma↔disciplina) + grade na tela de detalhe da turma.
  - [x] **3.3** (ver 3.1 acima) — materiais por turma com campo opcional de matéria.
- [x] **4. Responsáveis + vínculo com aluno.** UI de vínculo no detalhe do aluno (`/app/alunos/[id]`): vincular/desvincular responsável com parentesco + financeiro/busca/emergência.
  - [ ] **4.1 / 10. Ocorrências dos alunos** (1 ou múltiplos alunos). **← em construção agora.**
- [x] **5. Alunos + vínculo responsável/turma.** Aluno↔turma ok; vínculo aluno↔responsável com UI no detalhe do aluno.
  - [ ] **5.1 Acompanhamento financeiro do responsável — ESCOPO (Fase 2).** Vínculo aluno↔responsável pagador↔financeiro. Reusa `student_guardians.is_financial` (responsável que paga).
    - **Objetivo:** a escola controla mensalidades por aluno e o responsável vê o extrato dele. Tudo INTERNO primeiro; integração bancária (boletos/PIX/NFS-e) é a Fase 2.F.
    - **Modelo de dados (preparar; criar quando a fase começar):**
      - `tuition_plans` — valor da mensalidade por turma/aluno (valor, dia de vencimento, desconto/bolsa %, vigência).
      - `invoices` (ou `charges`) — cobrança mensal por aluno: competência (AAAA-MM), valor, vencimento, `status` (aberto/pago/vencido/cancelado), responsável pagador, aluno.
      - `payments` — baixa: data, valor, método (dinheiro/pix/cartão/boleto), referência externa (PSP), `invoice_id`.
      - `payment_events` — auditoria (entra na 2.F com webhooks do PSP).
    - **Funcionalidades (faseadas):**
      - [x] **2.a (sem banco/PSP) — FEITO:** `/app/financeiro` (tabela `invoices`, migration `0020`): lançar cobrança, **gerar mensalidades do mês em lote** (`generateMonthlyInvoices`, por aluno→responsável financeiro, idempotente por aluno/competência), **baixa manual** (dar baixa/reabrir), excluir, **totais** + **extrato por responsável** (`?resp=`). "vencido" derivado.
      - [x] **2.b Inadimplência interna — FEITO:** `/app/inadimplencia` agrupa vencidas (aberto + venc < hoje) por responsável com total/atraso e **"Cobrar no WhatsApp"** individual (reusa Evolution). Sem PSP.
      - **2.F (com PSP):** boleto/PIX via API, **confirmação por webhook**, NFS-e, **comprovante/nota automáticos** (ver bloco 2.F).
    - **Segurança/LGPD:** dado financeiro sensível; RBAC restrito a gestão/financeiro (papéis `director`/`coordinator`/`staff_finance`); o responsável só enxerga o **próprio** extrato (via portal do responsável, futuro). Idempotência em geração de cobrança e baixa.
    - **Não-objetivos agora:** não processa cartão, não emite boleto (isso é 2.F); sem integração externa.
    - [x] **5.1.1 Histórico de pagamento do responsável** — extrato por responsável em `/app/financeiro?resp=<id>` (KPIs viram o extrato dele: a receber/vencido/recebido + lista). Falta só o portal autenticado do responsável (ver depois).

### Acadêmico e rotina

- [x] **6. Calendário escolar** (`/app/calendario`).
- [x] **7. Cronograma das turmas** — `schedule_slots` (dia/horário/matéria) + `/app/cronograma` (grade semanal por turma, imprimível) + **alterações pontuais/exceções de data** (`schedule_exceptions`: data + o que muda).
  - [x] **7.1** Plano de aulas por turma/matéria — `lesson_plans` + `/app/sala/planejamento`.
  - [x] **7.2** Diário vinculado ao planejamento — `lessons.lesson_plan_id` + seletor de plano no diário.
  - [x] **7.3** Planejamento de avaliações e trabalhos — `lesson_plans.kind` (aula/avaliacao/trabalho).
- [x] **8. Chamada vinculada aos alunos + relatórios** (chamada por dia/matéria; relatório de faltas em `/app/relatorios/faltas`).
  - [x] **8.1 Faltas por matéria** — `attendance.subject_id` (índice `NULLS NOT DISTINCT`); chamada e faltas com seletor de matéria (vazio = chamada do dia).
  - [x] **8.2 Geração de documento de faltas** — `/app/relatorios/faltas` (filtros turma/aluno/matéria, resumo por aluno + detalhamento), imprimível em PDF.
- [x] **9. Notas: participação, formais e anotações por aluno** — `grades.kind` (formal/participacao/anotacao) + `grades.note`; `value` nulo p/ anotação.
  - [x] **9.2 Pesos definidos pela escola** — `grade_components` (Prova peso 1, Trabalho peso 2…) + `tenant_settings.grade_scale` + `grades.component_id`; tela `/app/escola/notas`. Cálculo "por trás": média ponderada por componente (média dentro do componente × peso), aplicada em boletim/relatórios/aluno. Sem componentes = média simples.
- [x] **9.1 Relatórios com geração de doc fácil** — botão Imprimir/PDF em Relatórios, Boletim e Relatório de faltas; a folha de impressão (`print:hidden`) esconde a navegação e deixa só o documento.
- [x] **17. Vínculos do professor** (membership ↔ turma ↔ matéria) — tabela `teaching_assignments` + `/app/escola/professores` (criar/remover; matéria vazia = regente). Base para diário/notas/faltas por professor.
- [~] **18. Professor autônomo (👤) — nicho focado em IA + padronização.** _(18.4/18.5/18.8 parciais: `navFor` já entrega o menu enxuto por segmento — some Escola, Comunicação, Gestão, Financeiro, Integrações e Ocorrências; o individual vê visão geral, sala de aula, pedagógico e EduON. Falta o "Meu padrão" (18.3), PDF no padrão (18.6) e a navegação centrada em EduON (18.8).)_ Produto enxuto e diferente da escola: o individual NÃO usa gestão institucional (secretaria, financeiro institucional, unidades, multi-perfil, NFS-e). Mapa do que importa:
  - **18.1 Posicionamento:** "o professor que ensina com IA e entrega tudo no SEU padrão". Os dois pilares são **EduON (IA)** e **padronização pessoal**.
  - **18.2 EduON como centro (o app gira em torno disso):** gerar plano de aula, atividade, **prova**, **trabalho**, **roteiro de estudo**, lista de exercícios; corrigir redação; tutor do aluno. Tudo human-in-the-loop, com cota por plano.
  - [~] **18.3 "Meu padrão" (diferencial central):** o professor define UM padrão pessoal (estilo, cabeçalho/rodapé, fonte, formato de prova/lição de casa/roteiro/bilhete, nível de dificuldade preferido) e **todo conteúdo gerado pelo EduON sai nesse padrão**. FEITO: `tenant_settings.ai_standard` + página `/app/meu-padrao` + aplicado aos prompts do EduON (gerar conteúdo/redação/tutor/atividade/simulado via `applyAiStandard`). Falta: exportação em PDF no padrão (18.6).
  - **18.4 Núcleo enxuto:** turmas/alunos próprios, agenda pessoal, banco de atividades/provas, simulados, portfólio do aluno. Acompanhamento simples de desempenho (notas/frequência leves), sem a máquina institucional.
  - **18.5 Comunicação leve:** falar só com os responsáveis dos próprios alunos (boletim/relatório simples), sem secretaria.
  - [x] **18.6 Geração de documentos:** `/app/documentos` (declarações/autorizações/texto livre em PDF com a identidade); boletim/relatórios/faltas imprimíveis; e **detalhe da atividade `/app/atividades/[id]`** imprimível em PDF com a identidade — exporta atividade/prova/trabalho/roteiro do EduON no padrão.
  - **18.7 Monetização do nicho:** Free (cota de IA) → Pro (cota maior, sem marca On Way, exportações ilimitadas). Depois: **marketplace** para vender o próprio conteúdo padronizado.
  - [x] **18.8 UI:** menu sem os grupos institucionais e **navegação centrada no EduON** (no individual o grupo EduON sobe logo após a visão geral; `navFor` reordena por segmento).

### EduON (IA) ancorado no material da escola

- [~] **11.0 Criação de aulas pelo agente (ambos os segmentos 🏫👤).** O EduON gera a **aula/plano de aula** completo, tanto no fluxo da escola (vinculado a turma/matéria/diário, item 7.1) quanto no do professor autônomo (item 18.2), sempre no padrão definido (da escola ou "meu padrão"). Hoje há geração de plano em `/app/ia`; falta o vínculo direto turma↔matéria↔diário e a aplicação do padrão.
- [~] **11. Atividades por IA com base no material didático.** EduON gera por tema; falta ancorar no material anexado (RAG).
  - [x] **11.1** Criação de atividade por descrição/solicitação do professor (`/app/atividades`).
  - [~] **11.2** Provas — gerador por tema feito (EduON cria prova com questões + gabarito, seguindo o padrão). Falta ancorar no material anexado (RAG, depende de Storage).
  - [~] **11.3** Trabalhos — gerador por tema feito (objetivo, etapas, critérios). Falta com base no material anexado.
  - [~] **11.4** Roteiros de estudo — gerador por tema feito (resumo, passos, exercícios). Falta com base no material/prova.
  - **(11.2–11.4)** Tudo via seletor de tipo (Atividade/Prova/Trabalho/Roteiro) no card "Gerar com o EduON" em `/app/atividades`, aplicando `applyAiStandard` (o padrão da escola/professor) e gravando no banco com etiqueta do tipo.
  - [~] **11.5** Padronização das atividades pelo padrão da escola — `tenant_settings.ai_standard` aplicado às gerações do EduON (mesmo mecanismo de 18.3). Falta: padrão por turma/tipo de documento.

### Comunicação e acervo

- [x] **12. Mural informativo para os pais.** Mural interno em `/app/mural` (imprimível) **+ mural público `/mural/[tenant]`**: link sem login para os pais verem os avisos publicados (com a identidade da escola). `listPublicMural` + `getPublicTenantBrand` via conexão dona; só `published`, sem PII. Evoluir: portal autenticado do responsável + QR code.
- [x] **13. Banco de atividades coletivas** (padrão On Way, sem vínculo com a escola, por faixa etária) — tabela global `shared_activities` (migration `0021`, ADR 0004), `/app/banco-coletivo`: filtrar por faixa, copiar para o próprio banco, compartilhar uma atividade. Só conteúdo, sem PII/tenant. Evoluir: moderação e ownership por linha.

### Secretaria (escola)

- [ ] **19. Módulo Secretaria:**
  - [ ] **19.1** Envio de informativos. **Por e-mail para todos os responsáveis** (em massa) e **informativos internos** (mural/app). Depende de SMTP/serviço de e-mail (Resend).
  - [ ] **19.2** Solicitações (pais/responsáveis pedem documentos; secretaria atende e marca status).
  - [ ] **19.3** Gestão de documentações necessárias por aluno (checklist do que falta entregar).
  - [ ] **19.4** Histórico escolar (registro acadêmico do aluno; geração de documento padronizado).
  - [ ] **19.5** Anexos e **criação de arquivo padronizado** (declarações, históricos, autorizações) a partir de modelos da escola → exportar PDF.

### Inspirações externas (telas que o Lucas viu) — adaptar ao NOSSO padrão

- [x] **Aniversariantes do mês** no dashboard (`/app`): `students.birth_date` + card com dia/aluno/turma. Data de nascimento no cadastro/CSV do aluno.
- [ ] **Movimento financeiro mensal** (gráfico receitas×despesas) — depende do módulo Financeiro (item 16, "depois").
- [ ] **Contas a receber/recebidas** (filtros por responsável/aluno/centro de receita + situação) — base do Financeiro manual (item 16, "depois").

### Visão geral

- [x] **14. Painel geral de acompanhamento** — `/app/relatorios` consolidado: KPIs (turmas/alunos/média/frequência/ocorrências/simulados), desempenho por turma com barras e **alunos em risco** (freq < 75% ou média < 6, com link). Evoluir: pendências e período.
- [x] **15. Divisão e formato de visualização** — painel com filtro por **turma e série** + alternância **gráfico/tabela**. (Cartões e filtro por período letivo podem evoluir depois.)

### Plataforma

- [~] **16. App mobile** com os assuntos centralizados e o melhor UI possível. Hoje: web responsivo + **navegação inferior** no mobile (`BottomNav`) + **PWA instalável** (`app/manifest.ts` + `public/sw.js` passthrough + registro via `PwaRegister`, abre em `/app` standalone). Evoluir: offline real (cache no SW) e/ou app nativo.

### Pendências transversais já mapeadas

- [x] Importação por planilha (CSV/Excel: baixar modelo → preencher → importar) para alunos/turmas/responsáveis — componente `CsvImport` + parser próprio em `lib/csv.ts` (auto-detecta `,`/`;`, aspas, BOM), modelos `.csv` com BOM para o Excel pt-BR.
- [x] Visualização por semana/mês/período no diário e na chamada — filtro de período (última semana/mês/tudo) no diário e nas faltas.
- [x] Geração de documentos padronizados em PDF — `/app/documentos` (declaração de matrícula/frequência, autorização, texto livre) com a identidade da escola, imprimível (itens 18.6 / 19.5 parcial).
- [x] **Matrícula (secretaria)** — `/app/matricula`: roster por turma, **nova matrícula** rápida (aluno + turma) e atalho para gerar documentos. Reusa alunos/turmas.
- [ ] Planejamento BNCC (banco de habilidades por disciplina/ano).
- [x] **Nome do agente personalizável** — `tenant_settings.agent_name` (migration `0025`); campo "Nome do seu agente" em `/app/escola/personalizacao`; usado no header da home do agente (`/app/ia`), com fallback "WayOn". _(Evoluir: nav/landing e professor autônomo.)_

---

## Qualidade — "melhor versão / melhor formato" (sem credencial)

> Polimento de qualidade/UX e redução de tech debt. Sem features novas. Auditoria de 2026-06-04.

- [x] **Q1. Feedback de submit** — `<SubmitButton>` (`useFormStatus`): desabilita + spinner em todo form (35 páginas); mesmo tratamento no `ConfirmButton`. Fim do duplo-clique.
- [x] **Q2. `<KpiCard>`** — `apps/web/src/components/kpi-card.tsx` cobre as 3 variações (ícone+link, simples, `cor`); aplicado por alias em dashboard/relatórios/financeiro, removendo 3 defs locais duplicadas.
- [x] **Q6. Empty states** — padrão "Nenhum X ainda." já consistente em todas as listas; corrigido o único destoante (lixeira "Vazio." → "Nada na lixeira."). CTA "criar primeiro X" dispensado: nessas telas o form de criação é colocado (lista+form na mesma página), então um link seria redundante.
- [x] **Q8. Loading/skeleton** — já atendido pelo `app/app/loading.tsx` global: no Next.js o `loading.tsx` cobre a rota e todas as aninhadas (`/app/relatorios`, `/app/sala/boletim`, etc.). Skeleton bespoke por tela = ganho marginal, dispensado.
- [~] **Q3/Q4/Q7 — DEFERIDOS (baixo ROI).** `DataTable`/`ListAndFormLayout`: tabelas e forms são heterogêneos (financeiro tem form por linha; boletim é pivot; cada cadastro tem form próprio) → a abstração ficaria genérica demais p/ remover duplicação real. `aria-label`: sweep amplo de custo alto e benefício cosmético. Reavaliar só se virar dor concreta.
- [x] **Q5. `PageHeader`** — já em uso amplo nas telas; padronização adicional só pontual, sem item dedicado.

---

_Fim do roadmap. Marcar `[x]` a cada delivery concluído no checkpoint (CLAUDE.md §5)._
