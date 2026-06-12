# SaaS Educacional — Master Spec (Documento-Fonte)

> **Propósito deste documento.** Esta é a fonte da verdade técnica e de produto do projeto. Ela existe para que o **Claude Code** (e qualquer dev humano) saiba _o que_ construir, _como_ construir e _seguindo quais padrões_, sem precisar re-decidir arquitetura a cada tarefa. A partir daqui derivamos MVPs e deliveries (ver `ROADMAP-DELIVERIES.md`).
>
> **Regra de ouro para o agente:** quando uma decisão não estiver aqui, escolha a opção que (1) seja mais simples de manter, (2) respeite segurança e LGPD, (3) seja a prática de mercado mais consolidada — e registre a decisão num ADR (ver §14).

---

## 1. Visão geral do produto

Plataforma SaaS **multi-tenant** para educação que unifica gestão acadêmica, comunicação escola-família, financeiro e uma camada de IA transversal. O produto é vendido por **módulos** e atende **dois segmentos comerciais**:

- **Escolas e redes (B2B)** — produto completo, contratado pela instituição.
- **Professores autônomos (B2C / prosumer)** — um subconjunto de módulos que faz sentido de forma **independente** (ferramentas de IA, banco de atividades, gestão leve de turmas, simulados, marketplace), vendido em autosserviço por assinatura.

> ⚠️ **Decisão central:** os dois segmentos rodam **na mesma base de código e na mesma arquitetura multi-tenant**. Um professor autônomo é apenas um _tenant do tipo `individual`_ com um único membro. Uma escola é um _tenant do tipo `organization`_ com muitos membros. O que muda entre eles é o **tipo de tenant**, o **plano** e os **entitlements** (módulos liberados) — não a fundação. Ver §3.

**Personas principais**

- **Diretor / Mantenedor** (escola) — visão executiva, financeiro, indicadores, multi-unidade.
- **Coordenador pedagógico** (escola) — currículo, conselho de classe, acompanhamento de alunos.
- **Professor institucional** (escola) — diário, notas, faltas, planos de aula, atividades, bilhetes.
- **Secretaria / Administrativo** (escola) — matrícula, documentos, cobranças, declarações.
- **Responsável** (escola) — boletim, faltas, agenda, comunicados, mensalidades.
- **Aluno** (escola) — atividades, notas, portfólio, tutor de IA (conforme idade).
- **Professor autônomo** (B2C) — workspace pessoal: cria planos/atividades com IA, gerencia turmas próprias (aulas particulares ou reforço), corrige redações, vende/compra no marketplace.

**Princípios de produto**

- Cada perfil vê **apenas o que lhe interessa**.
- Dados de **menores de idade** são o ativo mais sensível: nível extra de cuidado (ver §7).
- A escola precisa **perceber valor no mês 1**; o professor autônomo precisa ter valor **no primeiro uso** (autosserviço sem fricção).

---

## 2. Princípios de arquitetura

| Princípio                           | O que significa na prática                                                                                                                                                                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Multi-tenant, dois segmentos**    | Uma base de código atende N escolas **e** N professores autônomos. Todo dado carrega `tenant_id`. `tenant_type` (`organization` / `individual`) distingue o segmento. Isolamento por RLS + checagem na aplicação.                            |
| **Entitlement-driven**              | O que cada tenant pode usar é determinado por **plano → entitlements** (módulos/limites), não por `if`s espalhados. Uma única fonte mapeia plano → módulos/cotas. Habilita vender "partes" para professores e "tudo" para escolas sem forks. |
| **Modular**                         | Cada módulo é um _bounded context_. Acoplamento só via contratos explícitos (eventos/serviços). Módulos "escola" e módulos "standalone" convivem; o entitlement decide o que aparece.                                                        |
| **API-first**                       | Toda funcionalidade existe primeiro como API tipada. Habilita o marketplace e a API aberta sem retrabalho.                                                                                                                                   |
| **Security & privacy by design**    | Segurança é requisito de cada feature. Default mais restritivo.                                                                                                                                                                              |
| **Event-driven onde fizer sentido** | Efeitos cross-módulo via eventos/filas (pagamento → NFS-e; falta acima do limite → notifica).                                                                                                                                                |
| **Idempotência**                    | Operações sensíveis (cobrança, mensagem, documento) idempotentes e rastreáveis por `idempotency_key`.                                                                                                                                        |
| **Observabilidade desde o dia 1**   | Logs estruturados, métricas, traces. Custo de IA medido **por tenant**.                                                                                                                                                                      |

