# Migrations — processo seguro

> Contexto: o deploy no Vercel roda **apenas o build** (não aplica migrations). Aplicar o
> schema é um passo **manual e intencional**. Isto é proposital: uma migration que falhe num
> passo de build bloquearia todos os deploys. Migration é decisão de operação, não de build.

## Como o tracking funciona

O journal fica em `drizzle_oe.__drizzle_migrations` (schema isolado deste produto, não no
`drizzle` padrão). `drizzle-kit migrate` decide o que aplicar comparando o hash de cada
arquivo `.sql` com o que já está no journal.

## Fluxo padrão (novas migrations)

1. Alterar `src/schema.ts`.
2. Gerar a migration: `pnpm db:generate` (cria o `.sql` em `drizzle/` + atualiza o journal local).
3. Revisar o `.sql` gerado.
4. Aplicar em produção com a URL do banco no ambiente:

   ```sh
   DATABASE_URL="postgresql://...pooler.supabase.com:5432/postgres" pnpm db:migrate
   ```

   (drizzle-kit lê `DATABASE_URL` do ambiente; `.env.local` não é carregado automaticamente
   por ele — passe a variável explicitamente.)

5. Confirmar no banco que as colunas/tabelas existem antes de considerar feito.

## Regra de ouro: migrations idempotentes

Escreva DDL idempotente sempre que possível:

- Colunas: `ADD COLUMN IF NOT EXISTS`
- Enums: `ADD VALUE IF NOT EXISTS`
- Tabelas novas: `CREATE TABLE IF NOT EXISTS`

Assim, mesmo que o journal e o banco divirjam (drift), reaplicar é seguro.

## Drift de journal (o que quebrou produção em jun/2026)

Sintoma: `drizzle-kit migrate` diz "sucesso" mas o schema do banco não reflete a migration
(o journal marcou como aplicada sem rodar o DDL). Aí o app quebra com "coluna não existe",
que as páginas mascaram como lista vazia.

Diagnóstico: comparar `information_schema.columns` do schema `on_education` com o esperado
em `src/schema.ts`. Correção: como as migrations são idempotentes, aplicar o `.sql` direto
resolve. **Antes de culpar o código da aplicação, verifique o schema real do banco.**

## Antes de culpar o app

Erro genérico em várias telas quase sempre é schema desatualizado, não bug de React. Cheque
o banco primeiro.
