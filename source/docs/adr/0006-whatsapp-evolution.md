# ADR 0006 — WhatsApp via Evolution API (não oficial)

Data: 2026-06-04
Status: aceito

## Contexto

O produto precisa que cada escola/professor **conecte o próprio número de WhatsApp** e use o canal para comunicação (comunicados, mensagens, inbox). O blueprint que já funciona em produção no **OnWay Condomínio** usa a **Evolution API** (servidor único no Railway, uma instância por tenant, conexão por **QR code**). A experiência "escaneie o QR e conecte seu número" é inerente a esse modelo não oficial (Baileys).

A regra original do `CLAUDE.md` era "WhatsApp só via API Oficial (Cloud API), nunca biblioteca não oficial". A Cloud API **não** oferece o fluxo de QR/conectar-seu-número: exige WABA + verificação da Meta (Embedded Signup por número), onboarding bem mais pesado.

## Decisão

Adotar a **Evolution API** no Education, reusando o blueprint do Condomínio, **adaptado** para a stack do Education (Next.js: route handlers + server actions, no lugar de Supabase Edge Functions).

- **Servidor Evolution único** (env `EVOLUTION_API_URL` + `EVOLUTION_API_KEY`), o mesmo do Condomínio. Instâncias namespeadas por produto: Education usa `edu_<tenantId>` (Condomínio usa `condo_<id>`), sem colisão.
- **Uma instância por tenant**; estado em `whatsapp_connections` (schema `on_education`, RLS por tenant).
- Endpoints Evolution: `POST /instance/create`, `GET /instance/connect/{inst}` (QR), `GET /instance/connectionState/{inst}` (status), `DELETE /instance/logout/{inst}`, `DELETE /instance/delete/{inst}`, `POST /message/sendText/{inst}`, `POST /webhook/set/{inst}`.
- Override explícito da regra original no `CLAUDE.md`.

## Consequências

- **Risco de ToS/ban da Meta** (uso não oficial): aceito conscientemente pelo Lucas. Mitigações: número da própria escola (não da plataforma), envio moderado, sem spam.
- Cada tenant conecta seu número por QR (UX desejada), sem onboarding da Meta.
- Segredos `EVOLUTION_API_URL`/`EVOLUTION_API_KEY` no `.env.local` + Vercel (server-only; nunca no client).
- O webhook de recebimento aponta para uma rota da Vercel do Education (Fase 3 do inbox).
- Migração futura para Cloud API oficial fica possível trocando o "provider" (a camada de envio já isola isso), se um dia o risco de ban incomodar.