---

## 3. Modelo de tenancy, segmentos e planos

Este capítulo é a tradução da estratégia comercial (vender para escolas **e** para professores) em arquitetura.

### 3.1 Tipos de tenant

- **`organization`** — escola ou rede. Muitos usuários, RBAC completo, todos os módulos contratados. Onboarding assistido (admin configura + convida membros).
- **`individual`** — professor autônomo. Tenant com **um único membro** (owner = teacher). Onboarding **self-service instantâneo**. Acesso só ao subconjunto de módulos viável de forma autônoma.

Ambos usam o **mesmo mecanismo de isolamento** (RLS por `tenant_id`). Não há código separado por segmento — há **entitlements** diferentes.

### 3.2 O que cada segmento acessa

| Capacidade                                                           | Escola (`organization`) |    Professor autônomo (`individual`)     |
| -------------------------------------------------------------------- | :---------------------: | :--------------------------------------: |
| IA pedagógica (plano, atividades, parecer, correção de redação, OCR) |           ✅            |                    ✅                    |
| Banco de atividades pessoal + marketplace (comprar/vender)           |           ✅            |                    ✅                    |
| Gestão de turmas/alunos próprios, notas, faltas                      |   ✅ (institucional)    |     ✅ (turmas particulares/reforço)     |
| Simulados / quizzes / portfólio                                      |           ✅            |                    ✅                    |
| Boletim/relatório simples para os pais dos seus alunos               |           ✅            |             ✅ (versão leve)             |
| Comunicação institucional em massa + WhatsApp oficial da escola      |           ✅            | ➖ (comunicação leve só com seus alunos) |
| **Financeiro institucional** (mensalidade, NFS-e, inadimplência)     |           ✅            |                    ❌                    |
| **Matrícula/rematrícula, histórico/declaração oficiais**             |           ✅            |                    ❌                    |
| **Portaria, ponto, transporte, Censo INEP, conselho de classe**      |           ✅            |                    ❌                    |
| **Dashboards de direção, multi-unidade/rede**                        |           ✅            |                    ❌                    |

> Regra de design: tudo que é **vínculo institucional/legal** (documento oficial, cobrança da instituição, dados de operação da escola) é exclusivo de `organization`. Tudo que é **ferramenta de produtividade do professor** é compartilhado entre os dois segmentos.

### 3.3 Planos e entitlements

- `Plan` exemplos: `teacher_free`, `teacher_pro` (individual); `school_starter`, `school_full`, `network` (organization).
- `Entitlement` = mapa **plano → {módulos habilitados, limites/cotas}**. Fonte única em `packages/entitlements`. Ex.: `teacher_free` tem cota mensal de tokens de IA e nº de alunos limitado; `teacher_pro` amplia; planos de escola liberam módulos institucionais.
- **Feature flags** complementam os entitlements para rollout gradual e liberação por tenant.

### 3.4 Caminhos de conversão (cross-sell entre segmentos)

- **Professor → Escola (referral):** professor autônomo gosta → indica à escola onde leciona. Programa de indicação.
- **Escola absorve professor:** escola adota o produto → convida o professor para o tenant da escola. O conteúdo pessoal do professor (planos, banco de atividades) pode ser **opcionalmente copiado** para o contexto institucional, com consentimento (portabilidade explícita; os dois tenants permanecem isolados — é cópia, não fusão).
- **Professor mantém o workspace** mesmo ao sair de uma escola.
- **Marketplace conecta os dois:** professores autônomos vendem conteúdo que escolas compram (e vice-versa).

### 3.5 Implicações de onboarding e faturamento

- **Onboarding:** `organization` = fluxo de setup + convites; `individual` = cadastro instantâneo com valor no primeiro uso (freemium).
- **Faturamento (atenção, são dois contextos distintos):** ver §11. Resumo: a **assinatura do produto** (quem paga _pelo_ SaaS) é diferente da **cobrança de mensalidade dos pais** (a escola cobrando suas famílias). Não confundir.

---

## 4. Stack tecnológica recomendada

A stack abaixo prioriza **velocidade de entrega para um time pequeno com experiência intermediária**, mantendo caminho de evolução para escala.

### 4.1 Frontend

