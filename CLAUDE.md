# CLAUDE.md — Manual de Operação do Agente

> Este arquivo é lido automaticamente pelo Claude Code no início de cada sessão. Ele define **como trabalhar** neste repositório. As **fontes da verdade** de produto e arquitetura são os dois documentos em `/docs`. Este arquivo manda em _processo_; eles mandam em _conteúdo_.

## Documentos-fonte (ler ANTES de qualquer tarefa)

1. `docs/SAAS-EDUCACIONAL-MASTER-SPEC.md` — arquitetura, stack, segurança/LGPD, tenancy, padrões, convenções.
2. `docs/ROADMAP-DELIVERIES.md` — módulos, fases, deliveries, marcações `[MVP]/[V1]/[V2]`, segmentos 🏫/👤.
3. `docs/PROGRESS.md` — estado atual do projeto (o que já foi feito, pendências, próximo passo).
4. `docs/adr/` — decisões de arquitetura registradas.

**Regra:** no começo de toda sessão, leia `PROGRESS.md` primeiro para saber onde paramos. Nunca presuma o estado; confirme no arquivo.

---

## Princípios inegociáveis (resumo do Master Spec)

- **Multi-tenant sempre:** `tenant_id` derivado da sessão, NUNCA de parâmetro do cliente. RLS no banco + policy na aplicação + checagem de **entitlement** (plano).
- **Dois segmentos:** `organization` (escola) e `individual` (professor autônomo). O gate de funcionalidade é o **entitlement**, nunca `if` solto.
- **Segurança e LGPD primeiro:** dados de menores = proteção máxima. Default mais restritivo. Em dúvida sobre expor dado, NÃO exponha e sinalize.
- **Nada de segredo no código.** Sem PII em log.
- **Idempotência** em cobrança, envio de mensagem e geração de documento.
- **WhatsApp só via API Oficial (Cloud API).** Nunca biblioteca não oficial.
- **IA com human-in-the-loop:** parecer/correção/feedback são rascunhos que o humano aprova. Cotas por plano.
- **Tipos e validação primeiro:** Zod / tipos / migration antes da lógica.
- **API-first, modular:** módulos só conversam via `packages/*` públicos (serviços/eventos), nunca importando internos de outro módulo.

---

## Fluxo de trabalho por tarefa (SEMPRE nesta ordem)

### 1. Entender

- Ler `PROGRESS.md`, depois a seção relevante do `ROADMAP` e do `MASTER-SPEC`.
- Identificar: **fase**, **módulo**, **delivery**, **segmento alvo** (🏫/👤), e os critérios de aceite.

### 2. Planejar (apresentar ANTES de codar)

- Listar: arquivos a criar/editar, entidades/migrations, endpoints, telas, testes, e quais segredos/credenciais a tarefa exige.
- Apontar dependências e riscos. Esperar OK do usuário em tarefas de médio/grande porte.

### 3. Executar

- Schemas Zod / tipos / migration → lógica → UI → testes.
- `tenant_id` + RLS + entitlement em toda operação de dados.
- Commits pequenos em Conventional Commits ao longo do caminho (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).

### 4. Validar

