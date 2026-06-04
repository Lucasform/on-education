# ADR 0005 — Estratégia de buckets no Supabase Storage

Data: 2026-06-04
Status: aceito

## Contexto

O app precisa guardar arquivos: logo da escola (branding) e, em seguida, materiais didáticos por turma/matéria (itens 3.1/3.3 do ROADMAP) e a base do RAG do EduON. O Supabase é compartilhado com outros apps pessoais (buckets `receipts`, `obra-gallery` já existem), então a nomenclatura precisa ser específica do On Education. Dados de aluno são sensíveis (LGPD/menores) e exigem o tratamento mais restritivo.

## Decisão

Dois buckets, separando branding de dado sensível:

- **`public-assets`** — público. Apenas branding (logo da escola). Leitura pública por URL direta (carrega rápido, sem signed URL, cacheável). Path por tenant: `<tenant_id>/...`.
- **`tenant-files`** — privado. Materiais e qualquer conteúdo ligado a aluno/turma. Sem leitura pública; acesso só por **signed URL gerada no servidor**. Path por tenant: `<tenant_id>/...`.

Escrita e leitura privada passam **sempre pelo servidor** (RSC / server actions) usando a `SUPABASE_SERVICE_ROLE_KEY`, que bypassa o RLS de Storage. A chave nunca chega ao browser (módulo `server-only` em `apps/web/src/server/storage.ts`).

Buckets nascem **sem policy** → clientes anon/authenticated não escrevem nem leem direto; só o service role (servidor). Isso já entrega o modelo desejado sem migration de policy: a autorização de negócio fica nas server actions, reusando o RBAC existente (`assertCan`).

## Consequências

- Logo é tratada como branding público (decisão consciente; não é PII).
- Todo material sensível fica atrás do servidor + signed URL com expiração; nenhuma URL pública de dado de aluno.
- O isolamento por tenant é garantido no servidor (path `<tenant_id>/` derivado de `ctx.tenantId`), não pelo RLS de Storage.
- **Requer `SUPABASE_SERVICE_ROLE_KEY` no ambiente de produção (Vercel)**, além do `.env.local`. Sem ela, o upload lança erro claro e o restante do app segue funcionando.
- Se no futuro quisermos upload direto do browser (sem passar pelo servidor), aí sim precisaremos de policies de Storage por path/tenant. Não é o caso agora.
