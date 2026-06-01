# Prompts para o Claude Code

Três prompts: **(A)** bootstrap (1ª vez), **(B)** iniciar um delivery, **(C)** lembrete de fechamento de etapa. Copie e cole no Claude Code conforme a situação. Os documentos `CLAUDE.md`, `SAAS-EDUCACIONAL-MASTER-SPEC.md` e `ROADMAP-DELIVERIES.md` já devem estar no repositório (raiz e `/docs`).

---

## A) Prompt de BOOTSTRAP (rodar uma única vez, no repositório vazio)

```
Você vai iniciar um projeto SaaS educacional multi-tenant. Antes de qualquer código:

1. Leia, na íntegra: CLAUDE.md, docs/SAAS-EDUCACIONAL-MASTER-SPEC.md e docs/ROADMAP-DELIVERIES.md.
   Se docs/PROGRESS.md ainda não existir, crie-o a partir do template descrito no CLAUDE.md (seção "Formato do checkpoint"), com uma entrada inicial "Projeto iniciado".

2. NÃO implemente funcionalidades ainda. Sua primeira entrega é apenas a FUNDAÇÃO (Fase 0):
   - Monorepo pnpm + Turborepo com a estrutura de pastas definida no Master Spec (§13).
   - Next.js 15 + TypeScript (strict) + Tailwind + shadcn/ui em /apps/web.
   - Drizzle + Postgres (Supabase) em /packages/db, com a noção de tenant (tenant_id, tenant_type) e RLS habilitado nas tabelas-base.
   - /packages/entitlements com a estrutura de Plan/Entitlement (ainda que com planos placeholder).
   - /packages/auth com o esqueleto de RBAC + escopo de tenant.
   - ESLint + Prettier + husky + lint-staged + Conventional Commits.
   - Scripts: dev, lint, typecheck, test, build, db:generate, db:migrate.
   - CI (GitHub Actions): lint → typecheck → test → build, com bloqueio em falha.
   - Vitest configurado, incluindo um teste de exemplo de isolamento de tenant (anti-vazamento via RLS).
   - .env.example com os NOMES das variáveis necessárias (sem valores) e comentários de onde obter cada uma.
   - Observabilidade mínima (logger estruturado sem PII) e Sentry como placeholder.

3. PLANEJE primeiro: apresente a lista de arquivos, pacotes e migrations que vai criar, e quais credenciais/env a Fase 0 exige. Aguarde meu OK antes de executar.

4. Execute seguindo o fluxo do CLAUDE.md. Ao terminar, faça o CHECKPOINT obrigatório (atualizar ROADMAP + PROGRESS.md + ADR se houver + commit + resumo), liste as credenciais que preciso providenciar, e PARE aguardando minha aprovação.

Regras que valem sempre: tenant_id da sessão (nunca do cliente); nada de segredo no código; verifique fatos voláteis na doc oficial; em dúvida, opção mais simples/segura + registre a suposição.
```

---

## B) Prompt para INICIAR UM DELIVERY (repetir a cada delivery)

Preencha `<FASE>`, `<MÓDULO>`, `<DELIVERY/FUNCIONALIDADES>` e `<SEGMENTO>` conforme o roadmap.

```
Releia docs/PROGRESS.md (onde paramos), depois as seções de docs/ROADMAP-DELIVERIES.md e docs/SAAS-EDUCACIONAL-MASTER-SPEC.md referentes a:

- Fase: <FASE>
- Módulo: <MÓDULO>
- Delivery / funcionalidades: <DELIVERY/FUNCIONALIDADES>
- Segmento alvo: <🏫 escola | 👤 professor | ambos>

Tarefa: implementar este delivery seguindo o fluxo do CLAUDE.md.

1. PLANEJE primeiro: entidades/migrations, endpoints, telas, testes (incluindo isolamento de tenant), políticas RLS, checagem de entitlement, e credenciais/env necessárias. Liste critérios de aceite extraídos do roadmap. Aguarde meu OK.

2. Implemente: Zod/tipos/migration → lógica → UI → testes. tenant_id + RLS + entitlement em toda operação de dados. Commits pequenos em Conventional Commits.

3. Valide: lint, typecheck, test (com testes anti-vazamento de tenant), build. Tudo verde antes de fechar.

4. CHECKPOINT obrigatório ao final (conforme CLAUDE.md §5):
   - marque o item no ROADMAP;
   - registre a entrada no topo de docs/PROGRESS.md no formato padrão;
   - abra ADR se houve decisão de arquitetura;
   - atualize CHANGELOG se for visível ao usuário;
   - faça o commit de fechamento;
   - me dê o resumo: o que foi feito, decisões, pendências/bloqueios, credenciais que faltam, e próximo passo sugerido;
   - PARE e aguarde minha aprovação antes da próxima tarefa.

Se faltar alguma credencial, não adivinhe: adicione o nome em .env.example, deixe o código pronto para consumi-la, siga com o que não depende dela e me avise no checkpoint.
```

---

## C) Lembrete de FECHAMENTO (se o agente esquecer o checkpoint)

```
Antes de seguir, feche esta etapa conforme o CLAUDE.md §5:
1) marque o item no ROADMAP; 2) registre o checkpoint no topo de docs/PROGRESS.md no formato padrão; 3) ADR se houver decisão de arquitetura; 4) CHANGELOG se aplicável; 5) commit de fechamento em Conventional Commits; 6) resumo com pendências, credenciais faltantes e próximo passo; 7) pare e aguarde meu OK.
```

---

## Ordem recomendada de deliveries (do roadmap)

1. **Fase 0 — Fundação** (bootstrap acima).
2. **Fase 1B — Professor Pro** (núcleo enxuto + Pedagógico + IA + Marketplace) → caminho rápido para receita.
   - ou **Fase 1A — MVP Escola** (Núcleo + Sala de Aula + Comunicação) se preferir começar pelo B2B.
3. Fase 2 → 3 → 4 → 5, conforme o roadmap.

> Dica: rode um delivery por vez, sempre passando pelo checkpoint. O PROGRESS.md vira o histórico vivo do projeto e permite retomar em qualquer sessão sem perder contexto.
