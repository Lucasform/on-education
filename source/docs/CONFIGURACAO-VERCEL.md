# Configuração de ambiente (Vercel) — Edu On Way

Guia para configurar as variáveis de ambiente do projeto em produção. O app já está no ar; estas
variáveis ligam recursos opcionais (vídeo do YouTube, e-mail, WhatsApp, chave de IA do professor).

> **Confira o status a qualquer momento** no painel: **Admin › Integrações**
> (`/admin/integracoes`). Ela lê as variáveis reais do deploy e mostra o que está verde e o que
> falta, sem expor os valores.

---

## Passo a passo (vale para qualquer variável)

1. Abra **Vercel › projeto `on-education` › Settings › Environment Variables**
   (https://vercel.com/lucas-carvalho-s-projects1/on-education/settings/environment-variables).
2. **Key**: o nome exato da variável (ex.: `YOUTUBE_API_KEY`). **Value**: o valor.
3. Marque os três ambientes: **Production**, **Preview** e **Development**.
4. **Save**.
5. **Deployments** › no último deploy, menu **⋯** › **Redeploy**. Uma variável nova só passa a
   valer depois de um novo deploy.
6. Confira em **Admin › Integrações**: a bolinha fica verde quando o deploy subir com a variável.

> Os valores ficam guardados (cifrados) na Vercel. Nunca commite chave em arquivo versionado; o
> `.env.local` é só para rodar localmente e está no `.gitignore`.

---

## Variáveis

### Essenciais (já configuradas — não mexer sem motivo)

| Variável | Para que serve |
|---|---|
| `DATABASE_URL` | Conexão com o Supabase. Sem ela o app não sobe. |
| `DEV_SESSION_SECRET` | Assina as sessões/login. |
| `ANTHROPIC_API_KEY` | WayOn (IA padrão, Claude): conteúdo, planos, ementa, correção. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Acesso ao Supabase. |
| `SUPER_ADMIN_EMAILS` | Quem entra no painel `/admin` (lista de e-mails). |

### Opcionais (ligam recursos)

| Variável | Libera | Onde obter |
|---|---|---|
| `YOUTUBE_API_KEY` | "📺 Vídeo sugerido" nos planos de aula. | Google Cloud › API **YouTube Data v3** › Chave de API. Cota grátis diária. |
| `APP_ENCRYPTION_KEY` | Mantém a **chave de IA do professor (BYOK)** salva entre deploys. | Valor forte e **estável** (ver abaixo). |
| `OPENAI_API_KEY` | Geração de imagem e BYOK com chave OpenAI. | platform.openai.com › API keys. |
| `RESEND_API_KEY` | E-mail (comunicados, relatório do aluno). | resend.com › API Keys. Domínio `onwaytech.com.br` já verificado. |
| `EVOLUTION_API_URL` + `EVOLUTION_API_KEY` | WhatsApp (inbox e envio). | Servidor Evolution (Railway). |

---

## `APP_ENCRYPTION_KEY` (chave do professor — BYOK)

A BYOK (o professor pluga a própria chave de IA) **já funciona sem essa variável**: o código usa um
fallback. A `APP_ENCRYPTION_KEY` só serve para a chave salva **continuar válida entre deploys**.

- Qualquer texto forte serve (o código deriva uma chave AES-256-GCM por SHA-256).
- Use um valor **estável**: trocar depois invalida as chaves já salvas.
- O banco é **compartilhado** entre ambientes, então use **o mesmo valor** localmente e na Vercel.

Valor gerado para este projeto (cole na Vercel como `APP_ENCRYPTION_KEY`):

```
cd8271f57f1fa122a93dc20524fcbd5c98ee902385a0faff90f49dbb7e49451a
```

Para gerar um novo (se um dia precisar rotacionar):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Testar a BYOK:** no app, **Meu padrão › "Sua própria IA"** › cole a chave (OpenAI, Gemini ou
Claude) › **Testar**. Se passar, o tenant passa a usar os tokens dele.

---

## Como testar cada recurso depois de configurar

- **YouTube:** gere um plano de aula em **Sala de aula › Planejamento**. Deve aparecer
  "📺 Vídeo sugerido" no fim do plano.
- **BYOK:** **Meu padrão › Sua própria IA** › salvar e testar.
- **E-mail:** **Comunicados › E-mail a todos**, ou **ficha do aluno › Enviar por e-mail**.
- **WhatsApp:** **Comunicação › WhatsApp › Inbox**.

Em caso de dúvida sobre o que está ligado, **Admin › Integrações** é a fonte da verdade.