- **Next.js 15 (App Router) + TypeScript** — SSR/RSC, rotas por arquivo, ótimo DX.
- **Tailwind CSS + shadcn/ui** — design system consistente e acessível.
- **TanStack Query** — cache e sincronização de dados de servidor.
- **React Hook Form + Zod** — formulários tipados com validação compartilhada (mesmo schema no client e server).
- **PWA** para o app do responsável/professor (instalável, offline parcial). App nativo (React Native/Expo) em fase posterior.

### 4.2 Backend / API

- **Next.js Route Handlers + Server Actions** para o monólito modular inicial.
- **tRPC internamente** (type-safety ponta a ponta) + **REST/OpenAPI público** para a API aberta e o marketplace.
- **Zod** como única fonte de schemas de validação.
- Processamento pesado/assíncrono (relatório com IA, lote de cobrança) → **worker/serviço dedicado** (§4.5).

### 4.3 Banco de dados

- **PostgreSQL** (via **Supabase** no início): relacional, maduro, RLS nativo, JSONB e `pgvector` (RAG).
- **Multi-tenancy por `tenant_id` + RLS** (_shared database, shared schema_). Melhor custo/benefício para começar. Evolução: schema-por-tenant ou DB dedicado para enterprise/redes grandes.
- **Drizzle ORM** (leve, SQL-first, RLS-friendly). Prisma aceitável se o time preferir.
- **Migrations versionadas** obrigatórias.

> ⚠️ **Supabase + RLS:** RLS é a linha de defesa principal do isolamento multi-tenant — vale para `organization` **e** `individual`. Toda tabela com dado de tenant precisa de política RLS. Escreva testes que tentem vazar dados entre tenants e garantam falha.

### 4.4 Armazenamento de arquivos

- **Supabase Storage** ou **S3-compatível** (Cloudflare R2 ótimo custo).
- Buckets por tenant. URLs **sempre** assinadas e curtas. Scan de malware antes de liberar download.

### 4.5 Jobs assíncronos, filas e agendamento

- **Filas:** **pg-boss** (filas em Postgres, zero infra extra) ou **Inngest** (eventos + steps gerenciados). Evoluir para Redis/BullMQ conforme volume.
- **Cron:** Vercel Cron no início; worker dedicado quando os jobs ficarem longos.
- Casos: régua de cobrança, alertas, comunicados em massa, geração de PDF, IA em lote, sincronização de integrações.

### 4.6 Hospedagem / infra

- **Frontend + API:** Vercel no início.
- **Banco/Storage/Auth:** Supabase.
- **Workers/IA pesada:** Render, Railway, Fly.io ou container em cloud quando crescer.
- **Anti-lock-in:** manter app containerizável (Docker) para migrar para infra própria sem reescrita.

### 4.7 Resumo da stack

| Camada                  | Escolha                                | Por quê                              | Alternativa     |
| ----------------------- | -------------------------------------- | ------------------------------------ | --------------- |
| UI                      | Next.js 15 + TS + Tailwind + shadcn/ui | DX, ecossistema, acessível           | Remix           |
| Estado servidor         | TanStack Query                         | Cache robusto                        | SWR             |
| API tipada              | tRPC (interno) + OpenAPI (público)     | Type-safety + marketplace/API aberta | REST puro + Zod |
| Validação               | Zod                                    | Schema único client+server           | Valibot         |
| DB                      | PostgreSQL (Supabase)                  | Relacional + RLS + pgvector          | Neon, RDS       |
| ORM                     | Drizzle                                | Leve, SQL-first, RLS-friendly        | Prisma          |
| Storage                 | Supabase Storage / R2                  | Custo + URLs assinadas               | S3              |
| Filas                   | pg-boss / Inngest                      | Sem infra extra no início            | BullMQ+Redis    |
| Auth                    | Supabase Auth / Auth.js                | SSO, magic link, MFA                 | Clerk, WorkOS   |
| Assinatura SaaS         | Stripe / Paddle                        | Recorrência B2C+B2B, global          | —               |
| Cobrança de mensalidade | Asaas / Iugu                           | PIX/boleto/recorrência BR            | Pagar.me        |
| IA                      | Anthropic Claude API                   | Qualidade + custo por tier           | —               |

---

## 5. Modelo de dados central

