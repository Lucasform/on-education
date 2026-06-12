# ADR 0002 — Tenancy e isolamento por RLS

- **Status:** aceito
- **Data:** 2026-06-01
- **Fase:** 0 (Fundação)

## Contexto

O produto trafega dados de menores e precisa de isolamento multi-tenant inquebrável, válido
igualmente para escolas (`organization`) e professores autônomos (`individual`). A LGPD e o
Master Spec (§3, §4.3, §7) exigem isolamento como linha de defesa principal, não como detalhe.

## Decisão

- **Estratégia:** _shared database, shared schema_ com `tenant_id` em toda tabela de domínio
  e **Row Level Security (RLS)** habilitado em todas elas.
- **Predicado de isolamento:** `tenant_id = current_setting('app.tenant_id', true)::uuid`.
  O `, true` faz sessão sem tenant setado enxergar **zero linhas** (default seguro) em vez de erro.
- **`tenant_id` vem SEMPRE da sessão**, nunca de parâmetro do client. O client de banco
  (`packages/db`) expõe `withTenant(tenantId, fn)`, que abre transação e faz
  `set_config('app.tenant_id', ..., true)` antes de executar — é o único caminho de dados tenant-scoped.
- **`tenant_type`** (`organization`/`individual`) é coluna da tabela `tenants`; combinado com
  os **entitlements** (`packages/entitlements`) decide o que é exposto. O gate é o entitlement,
  nunca `if` solto por segmento.
- **`users` é identidade global**; o vínculo tenant↔user é `memberships` (tenant-scoped + RLS).
- **Checagem tripla:** RLS (banco) + policy/RBAC (app, `packages/auth`) + entitlement (comercial).

## Consequências

- Teste anti-vazamento (`packages/db`) prova o isolamento, inclusive cross-segmento, sob um
  papel restrito (não-owner, não-superuser) com `SET LOCAL ROLE`. Requer `DATABASE_URL`;
  sem ele, é pulado (sinalizado como pendência até termos um Postgres de teste).
- O papel de aplicação no banco **não pode** ter `BYPASSRLS`; o service-role (que bypassa) fica
  restrito a operações administrativas/migrations.
- Migrations geradas pelo drizzle-kit já incluem `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY`.
