# Contas de teste — On Education

Acessos fake para testar os planos e o portal do responsável.
**Não são contas reais; não use em produção com dados reais.** Não inclui o super-admin.

App: https://on-education-seven.vercel.app

## Senha (todas as contas)

```
Teste@2026
```

## Login do app — /login

| Plano | E-mail | Tipo | Workspace |
|---|---|---|---|
| Free (professor) | `free@example.com` | individual | Demo Professor Free |
| Professor | `prof@example.com` | individual | Demo Professor |
| Professor Pro | `propro@example.com` | individual | Demo Professor Pro |
| Escola Starter | `starter@example.com` | organization | Demo Escola Starter |
| Escola Full | `full@example.com` | organization | Demo Escola Full |

Cada conta já vem com o plano ativo e o gating aplicado (o menu muda conforme o tier).

## Portal do responsável — /portal/login

| Papel | E-mail | Vínculo |
|---|---|---|
| Responsável | `responsavel@example.com` | Maria Souza, mãe de 2 alunos na **Escola Full** |

Dados de demonstração na Escola Full:
- Turma: **1º Ano A**
- Alunos: **Ana Beatriz Souza**, **Pedro Henrique Lima**
- Notas lançadas para a Ana (Prova 1 = 8,5; Trabalho = 9,0) e 1 falta (10/06/2026) — para o portal exibir notas e a notificação de falta.

## Como foram criadas

Script idempotente (`packages/db/seed-test-accounts.mjs`, removido após uso):
usuários no Supabase Auth via Admin API + tenant + membership + subscription
(plano) + entitlements semeados + medidor de tokens. Senha do portal com o mesmo
scrypt do app. Re-rodar apenas reaplica o estado (não duplica).

> Para recriar/resetar: rebuild o script a partir deste doc e do padrão de
> `provisioning.ts`. As variáveis vêm de `.env.local` (DATABASE_URL,
> SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