```
Tenant (escola OU professor autônomo)
 ├── tenant_type: organization | individual
 ├── Plan / Subscription / Entitlement     # o que este tenant pode usar
 ├── Unit (unidade/campus)                  # só organization
 ├── User
 │    └── Membership (User × Tenant × Role × Unit)
 ├── AcademicYear / Term
 ├── Grade (série) / Class (turma)
 ├── Student
 │    └── Guardian (responsável)            # N:N com Student
 ├── Teacher / Staff
 ├── Subject (disciplina)
 └── AuditLog
```

**Regras transversais**

- Toda tabela de domínio: `id` (UUID), `tenant_id`, `created_at`, `updated_at`, `created_by`, `deleted_at` (soft delete).
- **Soft delete** em tudo pedagógico/legal. Exclusão física só por rotina de retenção (LGPD) com registro.
- `Tenant.tenant_type` governa quais módulos/entidades fazem sentido; combinado com `Entitlement`, decide o que é exposto.
- `Membership` modela papéis com escopo. Num tenant `individual`, há uma única membership (owner+teacher).
- Aluno↔Responsável é N:N com atributos (tipo de relação, é financeiro?, pode buscar?, emergência?).
- Entidades novas para tenancy comercial: `Plan`, `Subscription`, `Entitlement`, `UsageMeter` (cotas, ex.: tokens de IA por período).

---

## 6. Autenticação, autorização e RBAC

### 6.1 Autenticação

- **Provider:** Supabase Auth ou Auth.js. Suportar:
  - **Magic link / e-mail OTP** (responsáveis e professores autônomos — sem fricção).
  - **SSO Google / Microsoft** (professores e escolas com Google Workspace / Microsoft 365 Education).
  - **Senha + MFA obrigatório** para perfis administrativos (diretor, secretaria, financeiro).
- Sessões curtas + refresh tokens. Revogação por admin.
- O agente **nunca** cria contas de terceiros nem manipula senhas — fluxos de senha são do próprio usuário.

### 6.2 Autorização (RBAC + escopo + entitlement)

- Permissão = (papel) × (recurso) × (ação) × (escopo) — **e** verificação de **entitlement** (o plano do tenant libera o módulo?).
- Papéis base: `owner`, `director`, `coordinator`, `teacher`, `staff_secretary`, `staff_finance`, `guardian`, `student`. No `individual`, o owner acumula `teacher`.
- **Tripla checagem:** RLS no banco (dados) + policy na aplicação (regra) + entitlement (comercial).
- Menor privilégio: professor vê só suas turmas; responsável só dependentes; aluno só a si.

### 6.3 Trilha de auditoria

- `AuditLog`: quem, quando, o quê, recurso, antes/depois, IP, user-agent.
- Sempre auditado: alteração de nota, exclusão, acesso a saúde/laudo, operação financeira, mudança de permissão, exportação de dados, mudança de plano.

---

## 7. Segurança e privacidade (LGPD + dados de menores)

> Capítulo inegociável. Tratamos dados de **crianças e adolescentes** — proteção máxima na LGPD.

### 7.1 Bases legais e governança

- Mapear **base legal** de cada tratamento (execução de contrato, obrigação legal, consentimento do responsável quando aplicável).
- Dado de menor: **melhor interesse da criança**; consentimento de ao menos um responsável quando a base for consentimento.
- **Papéis LGPD:** a escola normalmente é **Controladora**; o SaaS é **Operador** (DPA com cada escola). No segmento `individual`, o próprio professor é controlador dos dados de seus alunos particulares — refletir isso nos termos.
- Manter **RoPA** e canal do **encarregado/DPO**.
- Direitos do titular: exportar (portabilidade), corrigir, eliminar (respeitando retenção legal de documentos escolares).

### 7.2 Dados sensíveis

- Categorias especiais: **saúde** (alergias, laudos, PEI, vacinas), **biometria** (preferir QR/credencial a biometria), **socioemocional**.
- Criptografar em repouso campos sensíveis (column-level/envelope). Acesso auditado e restrito por papel.

### 7.3 Checklist técnico obrigatório

- **Criptografia:** TLS 1.2+ em trânsito; AES-256 em repouso.
- **Segredos:** em gerenciador (Vault/Doppler/env). Nunca em código.
- **Isolamento multi-tenant:** RLS + testes anti-vazamento entre tenants no CI (incluindo cross-segmento).
- **Validação:** Zod em toda fronteira. Anti-XSS. Queries parametrizadas (anti-SQLi).
- **Rate limiting** e anti-brute-force em auth e endpoints públicos.
- **Headers de segurança** (CSP, HSTS, etc.), CORS restrito.
- **Uploads:** validar tipo/tamanho, scan de malware, URL assinada.
- **Dependências:** SCA (Dependabot/Renovate) + lockfile.
- **Backups:** automáticos, criptografados, testados (restore drill). PITR no Postgres.
- **Retenção/descarte:** política por tipo de dado; anonimização ao fim do ciclo.
- **Resposta a incidentes:** runbook + notificação (ANPD/titulares).
- **Revisão de segurança/pentest** antes de cada delivery que amplie superfície de ataque.

