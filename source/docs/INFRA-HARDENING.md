# Hardening de Infra — Edu On Way

Referência: comparação com a infra AWS do Catalisa e o que aplicamos para fortalecer o backend,
sem trocar o stack (seguimos em Supabase + Vercel, serverless).

## Catalisa (AWS) x Nós (Supabase + Vercel)

| Prática Catalisa | Nosso equivalente | Situação |
|---|---|---|
| API em subnet privada, sem IP público (Cloudflare Tunnel) | Serverless (Vercel): não há servidor persistente exposto | Resolvido por design. |
| RDS PostgreSQL privado | Supabase Postgres + RLS; acesso por connection string | Reforçar: Network Restrictions + SSL enforce (painel). |
| Segredos em SSM/Secrets Manager + KMS, nada em código | Env vars no Vercel (criptografadas) + `.env`/`Credenciais/` no gitignore | Reforçado: secret scan (gitleaks) no CI. |
| S3 privado para documentos | Supabase Storage (buckets públicos p/ assets; sensíveis privados) | Auditar buckets sensíveis + signed URL. |
| CI/CD OIDC (sem chave estática), snapshot RDS antes do deploy, trava DEPLOY-PROD | Vercel (deploy pela integração GitHub, sem chave estática no repo) | Reforçado: CI real na raiz + gate de migration. |
| Single-AZ, 1 instância, ~R$280-350/mês | Serverless + Supabase, escala automática | Custo menor; nada a copiar. |

## O que foi aplicado (código, aditivo)

- **CI de verdade na raiz do repo** (`.github/workflows/ci.yml`, `working-directory: source`). Antes o
  workflow estava em `source/.github/` e o GitHub não executava; agora lint, typecheck, testes e build
  rodam em cada push e PR. Os 14 testes viram gate real.
- **Secret scan (gitleaks) + `pnpm audit`** em `.github/workflows/security.yml`. Garante o padrão
  "nada em código" e monitora supply chain.
- **Dependabot** (`.github/dependabot.yml`): atualização semanal de dependências (agrupada em
  minor/patch) e das actions.

## O que depende do painel (você liga, sem tocar no que funciona)

### Supabase (equivale ao "RDS privado")
1. **Network Restrictions:** restringir o acesso ao banco às faixas necessárias (egress do Vercel)
   em Project Settings > Database > Network Restrictions. Sem isso, o banco aceita conexão de
   qualquer IP que tenha a connection string.
2. **SSL enforce:** exigir conexão TLS (Project Settings > Database).
3. **PITR / Backups:** ligar Point-in-Time Recovery (plano Pro). Equivale ao "snapshot antes do
   deploy" do Catalisa; permite voltar o banco a um instante anterior a uma migration ruim.

### Storage (equivale ao "S3 privado")
4. Conferir que buckets com documento sensível são **privados** e servidos por **signed URL**. Assets
   públicos (logo, imagem gerada) podem seguir públicos.

### RLS
5. **FORCE ROW LEVEL SECURITY** nas tabelas de tenant: hoje o RLS se aplica à conexão da aplicação,
   mas o dono da tabela (conexão de serviço) faz bypass. Ligar FORCE fecha isso. Precisa de janela
   testada, pois afeta a conexão de serviço usada por operações de sistema (cron, portais por token).

## Gate de migration (equivale ao "snapshot RDS + trava DEPLOY-PROD")

Antes de aplicar mudança de schema em produção:
1. Confirmar backup/PITR recente.
2. Revisar a migration: destrutiva? `NOT NULL` sem default? índice sem `CONCURRENTLY`? (ver skill
   `db-migration-review`).
3. Aplicar de forma idempotente (`CREATE ... IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).
4. Índices em tabela grande sempre com `CREATE INDEX CONCURRENTLY` (já é o padrão aqui).

## O que NÃO copiamos (de propósito)

Subnet privada, Cloudflare Tunnel, EC2 e o custo mensal fixo não fazem sentido no serverless: não há
servidor de longa duração para esconder, e o modelo escala e cobra por uso. O ganho de segurança do
Catalisa que importa para nós é a **disciplina** (CI real, segredos fora do código, backup antes de
migration, banco não exposto), não o hardware.
