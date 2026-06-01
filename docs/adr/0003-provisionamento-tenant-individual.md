# ADR 0003 — Provisionamento do tenant individual e enforcement de entitlement

- **Status:** aceito
- **Data:** 2026-06-01
- **Fase:** 1B.1 (Núcleo individual)

## Contexto

O signup self-service do professor autônomo (Master Spec §3.1, §3.5) precisa criar um tenant
`individual` completo e funcional no primeiro uso. Isso esbarra num dilema de RLS: criar o
tenant e suas primeiras linhas acontece **antes** de existir `app.tenant_id` na sessão.

## Decisão

- **Provisionamento é operação administrativa**, executada via `client.db` direta (papel de
  serviço, server-only) numa única transação: cria `tenants` → `memberships` (owner + teacher,
  pois no individual o owner acumula teacher) → `subscriptions` (`teacher_free`) → `entitlements`
  semeados do catálogo do plano → `usage_meters` (`ai_tokens` do período corrente). Nunca exposto ao client.
- **Operações de produto** (turmas/alunos) usam `withTenant` + **checagem tripla**: `assertCan`
  (RBAC) + `assertEntitled` (lê o plano ativo e confronta com o catálogo) + RLS (banco).
- **Cota por plano** no freemium: `createStudent` confere `limitFor(plan, 'students')`
  (-1/undefined = ilimitado) antes de inserir.
- **Fronteira de módulo:** a lógica vive em `@on-education/module-nucleo`, consumindo só os
  contratos públicos de `db`, `auth`, `entitlements`, `validation` (Master Spec §13).

## Consequências

- A separação de papéis do banco fica explícita: o papel de serviço (provisionamento/migrations)
  pode bypassar RLS; o papel de aplicação (ops de produto) é sujeito ao RLS. Em produção devem ser
  papéis distintos sobre a mesma conexão lógica.
- Pendências até haver `DATABASE_URL`/Supabase: wiring do provedor de auth real (Supabase Auth)
  ao signup, a UI do fluxo, e a execução dos testes de integração (hoje pulados).
- Medição de tokens de IA por tenant já tem o medidor criado; o consumo será incrementado quando
  o módulo de IA (1B.2) existir.