### 7.4 Princípios para o agente

- Default mais restritivo. Em dúvida sobre exposição, **não exponha** e sinalize.
- Nunca logar PII em claro.
- `tenant_id` **sempre** derivado da sessão, nunca de parâmetro do cliente.

---

## 8. Infraestrutura e operação

### 8.1 Ambientes

`local` → `preview` (por PR) → `staging` → `production`. Staging com dados sintéticos/anonimizados.

### 8.2 CI/CD

- **GitHub Actions:** lint → typecheck → testes → build → migrations (dry-run) → deploy.
- Bloquear deploy se testes ou checagem de RLS falharem. Preview por PR.

### 8.3 Observabilidade

- Logs estruturados (JSON) com request id + tenant id (sem PII).
- Métricas (latência, erro, fila, **custo de IA por tenant**).
- Tracing (OpenTelemetry). Error tracking (Sentry). Uptime/alertas.

### 8.4 Confiabilidade

- SLOs definidos. Degradação graciosa: se IA ou WhatsApp caírem, o núcleo segue operando.
- Filas com retry e dead-letter. Idempotência em reenvios.

---

## 9. Camada de IA (transversal)

A IA **potencializa todos os módulos** e é o principal valor do produto B2C (professor autônomo).

### 9.1 Modelos (Anthropic Claude API)

- **Alto volume / baixa complexidade** (classificação, extração, tutor básico): **Haiku**.
- **Geração pedagógica de qualidade** (plano de aula, parecer, correção, atividades): **Sonnet**.
- **Tarefas complexas/agênticas/relatórios longos**: **Opus**.
- Nome do modelo em **config/env**, nunca hardcoded. Conferir em `https://docs.claude.com/en/docs/about-claude/models`.

### 9.2 RAG

- IA "ciente de documentos" (BNCC, PPP, regimento, materiais): **pgvector** + pipeline de ingestão (chunking + embeddings).
- Cada doc carrega `tenant_id`; a busca vetorial **sempre** filtra por tenant. RAG não vaza entre tenants nem entre segmentos.

### 9.3 Guardrails

- **Isolamento por tenant** rigoroso.
- **Tutor de aluno:** restrito por faixa etária; filtros de conteúdo; não substitui professor.
- **Prompt injection:** conteúdo de documentos/uploads é **dado não confiável**; a IA nunca executa instruções vindas deles.
- **Human-in-the-loop:** parecer, correção de redação e feedback são **rascunhos** que o professor revisa e aprova.
- **Transparência:** sinalizar conteúdo gerado/assistido por IA.
- **Custo:** medir tokens por tenant; **cotas por plano** (essencial no B2C freemium); cache; batch para tarefas não urgentes.

### 9.4 Casos de uso (mapeados aos módulos)

Plano de aula, gerador de atividades, banco de questões, correção objetiva, correção de redação por competências, parecer descritivo, feedback individualizado, avaliação diagnóstica → mapa de habilidades, alerta de risco de reprovação/evasão, adaptação para NEE, tutor do aluno, resumo/ata de reunião, OCR de atividade → lançamento, tradução de comunicados, relatório institucional anual.

---

## 10. Comunicação: e-mail, push, SMS e WhatsApp

Arquitetar como **serviço de notificação unificado**: a aplicação publica um evento; o serviço decide canal(is), template, idioma e preferência.

### 10.1 Camada de notificação

- **Notification Service** central: catálogo de templates, preferências por usuário (canal, opt-in/out), fila, retry, status de entrega, log auditável.
- Canais: **in-app**, **push (Web Push/FCM)**, **e-mail**, **SMS** (fallback), **WhatsApp**.
- Respeitar opt-out e janela de horário.
- No segmento `individual`, a comunicação é **leve** (só com os alunos/responsáveis do próprio professor); a comunicação institucional em massa é da escola.

### 10.2 E-mail