- Rodar, nesta ordem, e **tudo precisa passar**:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test` (inclui testes de **isolamento de tenant / anti-vazamento**, inclusive cross-segmento, quando a tarefa tocar dados)
  - `pnpm build` (quando aplicável)
- Se algo falhar: corrigir antes de fechar a etapa. Não marcar como concluída com teste vermelho.

### 5. **Fechar a etapa (CHECKPOINT — obrigatório ao fim de cada tarefa)**

Este é o ritual de salvamento. Executar **todos** os passos abaixo antes de declarar a tarefa concluída:

1. **Atualizar o ROADMAP:** marcar o item entregue (ex.: trocar `[ ]` por `[x]` ou anotar status na linha da funcionalidade).
2. **Registrar no `PROGRESS.md`** uma nova entrada no topo do log, no formato da §"Formato do checkpoint" abaixo.
3. **ADR quando houver decisão de arquitetura:** criar `docs/adr/NNNN-titulo-curto.md` (contexto, decisão, consequências).
4. **Atualizar `CHANGELOG.md`** se a entrega for visível ao usuário final.
5. **Commit de fechamento** em Conventional Commits, referenciando fase/módulo/delivery na mensagem.
6. **Resumo ao usuário** (sempre, ao final): o que foi feito, arquivos principais, decisões tomadas, **pendências/bloqueios**, **credenciais/segredos que faltam**, e **qual é o próximo passo sugerido**.
7. **PARAR e aguardar aprovação** antes de iniciar a próxima tarefa do delivery (gate humano). Não emendar tarefas sem OK.

> Se a sessão for interrompida no meio de uma tarefa, ainda assim registrar um checkpoint parcial em `PROGRESS.md` marcando o estado "EM ANDAMENTO" e o que falta, para a próxima sessão retomar sem perda.

---

## Formato do checkpoint (entrada no PROGRESS.md)

Adicionar SEMPRE no topo do log, copiando este bloco:

```
### [AAAA-MM-DD HH:MM] — <Fase> / <Módulo> / <Delivery> — STATUS: CONCLUÍDO | EM ANDAMENTO | BLOQUEADO
- **Tarefa:** <descrição curta>
- **Segmento:** 🏫 escola | 👤 professor | ambos
- **O que foi feito:** <bullets objetivos>
- **Arquivos principais:** <caminhos>
- **Migrations/RLS:** <sim/não + nome>
- **Testes:** <quais rodaram, resultado>
- **Decisões (ADR?):** <link para docs/adr/... se houver>
- **Pendências / bloqueios:** <o que falta, dependências>
- **Credenciais/segredos necessários:** <listar nomes de env; nunca o valor>
- **Próximo passo sugerido:** <a próxima tarefa do roadmap>
- **Commit(s):** <hashes ou mensagens>
```

---

## Credenciais e segredos (o usuário fornece — o agente nunca inventa)

- **Nunca** hardcode chaves, tokens, URLs privadas ou senhas. **Nunca** commitar `.env`.
- Todo segredo vem de variável de ambiente / secret manager. Manter `/.env.example` atualizado com os **nomes** das variáveis (sem valores).
- Quando uma tarefa precisar de uma credencial que ainda não existe:
  1. **Não invente e não prossiga adivinhando.**
  2. Adicionar o nome da variável em `.env.example` com um comentário do que é e onde obter.
  3. Listar no checkpoint, em "Credenciais/segredos necessários", exatamente o que o usuário precisa providenciar (ex.: `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `WHATSAPP_CLOUD_API_TOKEN`).
  4. Deixar o código pronto para consumir a variável e seguir com o que NÃO depende dela.
- O agente **nunca** cria contas de terceiros, manipula senhas de usuários, nem digita dados de cartão. Esses fluxos são do usuário/titular.

---

## Verificar fatos voláteis antes de fixar no código

Preços de API, nomes de modelos de IA, tarifas do WhatsApp e regras de PSP/NFS-e mudam. Antes de hardcodar qualquer um:

- Conferir a documentação oficial (ex.: modelos em `https://docs.claude.com/en/docs/about-claude/models`).
- Manter esses valores em `config/env`, nunca espalhados no código.

---

## Onde as coisas ficam (estrutura — ver §13 do Master Spec)

```
/apps/web        Next.js (UI + API + server actions)
/apps/worker     jobs assíncronos, IA pesada, lotes
/packages/db     schema Drizzle, migrations, RLS
/packages/auth   auth, RBAC, policies
/packages/entitlements  planos, entitlements, cotas
/packages/core   entidades/tipos compartilhados
/packages/modules/*  bounded contexts (nucleo, sala-de-aula, ...)
/packages/notifications  email/push/sms/whatsapp
/packages/billing  assinatura SaaS (Stripe/Paddle)
/packages/ui     design system
/packages/validation  schemas Zod
/docs            specs, roadmap, PROGRESS.md, adr/
```

## Comandos do projeto

- Instalar: `pnpm install`
- Dev: `pnpm dev`
- Lint / tipos / testes / build: `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build`
- Migrations: `pnpm db:generate` · `pnpm db:migrate`
  > Se algum comando ainda não existir (início do projeto), criá-lo como parte da Fase 0 e registrar no checkpoint.

---

## Em caso de ambiguidade

Escolher a opção mais simples, segura e padrão de mercado; registrar a suposição no checkpoint e, se for decisão de arquitetura, abrir um ADR.