- Transacional: **Resend**, **Amazon SES** ou **Postmark**.
- Configurar **SPF, DKIM, DMARC**. Domínio próprio de envio. Templates versionados (React Email).

### 10.3 Push

- **Web Push** (PWA); **FCM** se houver app nativo.

### 10.4 SMS

- Fallback crítico (emergência/OTP). Twilio/Zenvia. Caro — usar com parcimônia.

### 10.5 WhatsApp — **API Oficial vs Não Oficial**

**Recomendação firme: API OFICIAL (WhatsApp Cloud API da Meta), via Meta direto ou um BSP.**

**Por que NÃO usar bibliotecas não oficiais:**

- Violam os Termos da Meta → risco real de **banimento do número** (perder o canal com toda a comunidade de uma vez é catastrófico).
- Sem SLA, frágeis a updates, quebram em produção.
- Risco jurídico/privacidade inaceitável para produto que trafega dados de **menores** e comunicações oficiais.

**API Oficial — fatos atuais (2026):**

- **Cobrança por mensagem desde 1º/jul/2025** (não mais por conversa de 24h).
- **Quatro categorias:** Marketing, Utility, Authentication, Service.
- **Mensagens de serviço** (resposta a conversa iniciada pelo cliente, dentro da janela de 24h) são **gratuitas**.
- Mensagens proativas exigem **templates pré-aprovados**; preço por categoria + **país do destinatário**. **Brasil entre as tarifas mais baratas** (~1/3 dos EUA).
- Acesso via **Cloud API** (Meta direto) ou **BSP** (360dialog/Twilio/Zenvia).

**Design no produto:**

- Templates por categoria (boletim disponível, falta, boleto = _Utility_; campanha/matrícula = _Marketing_; OTP = _Authentication_).
- **Maximizar a janela de serviço gratuita.**
- WhatsApp atrás do **Notification Service** com _provider adapter_ (trocar Cloud API ↔ BSP sem mexer no resto).
- **Verificar tarifas/regras atuais** na doc da Meta antes de precificar (Meta ajusta periodicamente).

---

## 11. Faturamento e financeiro — **dois contextos distintos**

> Erro comum: confundir "quem paga pelo produto" com "a escola cobrando as famílias". São coisas separadas, com provedores diferentes.

### 11.1 Assinatura do SaaS (receita do produto)

- Quem paga: a **escola** (B2B) ou o **professor autônomo** (B2C).
- Provedor: **Stripe** ou **Paddle** (recorrência, global, gestão de planos/upgrades/trials).
- B2C: autosserviço, **freemium** (`teacher_free` → `teacher_pro`), assinatura mensal/anual.
- B2B: contrato (por aluno / por seat / por módulo), fatura, possível cobrança assistida.
- Liga com `Plan`/`Subscription`/`Entitlement` (§3, §5).

### 11.2 Cobrança de mensalidade (Módulo Financeiro — só `organization`)

- Quem paga: as **famílias**, para a **escola**. O SaaS é o intermediário operacional.
- Provedor: **Asaas / Iugu / Pagar.me** (PIX, boleto, cartão, recorrência educacional BR).
- **NFS-e** automática ao confirmar pagamento (PlugNotas/Focus/eNotas).
- Régua de cobrança, inadimplência, bolsas/descontos, loja, split (rede).
- **Webhooks** idempotentes e com assinatura verificada. Nunca confiar em status vindo do client.
- **PCI:** não armazenar cartão. Tokenização no gateway. O agente **nunca** manipula número de cartão.

---

## 12. Padrões de código e qualidade

- **TypeScript estrito** (`strict: true`), sem `any` injustificado.
- **Lint+format:** ESLint + Prettier; husky + lint-staged.
- **Commits:** Conventional Commits.
- **Testes:** Vitest (unit), integração para API e **RLS (anti-vazamento, incluindo cross-segmento)**, Playwright (E2E em fluxos críticos: signup individual, matrícula, lançamento de nota, cobrança). Qualidade > cobertura numérica.
- **A11y:** WCAG AA. **i18n:** pt-BR padrão + estrutura para outros idiomas.
- **Documentação:** README por módulo; ADRs (§14); OpenAPI.
- **Feature flags + entitlements** para liberar funcionalidade por plano/tenant e rollout gradual.

---

## 13. Estrutura de pastas (monorepo modular)

```
/apps
  /web            # Next.js (UI + API + server actions)
  /worker         # jobs assíncronos, IA pesada, lotes
/packages
  /db             # schema Drizzle, migrations, RLS
  /auth           # auth, RBAC, policies
  /entitlements   # planos, entitlements, cotas (fonte única do "quem pode o quê")
  /core           # entidades/tipos compartilhados
  /modules
    /nucleo
    /sala-de-aula
    /comunicacao
    /financeiro
    /pedagogico
    /ia
    /gestao
    /operacoes
    /inclusao
    /integracoes
  /notifications  # email/push/sms/whatsapp adapters
  /billing        # assinatura SaaS (Stripe/Paddle)
  /ui             # design system
  /config         # env, feature flags, constantes
  /validation     # schemas Zod compartilhados
/docs
  /adr
  SAAS-EDUCACIONAL-MASTER-SPEC.md
  ROADMAP-DELIVERIES.md
```

- **pnpm workspaces + Turborepo.**
- **Fronteira:** módulos só conversam via `packages/*` públicos (serviços/eventos), nunca importando internos de outro módulo.

---

## 14. Convenções para o Claude Code

1. **Antes de codar:** ler este spec + `ROADMAP` + ADRs. Confirmar módulo, delivery **e segmento** (organization/individual) da tarefa.
2. **Planejar primeiro:** arquivos, entidades, endpoints, testes.
3. **Tipos e validação primeiro:** Zod / tipos / migration antes da lógica.
4. **Tenant + entitlement em toda operação:** `tenant_id` da sessão; RLS + policy + checagem de entitlement; nunca expor cross-tenant.
5. **Testes junto com a feature**, incluindo isolamento de tenant.
6. **Idempotência** em cobrança, mensagem e documento.
7. **Sem segredo no código. Sem PII em log.**
8. **Decisão arquitetural nova** → ADR curto em `/docs/adr`.
9. **Commits** Conventional, pequenos. PR com o quê/por quê.
10. **Ambiguidade** → opção mais simples, segura e padrão; registrar suposição.
11. **Nunca** criar conta de terceiro, manipular senha/cartão, ou usar WhatsApp não oficial.
12. **Verificar fatos voláteis** (preços de API, modelos, tarifas WhatsApp) na doc oficial.
13. **Respeitar o segmento:** não expor a um tenant `individual` funcionalidade exclusiva de escola; o gate é o entitlement, não `if` solto.

---

## 15. Resumo dos módulos (índice)

Detalhamento, dependências e deliveries em `ROADMAP-DELIVERIES.md`. Coluna "Segmento": 🏫 escola, 👤 professor autônomo.

| #   | Módulo                        | Essência                                                                                                    | Segmento |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------- | :------: |
| 1   | **Núcleo / Plataforma**       | Tenants, tipos, planos/entitlements, usuários, papéis, turmas, alunos, responsáveis, auth, RBAC, auditoria. |   🏫👤   |
| 2   | **Sala de Aula (Acadêmico)**  | Diário, notas, faltas, boletim, ocorrências, conselho de classe.                                            |  🏫👤\*  |
| 3   | **Comunicação**               | Notification Service, bilhetes, comunicados, chat, portal, WhatsApp/e-mail/push.                            |  🏫👤\*  |
| 4   | **Financeiro institucional**  | Mensalidades, cobrança, NFS-e, bolsas, inadimplência, loja.                                                 |    🏫    |
| 5   | **Pedagógico**                | Planejamento BNCC, banco de atividades, simulados, portfólio, rubricas, biblioteca.                         |   🏫👤   |
| 6   | **IA (transversal)**          | Plano de aula, atividades, parecer, correção, tutor, OCR, diagnóstico, alertas.                             |   🏫👤   |
| 7   | **Gestão & Analytics**        | Dashboards, relatórios secretaria/INEP, evasão, mapa de habilidades.                                        |    🏫    |
| 8   | **Operações Escolares**       | Portaria, saída, ponto, espaços, transporte, inventário.                                                    |    🏫    |
| 9   | **Inclusão & Bem-estar**      | Laudos/PEI, adaptação NEE, socioemocional, saúde.                                                           |    🏫    |
| 10  | **Plataforma de Integrações** | API aberta, Google Classroom/Teams, contábil, webhooks, marketplace.                                        |   🏫👤   |

_\* Versão leve/pessoal para o professor autônomo (só seus alunos), sem o aparato institucional._

---

_Fim do Master Spec. Alterações que mudem decisão de arquitetura devem vir acompanhadas de um ADR._
