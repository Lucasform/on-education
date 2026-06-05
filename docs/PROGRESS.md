# PROGRESS — Histórico vivo do projeto

> O Claude Code lê este arquivo no início de cada sessão para saber onde paramos, e adiciona uma nova entrada no TOPO do log ao fechar cada tarefa (checkpoint obrigatório — ver CLAUDE.md §5).
> Mais recente em cima. Não apagar entradas antigas.

## Estado atual (resumo de uma linha)

> Atualize esta linha a cada checkpoint.

**Fase atual:** 🚀 EM PRODUÇÃO · **Console de admin redesenhado 2026-06-04** (overview + sidebar + /admin/contas + detalhe por escola; acesso ao app via "Entrar como"). · **Storage ATIVADO 2026-06-04** (ADR 0005, 2 buckets): Fatia 1 = upload da logo entregue; falta `SUPABASE_SERVICE_ROLE_KEY` no Vercel; próximo = Fatia 2 materiais (3.1/3.3) → depois RAG no EduON. · **Frente Qualidade ("melhor versão") ENCERRADA 2026-06-04**: entregue o que tem ROI real — Q1 (feedback de submit, 35 telas) + Q2 (`<KpiCard>`) em prod; Q6 (empty states já consistentes + fix lixeira) e Q8 (loading global já cobre tudo) confirmados; Q5 (PageHeader) já amplo; Q3/Q4/Q7 deferidos por baixo ROI (tabelas/forms heterogêneos; aria-label cosmético). RBAC já estava plugado (assertCan na camada de serviço — falso positivo da auditoria). · Sequência autônoma 2026-06-03: vínculos prof. (17), faltas/matéria + doc PDF (8/8.1/8.2/9.1), import CSV, menu enxuto (18 parcial), matérias da turma + série/idade (3/3.2), vínculo responsável (4/5), notas participação/anotação (9), cronograma (7), quadro de funcionários (1 parcial), Meu padrão EduON (18.3), painel da escola + gráficos (14/15 parcial), PWA + nav mobile (16). · **Status:** EM ANDAMENTO · **Próximo passo (nova sessão):** itens que dependem do Lucas — Storage (materiais 3.1/3.3 + RAG 11.2-11.4), Stripe (billing), WhatsApp Cloud API; e BNCC (dados). Restantes sem credencial: plano de aulas (7.1), mural dos pais (12), banco coletivo (13). Prod: https://on-education-seven.vercel.app

---

## Log de checkpoints

### [2026-06-05 01:00] — WhatsApp Fase 3: inbox (webhook + receber/responder) — STATUS: CONCLUÍDO

- **Tarefa:** receber e responder mensagens dentro do app (estilo Condomínio).
- **O que foi feito:**
  - Tabelas **`whatsapp_conversations`** + **`whatsapp_messages`** (migration `0024`, RLS) — **aplicadas em prod**.
  - **Webhook público** `app/api/whatsapp/webhook` (valida `?secret=` contra `whatsapp_connections.webhook_secret`, parser do payload Evolution igual ao Condomínio: `data.key.remoteJid`/`message.conversation`/`fromMe`/`pushName`) → grava conversa (upsert por telefone) + mensagem recebida + bump de não-lidas. A rota de connect já registra esse webhook.
  - **Módulo** `nucleo/whatsapp-inbox.ts`: lado webhook (admin, sem RLS, por `tenantId`) e lado UI (`withTenant` + RBAC `communication`): list/get conversa, mensagens, marcar lida, registrar enviada.
  - **UI:** `/app/whatsapp/inbox` (lista de conversas + badge de não-lidas) e `/app/whatsapp/inbox/[id]` (thread com bolhas in/out + responder). `replyWhatsappAction` envia no Evolution e registra a saída. Abrir a conversa marca como lida. Itens de nav: WhatsApp + Inbox WhatsApp.
- **Arquivos:** `packages/db/src/schema.ts` (+`drizzle/0024_whatsapp_inbox.sql`), `packages/modules/nucleo/src/{whatsapp-inbox.ts,index.ts}`, `apps/web/src/app/api/whatsapp/webhook/route.ts`, `apps/web/src/app/app/whatsapp/inbox/*`, `apps/web/src/app/app/actions.ts`, `apps/web/src/lib/nav.ts`.
- **Migrations/RLS:** `0024_whatsapp_inbox` — aplicada em prod.
- **Testes:** `tsc` + `eslint` + `next build` verdes (rotas webhook + inbox geradas).
- **Pendências:** sem realtime (precisa recarregar o thread pra ver novas; polling/realtime depois). Webhook só funciona em prod com a URL pública (Vercel) + `EVOLUTION_*` no Vercel. **Epic WhatsApp (Fases 1-3) COMPLETO.**
- **Próximo passo sugerido:** **responsividade das páginas** (pedido recorrente do Lucas); ou realtime no inbox.
- **Commit(s):** ver `feat: whatsapp fase 3 (inbox: webhook + receber/responder)`.

### [2026-06-05 00:10] — WhatsApp Fase 2: envio + ajustes de texto — STATUS: CONCLUÍDO

- **Tarefa:** enviar pelo WhatsApp. Regra do Lucas: **individual ok; lote só com alerta de ban**.
- **O que foi feito:**
  - **Envio individual** (sem risco): em **Mensagens**, checkbox "Enviar também no WhatsApp do responsável" (só aparece se o canal está conectado) → manda a mensagem pro telefone do responsável.
  - **Envio em lote** (com alerta): em **Comunicados**, botão "WhatsApp a todos" nos publicados, atrás de `ConfirmButton` que **avisa do risco de ban da Meta**. Envio **sequencial** (sem paralelizar) pra reduzir risco.
  - Helper `sendWhatsappText` em `actions.ts` (checa canal ativo + `evoSendText`); `broadcastComunicadoWhatsappAction` (lote sequencial).
  - **Ajustes de texto:** "workspace" → "área de trabalho" (login/cadastro); papéis em pt-BR — novo `lib/roles.ts` (`roleLabel`/`STAFF_ROLES`/`inviteStatusLabel`) aplicado em **Convites** (mostrava `director`/`teacher` crus e o select em inglês).
- **Arquivos:** `app/app/actions.ts`, `app/app/mensagens/page.tsx`, `app/app/comunicados/page.tsx`, `app/app/escola/convites/page.tsx`, `lib/roles.ts` (novo), `app/login/page.tsx`, `app/signup/page.tsx`.
- **Migrations/RLS:** não. **Testes:** `tsc` + `eslint` + `next build` verdes.
- **Pendências:** **Fase 3 — inbox** (webhook + receber/responder). Envio depende da `SUPABASE_SERVICE_ROLE_KEY` e do canal conectado (e `EVOLUTION_*` no Vercel). Responsividade das páginas (pedido do Lucas) ainda a melhorar. Replicar `roleLabel` em outras telas se aparecer papel cru.
- **Próximo passo sugerido:** Fase 3 (inbox) OU atacar a responsividade.
- **Commit(s):** ver `feat: whatsapp fase 2 (envio individual + lote com alerta) + textos pt-br`.

### [2026-06-04 23:30] — WhatsApp Fase 1: conexão (Evolution API, QR self-service) — STATUS: CONCLUÍDO

- **Tarefa:** "coisa grande" — escola/professor conecta o próprio WhatsApp e usa pra comunicação. Decisão do Lucas: **Evolution API** (igual OnWay Condomínio), usando as edge functions do Condomínio como base, adaptadas pro Next.js.
- **Governança:** **ADR 0006** + regra do `CLAUDE.md` atualizada (override consciente do "só Cloud API oficial"; risco de ToS/ban aceito).
- **O que foi feito (Fase 1 = CONECTAR):**
  - Tabela **`whatsapp_connections`** (migration `0023`, RLS por tenant, 1 linha/tenant) — `instance_id`, `provider`, `webhook_secret`, `phone`, `active`. **Aplicada em prod.**
  - **Módulo** `module-nucleo/whatsapp.ts` (get/upsert/setState, RBAC `tenant_settings`).
  - **Helper Evolution** server-only `server/whatsapp.ts` (ensureInstance/setWebhook/connect/state/logout/sendText, instância `edu_<tenant>`, normalizePhone) — endpoints idênticos ao Condomínio.
  - **Rotas** `app/api/whatsapp/{connect,status,logout}` (connect cria instância + webhook + devolve QR; status p/ polling; logout).
  - **UI** `<WhatsappConnect>` (QR + polling 4s até abrir, mostra número, Desconectar) na página `/app/whatsapp`; item de nav real (era "em breve").
  - **Env:** `EVOLUTION_API_URL`/`EVOLUTION_API_KEY` (servidor compartilhado com o Condomínio) no `.env.local` + `.env.example`.
- **Arquivos:** `packages/db/src/schema.ts` (+`drizzle/0023_whatsapp_connections.sql`), `packages/modules/nucleo/src/{whatsapp.ts,index.ts}`, `apps/web/src/server/whatsapp.ts`, `apps/web/src/app/api/whatsapp/*`, `apps/web/src/components/whatsapp-connect.tsx`, `apps/web/src/app/app/whatsapp/page.tsx`, `apps/web/src/lib/nav.ts`, `CLAUDE.md`, `docs/adr/0006-whatsapp-evolution.md`.
- **Migrations/RLS:** `0023_whatsapp_connections` — aplicada em prod.
- **Testes:** `tsc` + `eslint` + `next build` verdes.
- **Pendências / bloqueios:** **`EVOLUTION_API_URL`/`EVOLUTION_API_KEY` precisam ir pro Vercel** (senão a conexão não funciona em prod). Webhook (Fase 3) ainda não implementado. Conexão via professor (individual) só pela URL por enquanto (nav é org).
- **Próximo passo sugerido:** **Fase 2 — enviar** (comunicados/mensagens → WhatsApp do responsável); depois **Fase 3 — inbox** (webhook + conversas).
- **Commit(s):** ver `feat: whatsapp fase 1 (conexao via evolution + qr)`.

### [2026-06-04 22:30] — Storage Fatia 2: materiais didáticos por turma — STATUS: CONCLUÍDO

- **Tarefa:** upload/listagem/download de materiais por turma (itens 3.1/3.3), no bucket PRIVADO. Destrava (junto da Fatia 3) o WayOn ler o material da escola.
- **Segmento:** 🏫👤 (turma serve escola e professor).
- **O que foi feito:**
  - **Tabela `materials`** (migration `0022`, RLS + policy de tenant + índices) — `class_id`, `subject?`, `title`, `storage_path`, `file_name`, `mime_type?`, `size_bytes?`. **Migration aplicada em prod.**
  - **RBAC:** recurso `material` em `TEACHING_RESOURCES` (professor e gestão criam/excluem).
  - **Módulo** `module-pedagogico/materials.ts`: `createMaterial`/`listMaterials`/`deleteMaterial` (withTenant + assertCan; delete devolve o path p/ remover o arquivo).
  - **Storage** (`server/storage.ts`): `uploadTenantFile` (bucket privado `tenant-files`, path `<tenant>/<turma>/<ts>-<nome>`, máx 25MB), `signedUrlForTenantFile` (URL temporária 1h), `removeTenantFile`.
  - **Actions:** `uploadMaterialAction` (sobe + grava metadados), `deleteMaterialAction` (apaga linha + arquivo).
  - **UI:** seção "Materiais da turma" em `/app/turmas/[id]` — lista com download por **signed URL** (link expira), tamanho/matéria, excluir; form de upload (título/matéria opcionais + arquivo).
- **Arquivos:** `packages/db/src/schema.ts` (+`drizzle/0022_materials.sql`), `packages/auth/src/rbac.ts`, `packages/modules/pedagogico/src/{materials.ts,index.ts}`, `apps/web/src/server/storage.ts`, `apps/web/src/app/app/actions.ts`, `apps/web/src/app/app/turmas/[id]/page.tsx`.
- **Migrations/RLS:** `0022_materials` (RLS + policy de tenant) — **aplicada em prod**.
- **Decisões (ADR?):** segue ADR 0005 (2 buckets); materiais no privado `tenant-files`.
- **Testes:** `tsc` + `eslint` + `next build` verdes. (Upload real em prod a validar pelo Lucas; depende da `SUPABASE_SERVICE_ROLE_KEY` certa no Vercel.)
- **Pendências:** **Fatia 3 — WayOn ler o material (RAG)**; e gerar Word/seguir template de PDF da escola.
- **Próximo passo sugerido:** a "coisa grande e importante" que o Lucas mencionou; depois Fatia 3.
- **Commit(s):** ver `feat: storage fatia 2 (materiais por turma)`.

### [2026-06-04 21:30] — Melhorar recursos (telas internas): drill-down no Quadro — STATUS: CONCLUÍDO (1ª tela)

- **Tarefa:** "melhorar os recursos" = telas internas com drill-down (contagem → lista → membro → detalhe). Lucas apontou o Quadro de funcionários (membros apareciam mas não abriam).
- **O que foi feito:** cada membro do quadro virou link (com chevron "›") para `/app/escola/quadro/[id]`; nova página de detalhe do membro (função, e-mail, vínculos de aula por turma/matéria, atalho p/ gerenciar). Padrão a replicar em outras telas conforme o Lucas apontar.
- **Arquivos:** `app/app/escola/quadro/page.tsx`, `app/app/escola/quadro/[id]/page.tsx` (novo).
- **Migrations/RLS:** não. **Testes:** `tsc`/`eslint`/`build` verdes.
- **Decisão de ordem:** a tabela `materials` (Storage Fatia 2) está solta no `schema.ts`; pra não gerar migration meia-boca, a ordem passa a ser **Fatia 2 primeiro** (fecha `materials`) → depois **nome do agente personalizável** (migration limpa).
- **Pendências:** Storage Fatia 2 (próxima), nome do agente personalizável, replicar drill-down em mais telas.
- **Commit(s):** `feat: drill-down no quadro de funcionarios`.

### [2026-06-04 21:10] — Segurança (impersonação) + performance de navegação — STATUS: CONCLUÍDO

- **🔴 Falha de segurança corrigida:** o cookie `oe_admin_tenant` era confiado SEM verificar se a sessão real é super-admin — qualquer um podia forjá-lo e ver/editar qualquer escola (quebra do isolamento multi-tenant/LGPD). Agora `getAuthContext` só honra a impersonação se `getSuperAdminEmail()` (allowlist) confirmar; senão ignora o cookie. Testado: cookie sem sessão admin → 307 /login (antes: 200).
- **⚡ Performance:** a app fazia 2 validações de auth na REDE por navegação (middleware + página). (1) `getAuthContext`/`getSuperAdminEmail` trocaram `getUser()` (rede) por `getSession()` (lê o JWT local; o middleware mantém a sessão fresca). (2) Middleware pula o `getUser()` quando não há cookie de sessão (anônimo/landing/prefetch). Menos ida à rede por clique.
- **Contexto:** Lucas comparou com o OnWay Condomínio (SPA Vite, navegação no cliente = instantânea); este é Next SSR com `force-dynamic` + Supabase free, daí a diferença. Cortamos round-trips; SPA-like total exigiria mudança de arquitetura.
- **Arquivos:** `apps/web/src/server/session.ts`, `apps/web/src/middleware.ts`.
- **Testes:** `tsc` + `next build` verdes; smoke com `next start`: impersonação forjada bloqueada, landing 200.
- **Pendências (pedidas pelo Lucas, nesta ordem):** Storage Fatia 2 (materiais) "faça"; nome do agente personalizável "aplique"; "melhorar os recursos" (definir escopo).
- **Commit(s):** ver `fix: gate de super-admin na impersonacao + reduz auth na rede por navegacao`.

### [2026-06-04 20:40] — Rebrand: plataforma "Edu On Way" + agente "WayOn" — STATUS: CONCLUÍDO

- **Decisão do Lucas:** plataforma "On Way Education" → **Edu On Way**; agente "EduON" → **WayOn** (Way + On, amarra com On Way). Nome do agente personalizável por escola/prof segue no backlog.
- **O que foi feito:** replace global `EduON`→`WayOn` (texto + componente + nomes de função `generate*WithWayOn`, defs e imports juntos; 20 arquivos) e `On Way Education`/`On Way Edu`→`Edu On Way` (51 arquivos: títulos, metadata, manifest, marca na landing/shells/auth). Componente da marca renderiza `Way` + `On` (On em destaque).
- **NÃO mexido (interno, de propósito):** scope npm `@on-education/*` e schema Postgres `on_education` (não aparecem pro usuário; renomear = churn/risco sem ganho).
- **Testes:** `tsc` + `next build` verdes.
- **Pendências:** "melhorar os recursos"; Storage Fatia 2 (PAUSADA — `materials` no `schema.ts`, fora do commit).
- **Commit(s):** ver `chore: rebrand para Edu On Way + agente WayOn`.

### [2026-06-04 20:10] — Fix: impersonação não cai mais pro /admin a cada clique — STATUS: CONCLUÍDO

- **Bug:** logado como escola (admin), qualquer clique voltava pro /admin (ou /login). Reproduzido rodando o build local: com `DATABASE_URL` ausente/instável, `getAuthContext` (que consultava o banco a CADA navegação para descobrir o tipo do tenant) caía no `catch → null`, e o dashboard/layout então redirecionava.
- **Causa raiz:** a impersonação dependia de uma query ao banco por requisição (`resolveContextForTenant`). Qualquer soluço transitório do Supabase derrubava o contexto e expulsava o admin.
- **Fix (determinístico):** o cookie de view-as passa a guardar `tenantId|tenantType`; `getAuthContext` monta o contexto com `adminTenantContext(...)` **sem ir ao banco**. Fallback p/ cookies antigos (só id) via `resolveContextForTenant`. Verificado local: todas as rotas do app retornam 200 com o cookie novo (e a auth nem depende mais de DB).
- **Arquivos:** `packages/modules/nucleo/src/context.ts` (novo `adminTenantContext`), `apps/web/src/server/session.ts`, `app/admin/actions.ts` (grava `id|tipo`), `app/admin/{page,contas/page,contas/[id]/page}.tsx` (hidden `tenantType` no form Entrar como).
- **Testes:** `tsc` + `next build` verdes; teste de fumaça com `next start` local (cookie novo → 200 em /app, /app/turmas, /app/alunos, /app/escola/personalizacao).
- **Pendências:** naming do projeto/agente (Lucas vai escolher); "melhorar os recursos"; Storage Fatia 2 (PAUSADA).
- **Commit(s):** ver `fix: impersonacao sem consulta ao banco (cookie guarda tipo)`.

### [2026-06-04 19:20] — Login exclusivo de admin + aviso global de impersonação — STATUS: CONCLUÍDO

- **Tarefa:** Lucas pediu página de login exclusiva pro admin; ao logar, poder "entrar como" uma escola (já existia) e ver/editar como ela; e que fique claro em TODA tela que está em modo admin.
- **O que foi feito:**
  - **`/admin-login`** (novo, fora do guard do /admin): login exclusivo do super-admin (AuthShell + ícone Shield). `adminLoginAction` checa a allowlist `SUPER_ADMIN_EMAILS` ANTES de autenticar e só então entra; e-mail fora da lista → `?erro=naoadmin`. Sem signup.
  - Guard do `/admin` agora manda quem não é admin para `/admin-login` (antes ia pro `/login`).
  - **Banner global de impersonação** no `app/app/layout.tsx`: em todas as telas do app, quando o admin está "entrando como", mostra uma faixa (cor `warning`) "Modo admin. Você está vendo e editando como <Escola>" + botão Sair do modo admin. Nome do tenant via `getPublicTenantBrand`.
  - Removido o banner duplicado que só aparecia no dashboard (`app/app/page.tsx`).
  - Impersonação em si (entrar/editar/sair) já existia e segue: `enterTenantAction` (cookie) + `exitImpersonationAction`.
- **Arquivos:** `app/admin-login/{page,actions}.ts(x)` (novos), `app/app/layout.tsx`, `app/app/page.tsx`, `app/admin/layout.tsx`.
- **Testes:** `tsc` + `eslint` + `next build` verdes (rota `/admin-login` gerada).
- **Pendências:** "melhorar os recursos" (pedido do Lucas) ainda em aberto — aguardando ele dizer se é a seção Recursos da landing ou outra coisa. **Storage Fatia 2 ainda PAUSADA**.
- **Próximo passo sugerido:** esclarecer "recursos" e melhorar; depois retomar Fatia 2.
- **Commit(s):** ver `feat: login exclusivo de admin + aviso global de modo admin`.

### [2026-06-04 18:45] — Paleta Índigo+menta + landing no estilo edtech — STATUS: CONCLUÍDO

- **Tarefa:** Lucas não curtiu o degradê roxo→dourado e mandou referências (Plurall/SAE/Eduall/EAD), pedindo "cores mais legais e úteis + refazer o UI" e que gosta de como elas mostram benefícios/planos. Escolheu a direção **Índigo + menta**.
- **O que foi feito (3 commits):**
  - **Tirou o degradê:** todos os `from-primary to-brand-2` viraram cor sólida (`bg-primary`/`text-primary`); selos, banners, badges e realces (`refactor: remove degrade`).
  - **Paleta Índigo + menta:** tokens light/dark refeitos (índigo primary, neutros frios slate) + **cores semânticas** `--success/--warning/--danger/--info` (tokens + cores Tailwind), úteis para padronizar estados; removido o token `brand-2`.
  - **Landing reforçada** (estilo edtech, sem inventar número falso pois somos novos): recursos em **grid de 6 cards**, seção **"Como funciona" (3 passos)**, seção **Para professores / Para escolas**, **FAQ** (4 perguntas com `<details>`). Planos (PricingCards) mantidos.
- **Arquivos:** `app/globals.css`, `tailwind.config.ts`, `app/page.tsx`, e os 8 arquivos do de-gradê (admin/app/auth shells, pricing, landing, mural, app/page, atividades).
- **Testes:** `tsc` + `eslint` + `next build` verdes em cada etapa.
- **Pendências:** cores semânticas ainda não aplicadas nas telas (hoje usam emerald/amber/red inline; dá pra trocar por `text-success` etc. depois). Calibração fina é subjetiva (ver em prod). **Storage Fatia 2 ainda PAUSADA** (`schema.ts` com `materials`, não comitado).
- **Próximo passo sugerido:** ver em prod e calibrar; depois retomar Storage Fatia 2 ou trocar os estados inline pelas cores semânticas.
- **Commit(s):** `refactor: remove degrade...`, `feat: paleta indigo + menta...`, `feat: landing estilo edtech...`.

### [2026-06-04 18:00] — Identidade visual: roxo + baunilha quente (sai o rosa) — STATUS: CONCLUÍDO

- **Tarefa:** Lucas pediu nova identidade (paleta "Criatividade — roxo + baunilha quente") e sair do rosa; confirmou que o dark é bom mas pedia melhorias. Também perguntou se cada escola muda a paleta (resposta: sim, troca o destaque/--primary em `/app/escola/personalizacao`, presets em `tenant_settings.themeColor`).
- **O que foi feito:**
  - **Tokens** em `apps/web/src/app/globals.css`: **light** revamp = fundo baunilha (#F7F5FF) + cartões brancos + acento creme (#FBF3D0) + roxo profundo (#4C2C92); **dark** melhorado = charcoal arroxeado (no lugar do azul-slate), mais quente/coeso, primary roxo vibrante.
  - **`--brand-2`** (dourado #F5C842, "baunilha quente") virou token + cor Tailwind (`brand-2`); **substituiu o `fuchsia-500/600`** em 8 arquivos (gradientes/realces da marca). Sai o rosa.
  - Cor do PWA/barra do navegador alinhada ao novo dark (`#130f1f`) em `layout.tsx` + `manifest.ts`.
  - Destaque por escola intacto (sobrescreve só --primary/--ring).
- **Arquivos:** `app/globals.css`, `tailwind.config.ts`, `app/layout.tsx`, `app/manifest.ts`, `app/page.tsx`, `app/app/page.tsx`, `app/app/atividades/[id]/page.tsx`, `app/mural/[tenant]/page.tsx`, `components/{admin-shell,app-shell,auth-shell,pricing-cards}.tsx`.
- **Testes:** `tsc` + `next build` verdes.
- **Pendências:** ajuste fino dos tons depois de ver em prod (subjetivo). **Storage Fatia 2 segue PAUSADA** (tabela `materials` já no `schema.ts`, NÃO comitada/migrada).
- **Próximo passo sugerido:** ver em prod e calibrar; depois retomar Storage Fatia 2.
- **Commit(s):** ver `feat: identidade roxo + baunilha (remove fuchsia, melhora dark)`.

### [2026-06-04 17:20] — Admin: console (overview + sidebar + contas + detalhe por escola) — STATUS: CONCLUÍDO

- **Tarefa:** o `/admin` era uma página só (stats + tabela). Lucas pediu overview no início, acesso a todas as funcionalidades do app e logar nas escolas vendo os itens específicos. Escopo escolhido: **via "Entrar como"** (impersonação), sem visões globais cross-tenant.
- **Segmento:** super-admin do SaaS.
- **O que foi feito:**
  - **`AdminShell`** (`components/admin-shell.tsx`, client): sidebar (Visão geral / Contas) com item ativo + drawer mobile, header com e-mail do admin + ThemeToggle + Sair. `admin/layout.tsx` agora envolve tudo nele.
  - **Overview** (`/admin`): KPIs globais + "Últimas contas" (6) com "Entrar como" + atalhos (+Escola/+Professor/ver contas).
  - **Contas** (`/admin/contas`): tabela completa de gestão (entrar/excluir/restaurar/purge, toggle ativas/excluídas), movida da página antiga; nomes linkam pro detalhe.
  - **Detalhe da escola** (`/admin/contas/[id]`): KPIs específicos (membros/alunos/turmas/atividades) + equipe por papel + "Entrar como"/excluir/restaurar. Nova `getTenantDetail` em `module-nucleo/admin.ts`.
  - Impersonação já existia (cookie + `resolveContextForTenant`); ao entrar, o `/app` mostra "Sair do modo admin". Botões renomeados p/ "Entrar como" (mais claro).
- **Arquivos:** `components/admin-shell.tsx` (novo), `app/admin/{layout,page,loading}.tsx`, `app/admin/contas/page.tsx` (novo), `app/admin/contas/[id]/page.tsx` (novo), `packages/modules/nucleo/src/admin.ts` (getTenantDetail).
- **Migrations/RLS:** não (só leitura cross-tenant na conexão admin, como já era).
- **Testes:** `tsc` + `eslint` + `next build` verdes (rotas /admin, /admin/contas, /admin/contas/[id] geradas).
- **Pendências / bloqueios:** detalhe ainda não mostra plano/assinatura nem e-mails dos membros (auth é Supabase compartilhado) — dá pra enriquecer depois se quiser.
- **Credenciais/segredos necessários:** nenhum novo (admin já usa `SUPER_ADMIN_EMAILS`).
- **Próximo passo sugerido:** validar visualmente em prod; depois Storage Fatia 2 (materiais) ou enriquecer o detalhe (plano/membros).
- **Commit(s):** ver `feat: console de admin (overview + sidebar + contas + detalhe por escola)`.

### [2026-06-04 16:30] — Storage Fatia 1: upload da logo da escola — STATUS: CONCLUÍDO

- **Tarefa:** ativar o Supabase Storage (a `SUPABASE_SERVICE_ROLE_KEY` já estava no `.env.local`, então NÃO dependia do Lucas) e entregar a primeira fatia: upload da logo.
- **Segmento:** 🏫
- **Decisão de arquitetura (ADR 0005):** 2 buckets — `public-assets` (público, branding) + `tenant-files` (privado, materiais por signed URL). Escrita/leitura sempre pelo servidor via service role (bypassa RLS de Storage); buckets sem policy = anon/authenticated não acessam direto. Path por `<tenant_id>/`.
- **O que foi feito:**
  - Buckets criados no Supabase (script pontual idempotente, já removido): `public-assets` (público, limite 2MB, mimes de imagem) e `tenant-files` (privado, 25MB).
  - `apps/web/src/server/storage.ts` (`server-only`): client service-role lazy + `uploadPublicLogo(tenantId, file)` (valida tipo/tamanho, path `<tenant_id>/logo-<ts>.<ext>`, retorna URL pública).
  - `uploadLogoAction` em `actions.ts`: lê o arquivo, sobe e salva em `tenant_settings.logoUrl` via `upsertTenantSettings` (RBAC `assertCan(update, tenant_settings)` reusado).
  - `<LogoUpload>` (client): preview + file input que **auto-envia ao escolher** + `SubmitButton` de fallback. Ligado em `/app/escola/personalizacao` como card próprio (fora do form grande p/ não aninhar `<form>`); input de URL manual vira fallback.
- **Arquivos:** `server/storage.ts` (novo), `components/logo-upload.tsx` (novo), `app/app/actions.ts`, `app/app/escola/personalizacao/page.tsx`, `docs/adr/0005-storage-buckets.md` (novo).
- **Migrations/RLS:** não (Storage sem policy by design; logoUrl já existia no schema).
- **Testes:** `tsc` + `eslint` + `next build` verdes. **Smoke test real** contra o Supabase: upload de PNG 1x1 → URL pública **HTTP 200 image/png** → cleanup ok.
- **Pendências / bloqueios:** **`SUPABASE_SERVICE_ROLE_KEY` precisa estar no ambiente do Vercel** senão o upload falha em prod (o resto do app segue). Sem isso, o upload dá erro claro.
- **Credenciais/segredos necessários:** `SUPABASE_SERVICE_ROLE_KEY` no Vercel (produção). Já presente no `.env.local`.
- **Próximo passo sugerido:** Fatia 2 — materiais didáticos por turma/matéria (3.1/3.3) no bucket `tenant-files` (privado + signed URL + migration da tabela de materiais).
- **Commit(s):** ver `feat: storage + upload da logo da escola (fatia 1)`.

### [2026-06-04 15:40] — Qualidade Q6/Q8 + veredito da frente — STATUS: CONCLUÍDO

- **Tarefa:** fechar a frente de qualidade do jeito "melhor e menos custoso".
- **Segmento:** 🏫👤
- **O que foi feito / verificado:**
  - **Q6 (empty states):** padrão "Nenhum X ainda." já consistente em ~18 telas; corrigido único destoante (`lixeira` "Vazio." → "Nada na lixeira."). CTA dispensado: criação é colocada (lista+form na mesma página) → link seria redundante.
  - **Q8 (loading):** já atendido pelo `app/app/loading.tsx` **global** (cobre rotas aninhadas no Next.js). Skeleton por tela = marginal, dispensado.
  - **Q5 (PageHeader):** já em uso amplo; sem item dedicado.
  - **Q3/Q4/Q7 DEFERIDOS (baixo ROI):** tabelas/forms heterogêneos (form por linha no financeiro, boletim pivot, cada cadastro com form próprio) tornam `DataTable`/`ListAndFormLayout` abstração genérica demais; `aria-label` sweep é custo alto / ganho cosmético. Reavaliar só se virar dor concreta.
- **Resultado da frente:** entregue o que tem ROI real — Q1 (feedback de submit) + Q2 (KpiCard) + Q6/Q8 confirmados. App já estava polido; resto é marginal.
- **Arquivos:** `app/app/lixeira/page.tsx`; `docs/ROADMAP-DELIVERIES.md`.
- **Testes:** mudança trivial de string; `tsc` cobre no commit (lint-staged). Q1/Q2 já com build verde e em prod.
- **Deploy:** Q1+Q2 já em prod (`b067d05..1cf70f6`). Este checkpoint sobe junto no próximo push.
- **Próximo passo sugerido:** frente de qualidade encerrada. Voltar ao backlog que depende de credencial (Storage → RAG) quando o Lucas liberar as chaves.
- **Commit(s):** ver `chore: padroniza empty state da lixeira e fecha frente de qualidade (Q6/Q8)`.

### [2026-06-04 15:10] — Qualidade Q2: `<KpiCard>` compartilhado — STATUS: CONCLUÍDO

- **Tarefa:** unificar os cards de KPI (havia 3 defs locais duplicadas).
- **Segmento:** 🏫👤
- **O que foi feito:** novo `apps/web/src/components/kpi-card.tsx` cobrindo as 3 variações (ícone+link do dashboard, simples de relatórios, `cor` do financeiro). Aplicado por **alias de import** (`KpiCard as StatCard`/`as Kpi`) → zero edição de call site; removidas as 3 funções locais e o tipo `LucideIcon` órfão no dashboard.
- **Arquivos:** `components/kpi-card.tsx` (novo); `app/app/{page,relatorios/page,financeiro/page}.tsx`.
- **Testes:** `tsc` + `eslint` (arquivos tocados) + `next build` verdes (EXIT 0).
- **Pendências:** Q3–Q8. **Nota de ROI:** Q3 (`DataTable`) e Q4 (`ListAndFormLayout`) são heterogêneos (tabela do financeiro tem form por linha; boletim é pivot; cada cadastro tem form próprio) → abstração de baixo retorno. Recomendado repriorizar p/ Q6 (empty states) + Q8 (loading), que são baratos e sentidos.
- **Próximo passo sugerido:** decisão do Lucas sobre Q3/Q4 vs Q6/Q8.
- **Commit(s):** ver `feat: KpiCard compartilhado (Q2)`.

### [2026-06-04 14:30] — Qualidade Q1: feedback de submit (`<SubmitButton>`) — STATUS: CONCLUÍDO

- **Tarefa:** auditoria "melhor versão" → backlog Q1–Q8 no ROADMAP; executar Q1 (feedback de submit em todos os forms).
- **Segmento:** 🏫👤
- **Achado da auditoria (corrige nota anterior):** o RBAC NÃO estava faltando. `assertCan` está aplicado na camada de serviço de todos os módulos de domínio (`finance.ts` protege `invoice` só p/ gestão, `settings.ts`/`grade-components.ts` `tenant_settings`, etc.). O `actions.ts` é fino e delega. Era falso positivo da varredura (só olhei `actions.ts`).
- **O que foi feito:**
  - Novo `<SubmitButton>` client (`useFormStatus`): desabilita + spinner inline enquanto a server action roda (evita duplo-clique, dá feedback). Preserva o rótulo (serve p/ Salvar/Gerar/Importar/Adicionar). `Spinner` exportado.
  - `ConfirmButton` ganhou o mesmo (pending + spinner) reusando `Spinner`.
  - Swap em lote: `<Button type="submit">` → `<SubmitButton>` em **35 páginas** de `app/app/**`; import de `Button` removido quando ficou sem uso; `SubmitButton` importado.
- **Arquivos principais:** `apps/web/src/components/submit-button.tsx` (novo), `apps/web/src/components/confirm-button.tsx`, 35× `apps/web/src/app/app/**/page.tsx` + `layout.tsx`.
- **Migrations/RLS:** não.
- **Testes:** `tsc --noEmit` (web) verde; `eslint` nos arquivos tocados verde; `next build` verde (EXIT 0). (turbo falha por spawn no Windows; rodei direto no app.)
- **Decisões (ADR?):** não.
- **Pendências / bloqueios:** Q2–Q8 do backlog de qualidade.
- **Credenciais/segredos necessários:** nenhum.
- **Próximo passo sugerido:** Q2 — `<KpiCard>` compartilhado (dashboard/relatórios/financeiro).
- **Commit(s):** ver `feat: feedback de submit (SubmitButton + spinner) em todos os forms (Q1)`.

### [2026-06-04 11:00] — Itens sem credencial: EduON tipos, financeiro, coletivo, 18.6, mural público, recorrência — STATUS: EM ANDAMENTO

- **Tarefa:** finalizar o backlog que NÃO depende de credencial (sessão paralela; commits só dos arquivos tocados).
- **Segmento:** 🏫👤
- **O que foi feito (todos em prod):**
  - **EduON tipos (11.2–11.4 por tema):** Atividade/Prova/Trabalho/Roteiro em `/app/atividades`, seguindo o "Meu Padrão" (`83c1ffd`).
  - **Financeiro 2.a + recorrência + extrato (5.1/5.1.1):** `invoices` (migration `0020`); lançar, **gerar mensalidades em lote**, baixa/reabrir, excluir, totais e **extrato por responsável** (`?resp=`) (`5cbc71c`, `407207b`).
  - **Banco coletivo (13):** tabela global `shared_activities` (migration `0021`, ADR 0004), `/app/banco-coletivo` (`b2bb8e1`).
  - **18.6 PDF no padrão:** `/app/atividades/[id]` imprimível com a identidade da escola (`47c5b90`). Fecha o item 18.
  - **12 Mural público:** `/mural/[tenant]` (link sem login p/ os pais) + CopyLink na tela interna (`47de58c`).
- **Migrations/RLS:** `0020` (invoices) e `0021` (shared_activities) aplicadas em prod + grants (4 cada).
- **Testes:** `tsc` + `next build` verdes em cada batch; deploys READY, prod 200.
- **Decisões (ADR):** `0004` (banco coletivo global).
- **Pendências / bloqueios:** restam só itens 🔒 (Storage/Resend/Stripe/PSP/WhatsApp) e 🟡 pesados (11.5 padrão por turma/tipo; 16 nativo/offline). Hardening: restringir leitura do financeiro a papéis de gestão.
- **Próximo passo sugerido:** ativar Storage (materiais + RAG) ou Resend (secretaria); ou 11.5 (precisa migration).
- **Commit(s):** `83c1ffd`, `5cbc71c`, `b2bb8e1`, `47c5b90`, `47de58c`, `407207b`.

### [2026-06-03 16:00] — EduON tipos + Financeiro 2.a + Banco coletivo — STATUS: EM ANDAMENTO

- **Tarefa:** finalizar itens do backlog que NÃO dependem de credencial (sessão paralela ao outro agente; commits só dos arquivos tocados para evitar colisão).
- **Segmento:** 🏫👤
- **O que foi feito:**
  - **EduON gera tipos (11.2/11.3/11.4 por tema):** seletor Atividade/Prova/Trabalho/Roteiro em `/app/atividades`; `generateActivityWithEduON` ganhou `kind` (system prompt + título + etiqueta por tipo), aplicando `applyAiStandard` (o "Meu Padrão"). Falta a versão ancorada no material (RAG, depende de Storage).
  - **Financeiro 2.a (item 5.1):** tabela `invoices` (migration `0020`, RLS+grant), `module-nucleo/finance`; `/app/financeiro` (só escola): lançar cobrança por responsável/aluno, dar baixa/reabrir, excluir, totais (a receber/vencido/recebido), "vencido" derivado. Nav Mensalidades real. Sem PSP (controle interno).
  - **Banco coletivo (item 13):** tabela GLOBAL `shared_activities` (migration `0021`, policy permissiva, ADR 0004); `module-pedagogico/collective` (list/share/copy via `client.db`, fora do RLS de tenant); `/app/banco-coletivo` (filtra por faixa etária, copia p/ o banco, compartilha atividade). Só conteúdo, sem PII/tenant.
- **Arquivos principais:** `packages/db/src/schema.ts` + `drizzle/0020_*`,`0021_*`; `packages/validation/src/index.ts`; `packages/modules/nucleo/src/finance.ts`; `packages/modules/pedagogico/src/{activities,collective}.ts`; `apps/web/src/app/app/{atividades,financeiro,banco-coletivo}/page.tsx`; `apps/web/src/app/app/actions.ts`; `apps/web/src/lib/nav.ts`; `docs/adr/0004-banco-coletivo-global.md`.
- **Migrations/RLS:** `0020` (invoices, RLS+grant) e `0021` (shared_activities, policy `true`+grant) aplicadas em prod (verificado: 4 privilégios cada).
- **Testes:** `tsc` (db/validation/nucleo/pedagogico/web) + `next build` verdes. Deploys `83c1ffd`, `5cbc71c`, `b2bb8e1` READY, prod 200.
- **Decisões (ADR):** `docs/adr/0004-banco-coletivo-global.md` (primeira tabela global, conteúdo não sensível, acesso pela conexão dona).
- **Pendências / bloqueios:** financeiro sem recorrência (gerar mensalidades em lote) nem extrato dedicado; coletivo sem moderação/ownership por linha; finance read não restrito a papéis de gestão (hardening TODO). Itens que dependem do Lucas: Storage, Resend, Stripe, PSP, WhatsApp.
- **Próximo passo sugerido:** recorrência de mensalidade + extrato por responsável (5.1.1 dedicado); depois itens com credencial.
- **Commit(s):** `83c1ffd` (eduon tipos), `a7a76a5` (doc), `5cbc71c` (financeiro), `b2bb8e1` (coletivo).

### [2026-06-03 19:10] — Aniversariantes do mês (inspiração externa, nosso padrão) — STATUS: EM ANDAMENTO

- **Tarefa:** o Lucas mandou prints de outro sistema (dashboard + financeiro). Decisão dele: "usar de referência onde encaixa; financeiro depois". Encaixe imediato e sem credencial = aniversariantes do mês.
- **Segmento:** 🏫👤
- **O que foi feito:** `students.birth_date` (migration); data de nascimento no cadastro do aluno e no **CSV** (coluna `nascimento`, aceita DD/MM/AAAA via `parseBrDate`); card **"Aniversariantes do mês"** no dashboard `/app` (dia/aluno/turma, ordenado por dia). Roadmap ganhou seção "Inspirações externas" registrando os outros itens (movimento financeiro, contas a receber) como dependentes do módulo Financeiro (depois).
- **Arquivos principais:** `packages/db/src/schema.ts` + `drizzle/0019_*.sql`, `packages/validation/src/index.ts`, `packages/modules/nucleo/src/classes.ts`, `apps/web/src/app/app/{actions.ts,page.tsx,alunos/page.tsx}`.
- **Migrations/RLS:** `0019_slow_starhawk` aplicada em prod (students.birth_date). Verificado.
- **Testes:** typecheck/lint/build 14/14 verdes. Deploy: push p/ main.
- **Pendências / bloqueios:** Financeiro (movimento mensal + contas a receber/recebidas) fica para quando o Lucas pedir; gateway depende de provedor.
- **Próximo passo sugerido:** item 11 (perfis por papel) ou liberar Storage (12).
- **Commit(s):** ver `feat: aniversariantes do mes no dashboard + data de nascimento do aluno`.

### [2026-06-03 18:40] — Lista "a desenvolver" itens 6–10 — STATUS: EM ANDAMENTO

- **Tarefa:** itens 6–10 da lista (todos 🟢 sem credencial).
- **Segmento:** 🏫👤
- **O que foi feito:**
  - **6/7 · Planejamento (7.1/7.2/7.3):** tabela `lesson_plans` (kind aula/avaliacao/trabalho + título/conteúdo/data por turma/matéria) + `/app/sala/planejamento`; `lessons.lesson_plan_id` liga o diário ao plano (seletor no diário + tag "plano: …"). Nav: "Planejamento" em Sala de aula.
  - **8 · Painel filtros/visualização (15):** filtro por **série** (além de turma) + alternância **gráfico/tabela** no desempenho por turma de `/app/relatorios`.
  - **9 · Período no diário/faltas:** filtro última semana/mês/tudo (`inicioPeriodo` em `lib/date`) no diário e nas faltas.
  - **10 · Documentos em PDF (18.6/19.5):** `/app/documentos` gera declaração de matrícula/frequência, autorização e texto livre com a identidade da escola (logo), imprimível em PDF. Nav: "Documentos" em Pedagógico.
- **Arquivos principais:** `packages/db/src/schema.ts` + `drizzle/0018_*.sql`, `packages/validation/src/index.ts`, `packages/modules/sala-de-aula/src/{lesson-plans,index}.ts`, `apps/web/src/lib/{date,nav}.ts`, `apps/web/src/app/app/{actions.ts,sala/{planejamento,diario,faltas}/page.tsx,relatorios/page.tsx,documentos/page.tsx}`.
- **Migrations/RLS:** `0018_clever_sharon_carter` aplicada em prod (lesson_plans + lessons.lesson_plan_id). Verificado: grants/coluna OK.
- **Testes:** typecheck/lint/build 14/14 verdes. Deploy: push p/ main.
- **Pendências / bloqueios:** restam itens 11 (perfis por papel), 19 (BNCC), 20 (PWA offline) sem credencial; e 12–18 dependem de você (Storage/E-mail/WhatsApp/Stripe/decisão).
- **Próximo passo sugerido:** item 11 (perfis por papel) ou destravar Storage (12).
- **Commit(s):** ver `feat: itens 6-10 (planejamento, periodo, filtros painel, documentos pdf)`.

### [2026-06-03 17:55] — Lista "a desenvolver" itens 1–5 — STATUS: EM ANDAMENTO

- **Tarefa:** itens 1–5 da lista priorizada (todos 🟢 sem credencial).
- **Segmento:** 🏫👤
- **O que foi feito:**
  - **1 · Nav do professor autônomo centrada no EduON** (18.8): `navFor` reordena os grupos no `individual` (Visão geral → EduON → Pedagógico → Sala de aula). Escola mantém a ordem.
  - **2 · Papel `monitor`**: adicionado em `ROLES` (core) + `roleEnum` (db, migration `ADD VALUE IF NOT EXISTS` aplicada em PG15 dentro da transação) + labels no quadro/professores. Aparece no select de convites; RBAC default = leitura.
  - **3 · Boletim detalhado por componente**: colunas dinâmicas por componente (média do componente) + média final ponderada + frequência; dica quando não há componentes.
  - **4 · Exceções de data no cronograma**: tabela `schedule_exceptions` (data + o que muda) + seção "Alterações pontuais" em `/app/cronograma` (criar/remover), sem mexer na grade fixa.
  - **5 · Mural dos pais (interno)**: `/app/mural` lista comunicados publicados em ordem, imprimível; nav em Comunicação. Acesso externo dos pais depende do portal (futuro).
- **Arquivos principais:** `packages/core/src/rbac.ts`, `packages/db/src/schema.ts` + `drizzle/0017_*.sql`, `packages/validation/src/index.ts`, `packages/modules/sala-de-aula/src/schedule.ts`, `apps/web/src/lib/nav.ts`, `apps/web/src/app/app/{actions.ts,cronograma/page.tsx,sala/boletim/page.tsx,mural/page.tsx,escola/{quadro,professores}/page.tsx}`.
- **Migrations/RLS:** `0017_outgoing_doctor_octopus` aplicada em prod (role+=monitor, schedule_exceptions). Verificado: enum com monitor na posição certa, grants OK.
- **Testes:** typecheck/lint/build 14/14 verdes. Deploy: push p/ main.
- **Pendências / bloqueios:** —
- **Próximo passo sugerido:** itens 6–11 (plano de aulas, planejamento de avaliações, filtros do painel, visão semana/mês, PDF no padrão, perfis por papel) ou destravar Storage (12 da lista) / e-mail / WhatsApp / Stripe.
- **Commit(s):** ver `feat: itens 1-5 (nav eduon, monitor, boletim por componente, excecoes cronograma, mural)`.

### [2026-06-03 17:10] — Notas com pesos definidos pela escola (item 9.2) + planos/landing — STATUS: EM ANDAMENTO

- **Tarefa:** a escola define a composição/pesos da média e o sistema calcula sozinho; ajustes de preço/landing pedidos pelo Lucas.
- **Segmento:** 🏫 (cálculo) + visitante (landing)
- **O que foi feito:**
  - **Pesos da nota (9.2):** tabela `grade_components` (nome + peso, ex.: Prova 1 / Trabalho 2), `tenant_settings.grade_scale` (escala 0..N), `grades.component_id`. Tela `/app/escola/notas`. Cálculo **por trás**: `weightedAverage` = média dentro de cada componente × peso, somado / soma dos pesos (assim "quantos trabalhos" não desequilibra). Aplicado em Boletim, Relatórios (geral/turma/risco) e detalhe do aluno. Sem componentes → média simples (não afeta o professor autônomo). Form de notas com seletor de componente; tag nas listas. Nav: "Notas e pesos" em Escola.
  - **Planos/landing:** preço **só mensal** (sem alternância anual), **Escola = "Consultar preço"** (sem valor, sem mínimo R$499), teste **7 dias** (era 14). CTA final vira `AudienceButtons`: mesma cor, selecionável ao clicar (igual aos cards de plano).
- **Arquivos principais:** `packages/db/src/schema.ts` + `drizzle/0016_*.sql`, `packages/validation/src/index.ts`, `packages/modules/nucleo/src/{grade-components,settings,index}.ts`, `packages/modules/sala-de-aula/src/index.ts`, `apps/web/src/app/app/{actions.ts,escola/notas/page.tsx,sala/{notas,boletim}/page.tsx,relatorios/page.tsx,alunos/[id]/page.tsx}`, `apps/web/src/lib/nav.ts`, `apps/web/src/components/{pricing-cards,audience-buttons}.tsx`, `apps/web/src/app/page.tsx`.
- **Migrations/RLS:** `0016_purple_pandemic` aplicada em prod (grade_components + grades.component_id + tenant_settings.grade_scale). Verificado: grants/colunas OK.
- **Testes:** typecheck/lint/build 14/14 verdes. Deploy: push p/ main (commit `675480e` planos/botões + o desta entrega).
- **Pendências / bloqueios:** exportar boletim com composição detalhada por componente (nice-to-have); resto do backlog depende do Lucas (Storage/Stripe/WhatsApp/BNCC).
- **Próximo passo sugerido:** plano de aulas (7.1) ou mural dos pais (12); ou destravar Storage/Stripe/WhatsApp.
- **Commit(s):** ver `feat: notas com pesos definidos pela escola (media ponderada)`.

### [2026-06-03 16:25] — PWA instalável (item 16) — STATUS: EM ANDAMENTO

- **Tarefa:** tornar o app instalável (primeiro passo de app mobile, item 16).
- **Segmento:** 🏫👤
- **O que foi feito:** `app/manifest.ts` (nome, start_url `/app`, standalone, theme/background, ícone SVG), `public/sw.js` (service worker passthrough — sem cache agressivo p/ não servir versão velha), `components/pwa-register.tsx` (registra o SW no load), layout raiz com `appleWebApp` + `viewport.themeColor` + `<PwaRegister/>`. Agora o navegador oferece "Instalar app".
- **Arquivos principais:** `apps/web/src/app/{manifest.ts,layout.tsx}`, `apps/web/public/sw.js`, `apps/web/src/components/pwa-register.tsx`.
- **Migrations/RLS:** nenhuma.
- **Testes:** typecheck/lint/build 14/14 verdes (rota `/manifest.webmanifest` gerada). Deploy: push p/ main.
- **Pendências / bloqueios:** offline real (cache no SW) adiado de propósito.
- **Próximo passo sugerido:** parei nos itens que dependem do Lucas (Storage/Stripe/WhatsApp/BNCC). Sem credencial ainda restam: plano de aulas (7.1), mural dos pais (12), banco coletivo (13).
- **Commit(s):** ver `feat: pwa instalavel (manifest + service worker)`.

### [2026-06-03 16:10] — Painel geral + filtros/gráficos (itens 14/15) — STATUS: EM ANDAMENTO

- **Tarefa:** painel de direção consolidado e visualização com filtro/gráfico (itens 14 e 15, parcial).
- **Segmento:** 🏫
- **O que foi feito:** `/app/relatorios` virou "Painel da escola": KPIs incluindo **ocorrências**; filtro por turma (searchParam, escopa alunos/notas/frequência); **desempenho por turma com barras** (gráfico CSS puro, sem lib); seção **alunos em risco** (frequência < 75% ou média < 6, ordenado por frequência, link p/ o aluno). Tudo imprimível.
- **Arquivos principais:** `apps/web/src/app/app/relatorios/page.tsx`.
- **Migrations/RLS:** nenhuma (só leitura agregada).
- **Testes:** typecheck/lint/build 14/14 verdes. Deploy: push p/ main.
- **Pendências / bloqueios:** filtro por série/período e alternância cartões/tabela/gráficos (15) pendentes.
- **Próximo passo sugerido:** PWA (16); plano de aulas (7.1). Demais itens dependem do Lucas (Storage/Stripe/WhatsApp/BNCC).
- **Commit(s):** ver `feat: painel da escola com filtro, graficos e alunos em risco`.

### [2026-06-03 15:50] — "Meu padrão" do EduON (itens 18.3 / 11.5) — STATUS: EM ANDAMENTO

- **Tarefa:** padrão pessoal/da escola aplicado a TODA geração do EduON.
- **Segmento:** 🏫👤
- **O que foi feito:** `tenant_settings.ai_standard` (migration); página `/app/meu-padrao` (ambos os segmentos; título adapta "Meu padrão"/"Padrão do EduON"); `upsertTenantSettings` virou **merge parcial** (salvar o padrão não apaga logo/cor e vice-versa); helpers `getAiStandard` + `applyAiStandard` no module-nucleo. Aplicado nos geradores: `generateDraft` (gerar conteúdo/redação/tutor), `generateActivityWithEduON` e `generateQuizWithEduON` — o padrão entra no system prompt. Nav: item "Meu padrão" no grupo EduON.
- **Arquivos principais:** `packages/db/src/schema.ts` + `drizzle/0015_*.sql`, `packages/validation/src/index.ts`, `packages/modules/nucleo/src/settings.ts`, `packages/modules/ia/src/drafts.ts`, `packages/modules/pedagogico/src/{activities,quizzes}.ts`, `apps/web/src/app/app/{actions.ts,meu-padrao/page.tsx}`, `apps/web/src/lib/nav.ts`.
- **Migrations/RLS:** `0015_reflective_vargas` aplicada em prod (tenant_settings.ai_standard).
- **Testes:** typecheck/lint/build 14/14 verdes. Deploy: push p/ main.
- **Pendências / bloqueios:** exportação em PDF no padrão (18.6) e padrão por turma/tipo de documento (11.5) seguem pendentes.
- **Próximo passo sugerido:** chegou nos itens que dependem do Lucas (Storage p/ materiais 3.1/3.3/11.2-11.4 RAG, Stripe billing, WhatsApp) + BNCC (dados). Bom ponto de pausa.
- **Commit(s):** ver `feat: meu padrao do eduon aplicado nas geracoes`.

### [2026-06-03 15:25] — Quadro de funcionários (item 1) — STATUS: EM ANDAMENTO

- **Tarefa:** tela de quadro da equipe da escola (item 1).
- **Segmento:** 🏫
- **O que foi feito:** página `/app/escola/quadro` (só escola): equipe agrupada por função (responsável/direção/coordenação/professores/secretaria/financeiro), KPIs (membros, professores, vínculos de aula, funções), atalho para Convidar membro e, por professor, link para definir vínculos turma/matéria. Reusa `listTeachers` + `listTeachingAssignments` (sem migration). Nav: item "Quadro de funcionários" no grupo Escola.
- **Arquivos principais:** `apps/web/src/app/app/escola/quadro/page.tsx`, `apps/web/src/lib/nav.ts`.
- **Migrations/RLS:** nenhuma (só leitura agregada).
- **Testes:** typecheck/lint/build 14/14 verdes. Deploy: push p/ main.
- **Pendências / bloqueios:** papel `monitor` exige `ALTER TYPE role ADD VALUE` (não roda dentro da transação do drizzle migrate) — aplicar manual quando for o caso; perfis de visualização por papel pendentes.
- **Próximo passo sugerido:** "Meu padrão" do professor autônomo (18.3, reusa tenant_settings); plano de aulas (7.1); painel geral + filtros (14/15).
- **Commit(s):** ver `feat: quadro de funcionarios da escola`.

### [2026-06-03 15:05] — Cronograma das turmas (item 7) — STATUS: EM ANDAMENTO

- **Tarefa:** horário semanal por turma (item 7).
- **Segmento:** 🏫👤
- **O que foi feito:** tabela `schedule_slots` (classId, subjectId?, weekday 1-7, startTime/endTime, note) RLS; módulo `module-sala-de-aula/schedule.ts` (create/list/delete, checagem tripla); página `/app/cronograma` (grade semanal por turma em cartões por dia, dias úteis por padrão + fim de semana se houver, adicionar/remover slot, imprimível em PDF). Nav: item "Cronograma" no grupo Sala de aula (ambos os segmentos).
- **Arquivos principais:** `packages/db/src/schema.ts` + `drizzle/0014_*.sql`, `packages/validation/src/index.ts`, `packages/modules/sala-de-aula/src/{schedule,index}.ts`, `apps/web/src/app/app/{actions.ts,cronograma/page.tsx}`, `apps/web/src/lib/nav.ts`.
- **Migrations/RLS:** `0014_foamy_cobalt_man` aplicada em prod (schedule_slots).
- **Testes:** typecheck/lint/build 14/14 verdes. Deploy: push p/ main.
- **Pendências / bloqueios:** alterações pontuais/exceções de data e vínculo cronograma↔diário (7.1/7.2) seguem pendentes.
- **Próximo passo sugerido:** quadro de funcionários + papel monitor (1); "Meu padrão" do professor (18.3); plano de aulas (7.1).
- **Commit(s):** ver `feat: cronograma semanal das turmas`.

### [2026-06-03 14:40] — Notas: participação + anotações (item 9) — STATUS: EM ANDAMENTO

- **Tarefa:** completar o item 9 (notas formais + participação + anotações por aluno).
- **Segmento:** 🏫👤
- **O que foi feito:** `grades.kind` (formal/participacao/anotacao) + `grades.note`; `grades.value` virou NULLABLE (anotação não tem nota). `recordGrade` grava kind/note e zera value em anotação. Validação com refine (nota obrigatória só para formal/participação). Página `/app/sala/notas` com seletor de tipo + observação + valor opcional. Médias em Boletim, Relatórios e detalhe do aluno passam a ignorar `value` nulo (anotações não entram na média). Tags de tipo + observação exibidas nas listas.
- **Arquivos principais:** `packages/db/src/schema.ts` + `drizzle/0013_*.sql`, `packages/validation/src/index.ts`, `packages/modules/sala-de-aula/src/index.ts`, `apps/web/src/app/app/{actions.ts,sala/notas/page.tsx,sala/boletim/page.tsx,relatorios/page.tsx,alunos/[id]/page.tsx}`.
- **Migrations/RLS:** `0013_glorious_oracle` aplicada em prod (grades.value DROP NOT NULL + kind + note).
- **Testes:** typecheck/lint/build 14/14 verdes. Deploy: push p/ main.
- **Pendências / bloqueios:** —
- **Próximo passo sugerido:** cronograma das turmas (7); quadro de funcionários + papel monitor (1); "Meu padrão" do professor (18.3).
- **Commit(s):** ver `feat: notas com participacao e anotacoes`.

### [2026-06-03 14:10] — Matérias da turma + série/idade + vínculo responsável + UI mobile — STATUS: EM ANDAMENTO

- **Tarefa:** continuar o backlog "Escola — visão detalhada" (itens 3, 3.2, 4, 5) + melhorias de UI pedidas pelo Lucas.
- **Segmento:** 🏫👤
- **O que foi feito:**
  - **3 · Série/faixa etária da turma:** `classes.grade_level` + `classes.age_range`; nova tela `/app/turmas/[id]` (detalhe da turma: editar série/idade/descrição, ver alunos, gerir matérias). Turmas viram links; form de nova turma com série/idade.
  - **3.2 · Matérias da turma:** tabela `class_subjects` (N:N turma↔disciplina, RLS) + módulo `class-subjects.ts` (link/list/unlink); grade curricular na tela de detalhe (só escola).
  - **4 e 5 · Vínculo aluno↔responsável:** UI no detalhe do aluno (`/app/alunos/[id]`): vincular responsável existente (parentesco + financeiro/busca/emergência) e desvincular; `listStudentGuardians` agora resolve nome/telefone; `unlinkGuardian` novo.
  - **UI mobile (item 16):** `BottomNav` (navegação inferior no mobile: Início/Turmas/Alunos/EduON/Agenda), some no desktop e na impressão; main ganha padding inferior no mobile.
  - **UI dashboard:** seção "Ações rápidas" no início (atalhos por segmento).
- **Arquivos principais:** `packages/db/src/schema.ts` + `drizzle/0012_*.sql`, `packages/validation/src/index.ts`, `packages/modules/nucleo/src/{classes,class-subjects,guardians,index}.ts`, `apps/web/src/components/{bottom-nav,app-shell}.tsx`, `apps/web/src/app/app/{actions.ts,page.tsx,turmas/page.tsx,turmas/[id]/page.tsx,alunos/[id]/page.tsx}`.
- **Migrations/RLS:** `0012_right_meggan` aplicada em prod (class_subjects + classes.grade_level/age_range). Verificado: authenticated 4 privilégios em class_subjects, colunas OK.
- **Testes:** typecheck/lint/build 14/14 verdes. Deploy: push p/ main.
- **Pendências / bloqueios:** vínculo responsável só aparece na escola (individual não tem responsáveis); materiais didáticos (3.1/3.3) seguem dependendo de Storage.
- **Próximo passo sugerido:** Notas com participação + anotações (9); cronograma das turmas (7); quadro de funcionários + papel monitor (1).
- **Commit(s):** ver `feat: materias da turma, serie/idade, vinculo responsavel e navegacao mobile`.

### [2026-06-03 13:30] — Vínculos prof. + faltas/matéria + PDF + CSV + menu enxuto — STATUS: EM ANDAMENTO

- **Tarefa:** avançar o backlog "Escola — visão detalhada" nas 5 prioridades combinadas (sem o que depende de credencial: Storage/Stripe/WhatsApp).
- **Segmento:** 🏫👤
- **O que foi feito:**
  - **17 · Vínculos do professor** (membership ↔ turma ↔ matéria): tabela `teaching_assignments` (RLS), módulo `module-nucleo/teaching.ts` (`listTeachers`, `assignTeaching`, `listTeachingAssignments`, `listAssignmentsForMembership`, `removeTeachingAssignment`), página `/app/escola/professores` (criar/remover; matéria vazia = regente). RBAC: gestão institucional (só owner/director/coordinator criam).
  - **8.1 · Faltas por matéria:** `attendance.subject_id` + índice `attendance_uq` recriado com **NULLS NOT DISTINCT** (chamada do dia, subject nulo, segue upsert idempotente; falta por matéria convive). Chamada e Faltas com seletor de matéria.
  - **8.2 · Documento de faltas:** `/app/relatorios/faltas` (filtros turma/aluno/matéria, resumo por aluno + detalhamento) imprimível.
  - **9.1 · Doc fácil em PDF/impressão:** `PrintButton` (`window.print()`) + folha de impressão via `print:hidden` na casca (esconde sidebar/header) em Relatórios, Boletim e Relatório de faltas.
  - **Import CSV/Excel:** `lib/csv.ts` (parser próprio: auto-detecta `,`/`;`, aspas `""`, BOM, CRLF) + `components/csv-import.tsx` (baixar modelo com BOM p/ Excel pt-BR + upload). Actions `importStudentsCsvAction`/`importClassesCsvAction`/`importGuardiansCsvAction` reusam os serviços bulk. Cards em Turmas, Alunos e Responsáveis.
  - **18 (parcial) · Menu enxuto do individual:** `NavItem.only` + `navFor` filtra grupos e itens por segmento; o professor autônomo perde Escola, Comunicação, Gestão, Financeiro, Integrações e Ocorrências (some grupo vazio). Escola mantém tudo.
- **Arquivos principais:** `packages/db/src/schema.ts` + `drizzle/0011_*.sql`, `packages/validation/src/index.ts`, `packages/modules/nucleo/src/teaching.ts` (+`index.ts`), `packages/modules/sala-de-aula/src/index.ts`, `apps/web/src/lib/{csv.ts,nav.ts}`, `apps/web/src/components/{print-button,csv-import,app-shell}.tsx`, `apps/web/src/app/app/actions.ts`, páginas `escola/professores`, `relatorios/faltas`, `sala/{chamada,faltas,boletim}`, `relatorios`, `turmas`, `alunos`, `escola/responsaveis`.
- **Migrations/RLS:** `0011_sturdy_silverclaw` aplicada em prod (teaching_assignments + attendance.subject_id + índices `NULLS NOT DISTINCT`). Verificado: authenticated com 4 privilégios em `teaching_assignments`, coluna e índice OK.
- **Testes:** `pnpm typecheck` 14/14, `pnpm lint` 14/14, `pnpm build` 14/14 verdes. Deploy: push p/ main (auto na Vercel).
- **Decisões:** índice de presença com `NULLS NOT DISTINCT` (patch manual no SQL gerado) para casar chamada-por-dia e falta-por-matéria no mesmo upsert; geração de doc via impressão do navegador (sem dependência de PDF no servidor), reusada como base do 9.1/8.2.
- **Pendências / bloqueios:** Storage (upload de logo/materiais — 3.1/3.3), Stripe (billing — adiado a pedido do Lucas), WhatsApp Cloud API; "Meu padrão" do professor autônomo (18.3/18.6) e navegação centrada em EduON (18.8) seguem pendentes; import só CSV (xlsx exigiria SheetJS).
- **Próximo passo sugerido:** vínculo turma↔matéria (3.2) aproveitando `teaching_assignments`; depois cronograma (7) ou "Meu padrão" (18.3).
- **Commit(s):** ver `feat: vinculos do professor, faltas por materia, relatorios em pdf, import csv e menu enxuto do individual`.

### [2026-06-03 10:30] — EduON atividades + datas + onboarding + personalização — STATUS: EM ANDAMENTO

- **Tarefa:** reforçar EduON, padrões de data, onboarding guiado e personalização da escola (sequência autônoma).
- **Segmento:** 🏫👤
- **O que foi feito:**
  - **EduON**: gera atividade direto no banco (`generateActivityWithEduON`, `/app/atividades`) e simulado com **dificuldade** (fácil/médio/difícil).
  - **Datas**: diário, chamada e novo evento já vêm com a **data de hoje** (fuso SP) editável (`@/lib/date`).
  - **Onboarding**: checklist de "primeiros passos" no início (progresso x/y, marca o feito, some quando completo).
  - **Personalização da escola** (`/app/escola/personalizacao`): logo (URL), cor do tema (presets aplicados como `--primary` em todo o app), regimento, modelos de documento. Tabela `tenant_settings` (migration `0009`, RLS + grant). Logo aparece na sidebar; escrita restrita à gestão.
  - **Landing**: rodapé só com © centralizado. **/admin** blindado contra falha transitória de banco (o erro 500 que o Lucas viu era transiente, durante um deploy; reproduzi o login do admin e deu 200).
- **Arquivos principais:** `packages/db/src/schema.ts` + `drizzle/0009_*.sql`, `packages/modules/nucleo/src/settings.ts`, `packages/modules/pedagogico/src/activities.ts`, `apps/web/src/app/app/{page.tsx,escola/personalizacao/page.tsx,layout.tsx}`, `apps/web/src/components/app-shell.tsx`, `apps/web/src/lib/{date.ts,nav.ts}`, `apps/web/src/app/page.tsx`, `apps/web/src/app/admin/page.tsx`.
- **Migrations/RLS:** `0009` (tenant_settings) aplicada em prod + grant `authenticated` (4).
- **Testes:** `tsc` + `next build` verdes. Deploys `114b828`, `fb54e01`, `58cb253`, `6e41b9b` READY, prod 200.
- **Pendências / bloqueios:** logo é por URL (upload via Storage depois); cor por presets (hex livre depois); importação por planilha (CSV) e views semana/mês ainda pendentes (pedidos do Lucas); cronograma pré-preenchido adiado a pedido dele.
- **Próximo passo sugerido:** importação por planilha (CSV template + upload); views semana/mês/período no diário e chamada; BNCC.
- **Commit(s):** `114b828`, `fb54e01`, `58cb253`, `6e41b9b`.

### [2026-06-02 08:05] — UX polish + Mensagens internas — STATUS: EM ANDAMENTO

- **Tarefa:** polimentos (calendário clicável, menu mobile) e mensagens internas para responsáveis.
- **Segmento:** 🏫👤
- **O que foi feito:**
  - **Calendário**: clicar num dia abre os eventos daquele dia (destaque + painel "ver o mês") e o form de novo evento já vem com a data clicada (tudo via searchParam, sem client JS).
  - **Landing**: menu sanduíche no mobile (`LandingMobileMenu`), já que a nav some em telas pequenas.
  - **Mensagens internas**: tabela `messages` (migration `0008`, RLS + grant), `module-comunicacao/messages` (create/list/delete soft), página `/app/mensagens` (registrar por responsável + aluno opcional, histórico). RBAC recurso `message`; nav Mensagens vira rota real.
- **Arquivos principais:** `apps/web/src/app/app/calendario/page.tsx`, `apps/web/src/components/landing-mobile-menu.tsx`, `apps/web/src/app/page.tsx`, `packages/db/src/schema.ts` + `drizzle/0008_*.sql`, `packages/modules/comunicacao/src/messages.ts`, `apps/web/src/app/app/mensagens/page.tsx`, `packages/validation/src/index.ts`, `packages/auth/src/rbac.ts`, `apps/web/src/lib/nav.ts`.
- **Migrations/RLS:** `0008` (messages) aplicada em prod + grant `authenticated` (verificado: 4).
- **Testes:** `tsc` (db/validation/auth/comunicacao/web) + `next build` verdes. Push `34f09f7` (polish) e `1a9285f` (mensagens), deploys READY, prod 200.
- **Pendências / bloqueios:** mensagem fica só registrada (sem envio e-mail/WhatsApp); resposta do responsável depende de portal; envio precisa de SMTP/WhatsApp (credenciais).
- **Próximo passo sugerido:** Planejamento BNCC; notificações; refinar preços.
- **Commit(s):** `34f09f7` (calendário+menu mobile), `1a9285f` (mensagens internas).

### [2026-06-02 07:35] — EduON gera simulados — STATUS: EM ANDAMENTO

- **Tarefa:** o agente EduON cria simulados completos (diferencial de IA visível).
- **Segmento:** 🏫👤
- **O que foi feito:** `generateQuizWithEduON` no module-pedagogico gera questões de múltipla escolha por IA (provider Anthropic), com parse robusto do JSON, cria o quiz + questões já corrigíveis; cota por tenant + checagem tripla. Action `generateQuizAction` e card "Gerar com o EduON" em `/app/simulados` (tema + nº de questões). `module-pedagogico` passou a depender de `module-ia`.
- **Arquivos principais:** `packages/modules/pedagogico/src/quizzes.ts`, `packages/modules/pedagogico/package.json`, `packages/validation/src/index.ts`, `apps/web/src/app/app/actions.ts`, `apps/web/src/app/app/simulados/page.tsx`.
- **Migrations/RLS:** sem migration (reusa tabelas do `0007`).
- **Testes:** `tsc` (validation/pedagogico/web) + `next build` verdes. Push `3a8d7cb`, deploy READY, prod 200.
- **Pendências / bloqueios:** gera 4 alternativas fixas; sem dificuldade configurável ainda. Depende de `ANTHROPIC_API_KEY` (já em prod).
- **Próximo passo sugerido:** Mensagens internas; Planejamento BNCC; refinar preços; polimentos de UX.
- **Commit(s):** `feat: gerar simulado pelo eduon` (`3a8d7cb`).

### [2026-06-02 07:10] — Marca On Way Education + agente EduON + landing — STATUS: EM ANDAMENTO

- **Tarefa:** rebrand para On Way Education, batizar a IA como agente EduON e evoluir a landing (slogan, planos interativos).
- **Segmento:** 🏫👤 + visitante
- **O que foi feito:**
  - **Rebrand**: "On Education" → "On Way Education" em todo o app (33 telas) + metadata.
  - **EduON**: a IA vira o agente EduON (ON em destaque no gradiente). Aplicado na landing (anúncio, hero, recursos, mock) e dentro do app (menu "EduON", página `/app/ia` titulada EduON).
  - **Landing**: slogan novo ("Ensine com inteligência. Do plano de aula ao boletim."), botões por público (Sou professor / Sou escola; CTA final Sou professor autônomo / Tenho uma escola), menu enxuto, painel admin removido da landing pública.
  - **Planos**: componente client `PricingCards` com seleção que **muda de cor ao clicar** (Pro pré-selecionado); fim do "grátis para sempre" (agora 14 dias de teste; Professor R$19 / Pro R$39 / Escola sob consulta, valores ilustrativos).
  - **SEO**: description da raiz com slogan + agente.
- **Arquivos principais:** `apps/web/src/app/page.tsx`, `apps/web/src/components/pricing-cards.tsx`, `apps/web/src/lib/nav.ts`, `apps/web/src/app/app/ia/page.tsx`, `apps/web/src/app/layout.tsx`, + 33 telas renomeadas.
- **Migrations/RLS:** sem migration.
- **Testes:** `tsc` + `next build` verdes. Deploys: Vercel teve fila travada algumas vezes (resolvido cancelando o deploy preso). `ed6bfce` READY, prod 200, EduON/On Way Education confirmados na home.
- **Pendências / bloqueios:** preços ilustrativos a calibrar; admin ainda usa o /login comum (separação só visual, link tirado da landing); EduON é só nome (entitlements/cota inalterados).
- **Próximo passo sugerido:** refinar preços; Mensagens internas; gerar simulado pelo EduON; BNCC.
- **Commit(s):** `c4ef428` (planos), `7a83694` (rebrand+landing), `ed6bfce` (eduon no app).

### [2026-06-02 06:30] — Landing nova + planos + calendário em grade — STATUS: EM ANDAMENTO

- **Tarefa:** calendário visual mensal (estilo On Condomínio) e landing page estilosa com seção de planos (referências Plurall/Quality/softwareparaescolas).
- **Segmento:** 🏫👤 + visitante
- **O que foi feito:**
  - **Calendário** (`/app/calendario`): grade mensal real com navegação de mês (prev/hoje/próximo via `?mes=YYYY-MM`), dia de hoje destacado, eventos nas células (até 3 + "+N"), lista do mês com excluir e form de novo evento.
  - **Landing** (`/`): hero com gradiente, mock flutuante (painel da turma + chips), faixa de recursos, **seção de planos** (Grátis/Pro destaque/Escola, alinhada às entitlements), CTA final e footer. Textos provisórios (refinar depois).
- **Arquivos principais:** `apps/web/src/app/app/calendario/page.tsx`, `apps/web/src/app/page.tsx`.
- **Migrations/RLS:** sem migration.
- **Testes:** `tsc` + `next build` verdes. Deploys: `44658f7` e seguintes ficaram presos no INITIALIZING (fila da Vercel, não código); cancelei o preso → `c4ef428` foi READY. Prod 200, landing com hero/planos confirmados.
- **Pendências / bloqueios:** preços da landing são ilustrativos; calendário não tem clique-no-dia (interatividade) ainda. Vercel teve soluço de fila (resolvido cancelando o deploy travado).
- **Próximo passo sugerido:** refinar textos/preços; Mensagens internas; BNCC.
- **Commit(s):** `feat: calendario em grade mensal e nova landing` (`44658f7`), `feat: secao de planos` (`c4ef428`).

### [2026-06-02 05:40] — Acesso admin + performance + ajustes de UI — STATUS: EM ANDAMENTO

- **Tarefa:** destravar login admin, deixar o app responsivo e ajustes pedidos (ícone, home, workspace, Classroom).
- **Segmento:** 🏫👤 + super-admin
- **O que foi feito:**
  - **Login**: erro de credencial vira mensagem amigável (antes `throw` → tela "Application error" com digest). `/login` redireciona se já logado. `/app` manda super-admin sem tenant para `/admin` (fim do loop).
  - **Recuperação de senha**: `/esqueci-senha` (resetPasswordForEmail) + `/nova-senha` (updateUser) + link no login; `/auth/confirm` trata `type=recovery`.
  - **Admin dedicado**: criada conta `admin@oneducation.app` (senha definida via service_role), adicionada à allowlist `SUPER_ADMIN_EMAILS` em prod. Login testado via API (OK).
  - **Performance**: `getAuthContext`/`getSuperAdminEmail`/`isImpersonating` memoizados por request (React `cache`); `loading.tsx` em `/app` e `/admin` (feedback instantâneo ao navegar).
  - **UI**: ícone da marca em `app/icon.svg` (favicon); home sem subtítulo/parágrafo de marketing; cadastro com **workspace obrigatório**; removido Google Classroom do menu.
- **Arquivos principais:** `apps/web/src/app/login/*`, `apps/web/src/app/{esqueci-senha,nova-senha}/*`, `apps/web/src/server/session.ts`, `apps/web/src/app/{app,admin}/loading.tsx`, `apps/web/src/app/icon.svg`, `apps/web/src/app/page.tsx`, `apps/web/src/app/signup/page.tsx`, `packages/validation/src/index.ts`, `apps/web/src/lib/nav.ts`, `turbo.json`.
- **Migrations/RLS:** sem migration.
- **Testes:** build de todos os pacotes verde (3 testes de provisioning ajustados p/ workspace obrigatório). Deploys 151c502/e04370d falharam por isso; `a53d9da` READY, prod 200.
- **Pendências / bloqueios:** calendário ainda é lista (falta grade mensal estilo Condomínio); reset por e-mail self-service depende do SMTP do Supabase (o admin entra por senha).
- **Credenciais/segredos necessários:** `SUPER_ADMIN_EMAILS` atualizada (Lucas + admin@oneducation.app).
- **Próximo passo sugerido:** calendário em grade mensal; depois Mensagens internas / BNCC.
- **Commit(s):** `0d4b592`, `151c502`, `e04370d`, `a53d9da`.

### [2026-06-02 04:45] — Relatórios de direção — STATUS: EM ANDAMENTO

- **Tarefa:** visão de direção com indicadores da escola e desempenho por turma (sem migration).
- **Segmento:** 🏫 escola
- **O que foi feito:** `/app/relatorios` com KPIs (turmas, alunos, média geral, frequência geral, atividades, simulados) e tabela por turma (alunos, média, frequência), agregando `listGrades`/`listAttendance`/`listClasses`/`listStudents`/`listActivities`/`listQuizzes`. Bucket "Sem turma" para alunos sem classId. Restrito a `organization`. Nav: Relatórios saiu de "em breve".
- **Arquivos principais:** `apps/web/src/app/app/relatorios/page.tsx`, `apps/web/src/lib/nav.ts`.
- **Migrations/RLS:** sem migration (só leitura agregada, RLS já cobre as tabelas-fonte).
- **Testes:** `tsc --noEmit` (web) e `next build` verdes. Push `6f6e726`, deploy READY, prod 200.
- **Pendências / bloqueios:** sem multi-unidade/rede nem gráficos; números dependem de notas/presenças lançadas.
- **Próximo passo sugerido:** Mensagens internas; Planejamento BNCC; vincular tentativa de simulado a `student_id` real.
- **Commit(s):** `feat: relatorios de direcao (indicadores da escola e por turma)` (`6f6e726`).

### [2026-06-02 04:20] — Simulados/Quizzes — STATUS: EM ANDAMENTO

- **Tarefa:** simulados de múltipla escolha com correção automática (item aberto da Fase 1B.3).
- **Segmento:** 🏫👤
- **O que foi feito:**
  - Schema: `quizzes`, `quiz_questions` (prompt, options[], correct_index, position), `quiz_attempts` (answers jsonb, score, total) — migration `0007`, RLS em todas + grant `authenticated`.
  - `module-pedagogico/quizzes.ts`: createQuiz, addQuizQuestion (índice correto validado), getQuiz, submitQuizAttempt (corrige comparando resposta × correct_index), listQuizzes, listQuizAttempts, deleteQuiz (soft). Gate `activities.bank`; checagem tripla.
  - RBAC: recurso `quiz` adicionado às TEACHING_RESOURCES (professor cria/edita/exclui).
  - UI: `/app/simulados` (lista + criar) e `/app/simulados/[id]` (ver questões com gabarito, adicionar questão, responder com correção automática, resultados por aluno %). Nav: Simulados deixou de ser "em breve".
- **Arquivos principais:** `packages/db/src/schema.ts` + `drizzle/0007_*.sql`, `packages/validation/src/index.ts`, `packages/auth/src/rbac.ts`, `packages/modules/pedagogico/src/quizzes.ts`, `apps/web/src/app/app/actions.ts`, `apps/web/src/app/app/simulados/{page.tsx,[id]/page.tsx}`, `apps/web/src/lib/nav.ts`.
- **Migrations/RLS:** `0007` (quizzes/quiz_questions/quiz_attempts) aplicada em prod + grant `authenticated` (verificado: 4 privilégios por tabela).
- **Testes:** `tsc --noEmit` (db/validation/auth/pedagogico/web) e `next build` verdes. Push `88f0e80`, deploy READY, prod 200.
- **Pendências / bloqueios:** responder hoje é avulso (nome digitado); vincular a `student_id` real e portal do aluno depois. Sem geração de simulado por IA ainda.
- **Próximo passo sugerido:** Mensagens internas; Relatórios de direção; Planejamento BNCC.
- **Commit(s):** `feat: simulados/quizzes com correcao automatica` (`88f0e80`).

### [2026-06-02 03:45] — Import em lote ampliado + /admin destravado — STATUS: EM ANDAMENTO

- **Tarefa:** levar a inserção em massa a onde falta (estilo On Way Condomínio) e aplicar a env do super-admin.
- **Segmento:** 🏫 escola
- **O que foi feito:**
  - Import em lote de **disciplinas** (`/app/escola/disciplinas`, uma por linha) e **responsáveis** (`/app/escola/responsaveis`, formato `Nome; email; telefone`). `createSubjectsBulk` e `createGuardiansBulk` no module-nucleo. Agora há import em massa em turmas, alunos, disciplinas e responsáveis.
  - **`SUPER_ADMIN_EMAILS`** setada na Vercel (prod/preview/dev) com o e-mail do Lucas, autorizado por ele. Deploy `397b6dd` buildado DEPOIS da env, então o `/admin` libera para o e-mail autorizado.
- **Arquivos principais:** `packages/modules/nucleo/src/{academic,guardians}.ts`, `apps/web/src/app/app/actions.ts`, `apps/web/src/app/app/escola/{disciplinas,responsaveis}/page.tsx`.
- **Migrations/RLS:** sem migration.
- **Testes:** `tsc --noEmit` (nucleo + web) e `next build` verdes (turbo deu `spawn UNKNOWN` no Windows, transiente; rodei direto). Push `397b6dd`, deploy READY, prod 200.
- **Pendências / bloqueios:** turbo flaky no Windows local (não afeta CI/Vercel). Mudar o super-admin = atualizar a env na Vercel (Lucas avisa).
- **Próximo passo sugerido:** Simulados/Quizzes; Mensagens internas; Relatórios de direção.
- **Commit(s):** `feat: importacao em lote de disciplinas e responsaveis` (`397b6dd`).

### [2026-06-02 03:20] — Trava /admin + IA→banco + dashboard — STATUS: EM ANDAMENTO

- **Tarefa:** avançar autônomo: trancar o painel de admin, fechar o ciclo IA→banco e dar números reais no início.
- **Segmento:** 🏫👤 + super-admin
- **O que foi feito:**
  - **/admin trancado** por allowlist `SUPER_ADMIN_EMAILS` (server-only). Guard em `app/admin/layout.tsx`; `getSuperAdminEmail()` usa a sessão REAL do Supabase (ignora o cookie de impersonação) e valida o e-mail. Allowlist vazia = ninguém entra (seguro por padrão). Removido o banner "modo aberto".
  - **IA→banco:** `approveDraftToBankAction` aprova o rascunho e cria a atividade no banco pedagógico (kind activity/lesson_plan); botão "Aprovar e salvar no banco" em `/app/ia`. Fecha o human-in-the-loop.
  - **Dashboard `/app`:** cards de próximos eventos e rascunhos pendentes + lista dos próximos 5 eventos.
- **Arquivos principais:** `packages/config/src/env.ts`, `apps/web/src/server/session.ts`, `apps/web/src/app/admin/{layout.tsx,page.tsx}`, `apps/web/src/app/app/{actions.ts,ia/page.tsx,page.tsx}`, `.env.example`.
- **Migrations/RLS:** sem migration.
- **Testes:** lint/typecheck/build 14/14. Push `f22f396`.
- **Pendências / bloqueios:** **`SUPER_ADMIN_EMAILS` ainda NÃO setada em prod** → enquanto isso o `/admin` fica trancado para todos (inclusive o Lucas). Setar na Vercel com o e-mail do Lucas destrava. A tentativa automática foi barrada pelo classificador (não autorizo e-mail por adivinhação).
- **Credenciais/segredos necessários:** `SUPER_ADMIN_EMAILS` (e-mail(s) de super-admin, separados por vírgula) na Vercel.
- **Próximo passo sugerido:** Simulados/Quizzes; Mensagens internas; Relatórios/dashboards de direção.
- **Commit(s):** `feat: trava /admin (allowlist super-admin), IA->banco e dashboard com eventos` (`f22f396`).

### [2026-06-02 02:45] — Exclusão segura (soft delete + lixeira + RBAC) — STATUS: EM ANDAMENTO

- **Tarefa:** permitir apagar com segurança (poder voltar) + permissões + confirmação em ações de alto impacto.
- **Segmento:** 🏫👤 + super-admin
- **O que foi feito:**
  - RBAC (`packages/auth/rbac.ts`): dono/diretor/coordenador gerenciam tudo da escola; professor cria/edita/exclui conteúdo pedagógico da própria org; resto só leitura.
  - **Soft delete + restaurar** em turmas, alunos, atividades, comunicados, eventos (set `deletedAt`); listas filtram `deletedAt`; **/app/lixeira** restaura. Sem migration (deletedAt já existia).
  - **/admin**: excluir escola (soft, reversível) + aba "ver excluídas" + restaurar + **excluir definitivo** (`purgeTenant` apaga dados de todas as tabelas do tenant, exige digitar o nome). **NÃO apaga contas de auth** (Supabase Auth compartilhado com o app financeiro) — decisão de segurança.
  - **ConfirmButton** (client) em ações de alto impacto: excluir turma, comunicado, evento, escola, e exclusão definitiva.
- **Arquivos principais:** `packages/auth/src/rbac.ts`, `packages/modules/nucleo/src/{classes,events,admin}.ts`, `packages/modules/pedagogico/src/activities.ts`, `packages/modules/comunicacao/src/index.ts`, `apps/web/src/components/confirm-button.tsx`, `apps/web/src/app/app/lixeira/*`, `apps/web/src/app/admin/*`.
- **Migrations/RLS:** sem migration (usa `deletedAt` de auditCols).
- **Testes:** lint/typecheck/build 14/14. Push `aebbf1f`.
- **Pendências / bloqueios:** lixeira não tem "excluir definitivo" por item ainda (só restaurar; purge total é no /admin por escola); exclusão de conta de auth fica de fora por design (auth compartilhado). `/admin` ainda aberto (sem login).
- **Próximo passo sugerido:** aprovar rascunho de IA virando atividade no banco; Simulados; Dashboards; depois travar /admin.
- **Commit(s):** `feat: exclusao segura (soft delete + lixeira + confirmacao + RBAC)` (`aebbf1f`).

### [2026-06-02 02:05] — Profundidade + agenda — STATUS: EM ANDAMENTO

- **Tarefa:** import em lote (turmas/alunos), chamada, calendário/eventos, detalhe do aluno, excluir nas listas.
- **Segmento:** 🏫👤
- **O que foi feito:**
  - Import em lote (textarea, estilo Condomínio) em turmas e alunos; `createClassesBulk`/`createStudentsBulk` (respeita cota). Excluir em turmas/alunos (`deleteClass`/`deleteStudent`).
  - Chamada: `/app/sala/chamada` marca presença da turma inteira por data (`recordAttendanceBulk`, upsert).
  - Calendário: tabela `events` (RLS, migration `0006`) + `module-nucleo/events` + `/app/calendario` (agenda por data, criar/excluir).
  - Detalhe do aluno `/app/alunos/[id]`: média, frequência, notas, responsáveis, portfólio.
  - Nav: Calendário (Visão geral) e Chamada (Sala de aula).
- **Migrations/RLS:** `0006` (events) aplicada em prod + grant `authenticated`.
- **Testes:** lint/typecheck/build 14/14. Push `08e0b37`.
- **Pendências / bloqueios:** criação de atividades ainda simples (IA não joga no banco ao aprovar); Simulados/BNCC/Dashboards/Mensagens placeholder; `/admin` aberto.
- **Próximo passo sugerido:** aprovar rascunho de IA virando atividade; Simulados; Dashboards.
- **Commit(s):** `feat: import em lote, chamada, calendario e detalhe do aluno` (`08e0b37`).

### [2026-06-02 01:15] — IA (redação/tutor) + Portfólio — STATUS: EM ANDAMENTO

- **Tarefa:** avançar "em breve" sem ações manuais — correção de redação, tutor do aluno, portfólio.
- **Segmento:** 🏫👤
- **O que foi feito:** IA ganhou tipos `essay` e `tutor` (reusa `ai_drafts`, sem migration) com prompts próprios; páginas `/app/ia/redacao` e `/app/ia/tutor` (componente `IaGenerator`). Portfólio: tabela `portfolio_entries` (RLS, migration `0005`) + `module-pedagogico` (create/list) + página `/app/portfolio`. Nav: 3 itens saem de em-breve.
- **Migrations/RLS:** `0005` (portfolio_entries) aplicada em prod + grant `authenticated`.
- **Testes:** lint/typecheck/build 14/14. Deploy via push (`e5035ee`).
- **Pendências / bloqueios:** `/admin` ainda aberto; essay gated em `ai.activities` (demo usa o mesmo gate; correção fina de plano depois). Simulados, BNCC, Mensagens/WhatsApp, Gestão, Financeiro, Marketplace ainda placeholder.
- **Próximo passo sugerido:** Simulados/BNCC, ou travar /admin.
- **Commit(s):** `feat: correcao de redacao e tutor (IA) + portfolio` (`e5035ee`).

### [2026-06-02 00:45] — Fase 1A.3 / Comunicação / Comunicados com IA — STATUS: EM ANDAMENTO

- **Tarefa:** comunicados (escrever ou gerar por IA, publicar, excluir).
- **Segmento:** 🏫👤
- **O que foi feito:** tabela `communications` (RLS, migration `0004`); `@on-education/module-comunicacao` (create/list/publish/delete + `generateCommunication` via provider do module-ia, com cota + rascunho human-in-the-loop); página `/app/comunicados`; nav Comunicados vira rota real.
- **Migrations/RLS:** `0004` (communications) aplicada em prod + grant `authenticated`.
- **Testes:** lint/typecheck/build 14/14. Deploy READY (`7a208ee`), prod 200.
- **Pendências / bloqueios:** Notification Service (e-mail/push), bilhetes, portal do responsável; `/admin` ainda aberto.
- **Próximo passo sugerido:** auth de super-admin no /admin, ou Simulados/Portfólio.
- **Commit(s):** `feat: comunicados com geracao por IA` (`7a208ee`).

### [2026-06-02 00:10] — Fase 1A.2 / Sala de aula + restrutura de navegação — STATUS: EM ANDAMENTO

- **Tarefa:** sidebar com uma rota por funcionalidade + overview; sala de aula real (diário/notas/faltas/boletim); link mágico.
- **Segmento:** 🏫👤
- **O que foi feito:**
  - `/app` virou layout com **sidebar** (padrão On Condomínio): grupos + itens com ícone e rota ativa; cada funcionalidade tem sua página. `/app` = overview (cards + atalhos).
  - **Sala de aula** (`module-sala-de-aula`): `lessons`/`grades`/`attendance` (migration `0003`, RLS); páginas `/app/sala/{diario,notas,faltas,boletim}`; boletim com média + frequência.
  - Itens não construídos viram `/app/em-breve/[slug]` (navegáveis).
  - **Link mágico**: rota `/auth/confirm` (verifyOtp por token_hash, sem SMTP); links gerados via Admin API.
- **Migrations/RLS:** `0003` (lessons/grades/attendance) aplicada em prod + grant `authenticated`.
- **Testes:** lint/typecheck/build 13/13. Deploy READY (`de92ed0`), prod 200.
- **Pendências / bloqueios:** `/admin` e view-as ainda ABERTOS (sem auth) — travar antes de divulgar. Demais "em breve" (comunicados, simulados, portfólio, financeiro, etc.) seguem como placeholder.
- **Próximo passo sugerido:** auth de super-admin no `/admin`, ou avançar Comunicados/Simulados.
- **Commit(s):** `feat: sidebar com uma rota por funcionalidade e overview` (`e2d288a`), `feat: sala de aula real` (`de92ed0`).

### [2026-06-01 21:40] — UI/Admin / Tema escuro + admin view-as + escola — STATUS: CONCLUÍDO

- **Tarefa:** UI bonita (tema escuro padrão + toggle claro), admin do app com visão de todas as contas e "entrar como" (view-as), e onboarding/gestão da escola.
- **Segmento:** ambos + super-admin
- **O que foi feito:**
  - Tema: `next-themes` (escuro padrão, toggle), tokens HSL (escuro/claro), Tailwind `darkMode:class` + cores (card/muted/border/primary). Telas reestilizadas (home/login/signup/app/admin) com cards, hero, brilho.
  - `/admin` (aberto, TEMPORÁRIO): stats do app (tenants/escolas/professores/usuários/alunos/turmas/atividades) + lista de contas + **Entrar como** (view-as via cookie de impersonação). `module-nucleo/admin.ts` (`listAllTenants`, `getAppStats`).
  - View-as: `resolveContextForTenant` + `getAuthContext` lê o cookie de impersonação; banner no `/app` + "Sair do modo admin".
  - Escola: `/signup/escola` (organization) + `SchoolAdmin` no `/app` (unidades, convites, ano letivo/períodos/disciplinas, responsáveis).
- **Migrations/RLS:** sem mudança.
- **Testes:** lint/typecheck/build 12/12; prod validado (200 em /, /login, /signup, /signup/escola, /admin).
- **Pendências / bloqueios:** **/admin e view-as estão ABERTOS (sem auth)** — travar com auth de super-admin antes de divulgar. Aceite de convite via UI ainda não (só criar/listar). Magic link/SSO depois.
- **Próximo passo sugerido:** 1A.2 (sala de aula) ou auth de admin (proteger /admin).
- **Commit(s):** `feat: tema escuro + admin view-as + onboarding da escola` (`2c872ee`).

### [2026-06-01 20:55] — Deploy / Vercel produção — STATUS: CONCLUÍDO

- **Tarefa:** publicar o On Education na Vercel (GitHub + Vercel).
- **O que foi feito:** repo `Lucasform/on-education` no GitHub (branch `main`); projeto Vercel `on-education` (time `lucas-carvalho-s-projects1`) ligado ao repo, Root Directory `apps/web`, Next.js; 5 env vars setadas (prod/preview/dev); `ssoProtection` desativado (público); deploy de produção READY e validado (HTTP 200 em `/`, `/login`, `/signup`).
- **Prod:** https://on-education-seven.vercel.app (auto-deploy a cada push em `main`).
- **Credenciais/segredos necessários:** nenhuma nova; token Vercel do Lucas (revogável).
- **Próximo passo sugerido:** UI de onboarding da escola (fecha 1A.1 visível) ou 1A.2 (sala de aula).
- **Commit(s):** sem mudança de código (deploy via API/Vercel).

### [2026-06-01 20:25] — Fase 1B.1 / Auth / Supabase e-mail+senha — STATUS: CONCLUÍDO

- **Tarefa:** substituir a cookie de dev pelo Supabase Auth real (e-mail+senha).
- **Segmento:** 👤 professor (vale p/ ambos)
- **O que foi feito:**
  - `apps/web`: `@supabase/ssr` + `@supabase/supabase-js`. `server/supabase.ts` (client de sessão por cookie + client admin service_role). `server/session.ts` agora deriva AuthContext da sessão Supabase → `resolveContextForUser`. `middleware.ts` faz refresh de sessão.
  - Signup cria usuário no Supabase (service_role, `email_confirm:true` → sem SMTP) + provisiona tenant + loga. `/login`, `/logout`. `/app` redireciona p/ `/login` sem sessão.
  - `module-nucleo/context.ts`: `resolveContextForUser` (auth user → membership/tenant).
- **Arquivos principais:** `apps/web/src/server/{supabase,session}.ts`, `apps/web/src/middleware.ts`, `apps/web/src/app/{signup,login,app}/*`, `packages/modules/nucleo/src/context.ts`.
- **Migrations/RLS:** sem mudança.
- **Testes:** lint/typecheck/test/build 12/12; smoke test real: Supabase admin createUser/deleteUser ok.
- **Decisões (ADR?):** auth e-mail+senha com auto-confirm via service_role (evita SMTP); magic link/SSO depois.
- **Pendências / bloqueios:** deploy (GitHub+Vercel); magic link exigiria SMTP Resend no Supabase. Multi-tenant switch futuro.
- **Credenciais/segredos necessários:** nenhuma nova (todas no `.env.local`).
- **Próximo passo sugerido:** 1A.2 (sala de aula) ou UI de onboarding da escola; depois deploy.
- **Commit(s):** `feat: auth com email e senha via Supabase (substitui cookie de dev)` (`99604af`).

### [2026-06-01 19:55] — Infra / Supabase conectado (schema isolado) — STATUS: CONCLUÍDO

- **Tarefa:** ligar o On Education ao Supabase reusando o projeto do On Way Financial, isolado.
- **Segmento:** ambos
- **O que foi feito:**
  - `.env.local` com DATABASE_URL (Session pooler), SUPABASE_URL, SUPABASE_ANON_KEY (publishable) e DEV_SESSION_SECRET gerado.
  - **Isolamento por schema**: tudo em `on_education` (pgSchema), journal de migrations em `drizzle_oe`; `public`/`drizzle` do financeiro intocados.
  - **Fix de RLS**: predicado usa `nullif(current_setting('app.tenant_id',true),'')::uuid` (GUC vazio → zero linhas, não erro de uuid).
  - **`withTenant` roda como papel `authenticated`** (sem BYPASSRLS) para o RLS isolar de fato; `postgres` bypassaria. Migration `0002` concede `authenticated` no schema + default privileges. Provisionamento admin segue como `postgres`.
  - Migrations aplicadas (0000 schema, 0001 fix policies, 0002 grants). Dados de teste truncados.
- **Migrations/RLS:** sim — schema recriado em `on_education`; RLS validado contra o banco real.
- **Testes:** **12/12 verdes contra o Supabase real** (RLS anti-vazamento 3/3, provisionamento professor+escola, turmas/alunos/atividades, IA com cota, convites, acadêmico, responsáveis). lint/typecheck/build 12/12.
- **Decisões (ADR?):** isolamento por schema + papel authenticated no withTenant (atualizar ADR 0002 depois).
- **Pendências / bloqueios:** `SUPABASE_SERVICE_ROLE_KEY` (auth real), `ANTHROPIC_API_KEY` (IA real), GitHub+Vercel (deploy). Supabase Free pode reiniciar o instance (recovery transitório).
- **Credenciais/segredos necessários:** acima. (DATABASE_URL/anon/DEV_SESSION_SECRET já no `.env.local`.)
- **Próximo passo sugerido:** trocar a cookie de dev pelo Supabase Auth (quando vier service_role), e seguir 1A.2.
- **Commit(s):** `feat: conecta Supabase com isolamento por schema on_education` (`04cd2f0`).

### [2026-06-01 19:35] — Fase 1A.1b / Escola / Estrutura acadêmica + responsáveis — STATUS: EM ANDAMENTO

- **Tarefa:** ano letivo/período, disciplinas e vínculo N:N aluno↔responsável.
- **Segmento:** 🏫 escola
- **O que foi feito:**
  - `packages/db`: `academic_years`, `terms`, `subjects`, `guardians`, `student_guardians` (N:N com financeiro/busca/emergência) — tenant-scoped + RLS; migration `0005`. Helper `tenantPolicy` para reduzir repetição.
  - `packages/validation`: schemas de ano/período/disciplina/responsável/vínculo.
  - `module-nucleo`: `academic.ts` (createAcademicYear/listAcademicYears, createTerm/listTerms, createSubject/listSubjects) e `guardians.ts` (createGuardian/listGuardians, linkGuardian, listStudentGuardians) — RBAC + RLS.
- **Arquivos principais:** `packages/db/src/schema.ts`, `packages/db/drizzle/0005_*.sql`, `packages/validation/src/index.ts`, `packages/modules/nucleo/src/{academic,guardians}.ts`.
- **Migrations/RLS:** sim — `0005` com 5 tabelas + RLS.
- **Testes:** verde — module-nucleo agora 3 unit ✓ + 6 integração puladas; total lint/typecheck/test/build 12/12.
- **Decisões (ADR?):** —
- **Pendências / bloqueios:** UI de onboarding/secretaria; séries (grades) e vínculo professor↔disciplina↔turma (1A.2); MFA/auditoria. Integração precisa de `DATABASE_URL`.
- **Credenciais/segredos necessários:** `DATABASE_URL`, trio Supabase, `ANTHROPIC_API_KEY`.
- **Próximo passo sugerido:** UI de onboarding da escola, ou 1A.2 (diário/notas/faltas/boletim).
- **Commit(s):** `feat: escola - estrutura academica e responsaveis (1A.1b)`.

### [2026-06-01 19:10] — Fase 1A.1 / Escola / Núcleo institucional (provisionamento + convites) — STATUS: EM ANDAMENTO

- **Tarefa:** onboarding da escola (tenant `organization`), unidades e convite/aceite de membros.
- **Segmento:** 🏫 escola
- **O que foi feito:**
  - `packages/db`: tabelas `units` e `invitations` (tenant-scoped + RLS; `invitations.token` único); migration `0004`.
  - `packages/validation`: `organizationSignupSchema`, `createUnitSchema`, `inviteMemberSchema`, `acceptInvitationSchema`.
  - `module-nucleo/organization.ts`: `provisionOrganizationTenant` (owner+director, plano `school_starter`, entitlements, usage_meter, unidade "Sede"); `createUnit/listUnits`; `inviteMember` (gera token), `listInvitations`, `acceptInvitation` (admin/server-only: cria membership e marca convite aceito — mesmo padrão do provisionamento, ADR 0003).
- **Arquivos principais:** `packages/db/src/schema.ts`, `packages/db/drizzle/0004_*.sql`, `packages/validation/src/index.ts`, `packages/modules/nucleo/src/organization.ts`.
- **Migrations/RLS:** sim — `0004` com `units`/`invitations` + RLS.
- **Testes:** verde — module-nucleo 3 unit ✓ + 4 integração puladas; total lint/typecheck/test/build 12/12.
- **Decisões (ADR?):** reusa o padrão administrativo do ADR 0003 para `acceptInvitation`.
- **Pendências / bloqueios:** estrutura acadêmica (anos/períodos/séries/disciplinas/responsáveis N:N) e UI de onboarding da escola; MFA/auditoria. Integração precisa de `DATABASE_URL`.
- **Credenciais/segredos necessários:** `DATABASE_URL` (testes/rodar), trio Supabase (auth real), `ANTHROPIC_API_KEY` (IA).
- **Próximo passo sugerido:** 1A.1b — `academic_years`/`terms`/`subjects` + `guardians`/`student_guardians` (N:N); depois UI de onboarding.
- **Commit(s):** `feat: nucleo institucional da escola - provisionamento, unidades e convites (1A.1)`.

### [2026-06-01 18:45] — Fase 1B.2 / Web / UI de IA — STATUS: EM ANDAMENTO

- **Tarefa:** expor a IA no dashboard — gerar rascunho, revisar, aprovar/descartar (human-in-the-loop).
- **Segmento:** 👤 professor
- **O que foi feito:** `/app` ganhou seção de IA: form de geração (kind + prompt) visível só quando `isAiConfigured()`; senão um aviso pedindo `ANTHROPIC_API_KEY`. Lista de rascunhos com ações Aprovar/Descartar. Server actions `generateDraftAction/approveDraftAction/discardDraftAction`.
- **Arquivos principais:** `apps/web/src/app/app/{page.tsx,actions.ts}`, `apps/web/{package.json,next.config.mjs}`.
- **Migrations/RLS:** sem mudança.
- **Testes:** lint/typecheck/test/build 12/12 verdes.
- **Decisões (ADR?):** —
- **Pendências / bloqueios:** geração real precisa de `ANTHROPIC_API_KEY`; exercício em runtime precisa de `DATABASE_URL`. Com isso, o loop 1B (signup → turmas/alunos/atividades → gerar/aprovar IA) está completo na UI.
- **Credenciais/segredos necessários:** `ANTHROPIC_API_KEY`, `DATABASE_URL`, `DEV_SESSION_SECRET`, trio Supabase.
- **Próximo passo sugerido:** com credenciais — Supabase Auth + migrate + integração + geração real. Sem — Fase 1A (escola) ou 1B.3 (simulados/portfólio).
- **Commit(s):** `feat: UI de IA no dashboard (1B.2)`.

### [2026-06-01 18:25] — Fase 1B.2 / IA pedagógica / Cota + rascunho — STATUS: EM ANDAMENTO

- **Tarefa:** scaffolding da IA — geração com human-in-the-loop, cota por plano e medição de tokens.
- **Segmento:** 🏫👤 (gates `ai.lessonPlan`/`ai.activities`)
- **O que foi feito:**
  - `packages/db`: tabela `ai_drafts` (tenant-scoped + RLS, status draft/approved/discarded, tokens); migration `0003`.
  - `packages/validation`: `generateDraftSchema` + `aiDraftKindSchema`.
  - Novo módulo `@on-education/module-ia`: `provider.ts` (contrato `AiProvider` + `createAnthropicProvider` via fetch, modelo de config; `isAiConfigured`), `quota.ts` (`getUsedTokens`/`tokensRemaining`/`assertWithinQuota`/`recordUsage` upsert em `usage_meters`), `drafts.ts` (`generateDraft` com checagem tripla + cota + persiste rascunho + mede tokens, provider injetável; `approveDraft`/`discardDraft`/`listDrafts`).
- **Arquivos principais:** `packages/db/src/schema.ts`, `packages/db/drizzle/0003_*.sql`, `packages/validation/src/index.ts`, `packages/modules/ia/src/*`.
- **Migrations/RLS:** sim — `0003` com `ai_drafts` + RLS.
- **Testes:** verde — module-ia 3 unit ✓ (cota) + 1 integração (provider fake, roda só com `DATABASE_URL`); total lint/typecheck/test/build 12/12.
- **Decisões (ADR?):** —
- **Pendências / bloqueios:** geração real precisa de `ANTHROPIC_API_KEY`; UI de IA no `/app` não feita; integração precisa de `DATABASE_URL`. Cache de prompt e RAG (pgvector) ficam para evolução.
- **Credenciais/segredos necessários:** `ANTHROPIC_API_KEY` (geração), `DATABASE_URL` + `DEV_SESSION_SECRET` (rodar/local), trio Supabase (auth real).
- **Próximo passo sugerido:** com credenciais — Supabase Auth + integração + geração real + UI de IA. Sem credenciais — UI de geração/aprovação (inerte sem key) ou iniciar 1A (escola).
- **Commit(s):** `feat: IA pedagogica - cota, rascunho human-in-the-loop e provider Anthropic (Fase 1B.2)`.

### [2026-06-01 18:05] — Fase 1B.1 / Web / Signup + dashboard — STATUS: EM ANDAMENTO

- **Tarefa:** colocar o produto de pé no `apps/web` — signup do professor e workspace (turmas/alunos/atividades).
- **Segmento:** 👤 professor
- **O que foi feito:**
  - `apps/web/src/server`: `db.ts` (client server-only) e `session.ts` (sessão por cookie **assinada por HMAC** com `DEV_SESSION_SECRET`; tenant derivado do servidor, nunca do client). Stopgap até Supabase Auth.
  - `/signup` (form + server action `signupAction`): provisiona tenant individual e abre sessão.
  - `/app` (RSC `force-dynamic`): lista turmas/alunos/atividades e formulários (server actions) para criar cada um, via serviços dos módulos.
  - `next.config` transpila os pacotes do monorepo; home com links.
  - Ajuste: `@on-education/db` deixou de reexportar `migrate` no entry (o `new URL('../drizzle')` quebrava o webpack do Next); agora em `@on-education/db/migrate`.
- **Arquivos principais:** `apps/web/src/server/{db,session}.ts`, `apps/web/src/app/signup/*`, `apps/web/src/app/app/*`, `apps/web/next.config.mjs`, `packages/db/{src/index.ts,package.json}`.
- **Migrations/RLS:** sem mudança (reuso de `0001`/`0002`).
- **Testes:** lint/typecheck/test/build 11/11 verdes; `/app` build como dinâmica, `/signup` estática.
- **Decisões (ADR?):** sessão de dev documentada em `session.ts` (substituível por Supabase Auth sem mudar a interface).
- **Pendências / bloqueios:** auth real (Supabase) e execução com banco dependem de credenciais; UI não exercitada em runtime aqui (sem `DATABASE_URL`).
- **Credenciais/segredos necessários:** `DATABASE_URL` + `DEV_SESSION_SECRET` para rodar local; trio Supabase para auth real; `ANTHROPIC_API_KEY` para IA.
- **Próximo passo sugerido:** scaffolding de IA (1B.2): cota via `usage_meters`, rascunho human-in-the-loop, adapter Anthropic com geração plugável na key.
- **Commit(s):** `feat: web — signup e dashboard do professor (Fase 1B.1)`.

### [2026-06-01 17:35] — Fase 1B.3 / Pedagógico / Banco de atividades — STATUS: EM ANDAMENTO

- **Tarefa:** banco de atividades pessoal (CRUD, tags, busca) do professor.
- **Segmento:** 🏫👤 (gate `activities.bank`)
- **O que foi feito:** tabela `activities` (tenant-scoped + RLS, `tags text[]`, `ai_generated`; migration `0002`); schemas Zod (create/update/search); módulo `@on-education/module-pedagogico` com `createActivity/updateActivity/deleteActivity(soft)/listActivities` (busca por tag e título), checagem tripla.
- **Arquivos principais:** `packages/db/src/schema.ts`, `packages/db/drizzle/0002_*.sql`, `packages/validation/src/index.ts`, `packages/modules/pedagogico/src/*`.
- **Migrations/RLS:** sim — `0002` com `activities` + RLS.
- **Testes:** verde — pedagogico 1 unit ✓ + 1 integração pulada; total lint/typecheck/test/build 11/11.
- **Decisões (ADR?):** —
- **Pendências / bloqueios:** simulados/portfólio (1B.3 restante) não feitos; integração roda com `DATABASE_URL`.
- **Credenciais/segredos necessários:** `DATABASE_URL` (testes); `ANTHROPIC_API_KEY` (IA, 1B.2).
- **Próximo passo sugerido:** wiring web + UI; depois scaffolding de IA (cota + rascunho).
- **Commit(s):** `feat: banco de atividades pessoal (Fase 1B.3)`.

### [2026-06-01 17:05] — Fase 1B.1 / Núcleo individual / Provisionamento + turmas — STATUS: EM ANDAMENTO

- **Tarefa:** núcleo do professor autônomo — provisionamento do tenant `individual` e gestão leve de turmas/alunos.
- **Segmento:** 👤 professor
- **O que foi feito:**
  - `packages/db`: novas tabelas `classes` e `students` (tenant-scoped + RLS); migration `0001_sparkling_jetstream.sql`.
  - `packages/validation`: schemas `individualSignupSchema`, `createClassSchema`, `createStudentSchema`.
  - Novo módulo `packages/modules/nucleo` (`@on-education/module-nucleo`):
    - `provisionIndividualTenant` (admin/server-only): cria tenant + membership owner/teacher + subscription `teacher_free` + entitlements semeados + `usage_meter` de `ai_tokens`.
    - `entitlement.ts`: `getTenantPlanId` + `assertEntitled` (perna comercial da checagem tripla).
    - `classes.ts`: `createClass/listClasses/createStudent/listStudents` com RBAC + entitlement + RLS; cota de alunos por plano.
  - Workspace passou a incluir `packages/modules/*`.
- **Arquivos principais:** `packages/db/src/schema.ts`, `packages/db/drizzle/0001_*.sql`, `packages/validation/src/index.ts`, `packages/modules/nucleo/src/*`.
- **Migrations/RLS:** sim — `0001` com `classes`/`students` + `ENABLE RLS` + `CREATE POLICY`.
- **Testes:** verde — `module-nucleo` 2 unit ✓ (plano default) + 2 integração escritos e PULADOS sem `DATABASE_URL`; demais suites ok. lint 10/10, typecheck 10/10, build 10/10.
- **Decisões (ADR?):** `docs/adr/0003-provisionamento-tenant-individual.md`.
- **Pendências / bloqueios:** sem `DATABASE_URL`/Supabase não dá pra (a) rodar os testes de integração, (b) wirar auth real ao signup, (c) construir a UI do fluxo. Provisionamento e serviços estão prontos para plugar.
- **Credenciais/segredos necessários:** `DATABASE_URL` (ou trio Supabase) para destravar; depois `ANTHROPIC_API_KEY` (1B.2 IA).
- **Próximo passo sugerido:** criar projeto Supabase, setar `DATABASE_URL`, aplicar migrations (`pnpm db:migrate`), rodar os testes de integração; em seguida wiring de Supabase Auth no signup + UI de signup/dashboard. Depois 1B.2 (IA pedagógica).
- **Commit(s):** `feat: nucleo individual — provisionamento de tenant e gestao de turmas/alunos (Fase 1B.1)`.

### [2026-06-01 16:10] — Fase 0 / Fundação / Bootstrap do monorepo — STATUS: CONCLUÍDO

- **Tarefa:** montar a fundação multi-tenant (sem feature de produto) conforme PROMPT-INICIAL §A e Master Spec §13.
- **Segmento:** ambos
- **O que foi feito:**
  - Organização do repo: `git init`, docs movidos para `docs/`, `docs/adr/` criada.
  - `docs/ROADMAP-DELIVERIES.md` **corrigido** (era cópia do Master Spec) → roadmap real (Fases 0, 1B, 1A, 2–5).
  - Monorepo pnpm + Turborepo; `apps/web` (Next 15 + TS strict + Tailwind + shadcn-style), `apps/worker` (esqueleto).
  - `packages/`: config (env Zod + flags + modelos IA + logger sem PII), core (Tenant/TenantType/Role), validation (Zod), db (Drizzle + 8 tabelas + RLS + `withTenant`), auth (RBAC + contexto de tenant), entitlements (planos + `canUse`), ui (cn + Button).
  - Qualidade: ESLint 9 flat + Prettier + husky (pre-commit/commit-msg) + lint-staged + commitlint; CI GitHub Actions (lint→typecheck→test→build).
  - Migration inicial gerada (`packages/db/drizzle/0000_*.sql`) com `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` em todas as tabelas tenant-scoped.
- **Arquivos principais:** `package.json`, `turbo.json`, `tsconfig.base.json`, `eslint.config.mjs`, `apps/web/*`, `packages/*/src/*`, `.github/workflows/ci.yml`, `docs/adr/0001-*.md`, `docs/adr/0002-*.md`.
- **Migrations/RLS:** sim — `0000_petite_kronos.sql` (RLS por `tenant_id = current_setting('app.tenant_id', true)::uuid`).
- **Testes:** `pnpm test` verde — entitlements 4✓; teste anti-vazamento de tenant (db) escrito e PULADO por falta de `DATABASE_URL`. lint 9/9, typecheck 9/9, build 9/9 (Next compilou).
- **Decisões (ADR?):** `docs/adr/0001-fundacao-stack.md`, `docs/adr/0002-tenancy-rls.md`.
- **Pendências / bloqueios:**
  - Rodar o teste de RLS de verdade exige um Postgres (`DATABASE_URL`); sem ele o suite é pulado.
  - `apps/worker` e `packages/{modules,notifications,billing}` são placeholders.
  - Auth/RBAC e resolução de tenant são esqueletos (implementação real no Núcleo).
- **Credenciais/segredos necessários:** `DATABASE_URL` (ou `SUPABASE_URL`+`SUPABASE_ANON_KEY`+`SUPABASE_SERVICE_ROLE_KEY`); `ANTHROPIC_API_KEY` (fases de IA); `SENTRY_DSN` (opcional). Nenhum valor no repo.
- **Próximo passo sugerido:** **Fase 1B — Professor Pro (1B.1 Núcleo individual)** para caminho rápido de receita B2C; alternativa: Fase 1A.1 (Núcleo institucional).
- **Commit(s):** `chore: bootstrap do monorepo multi-tenant (Fase 0)`.

### [AAAA-MM-DD HH:MM] — Fase 0 / Núcleo / Bootstrap — STATUS: EM ANDAMENTO

- **Tarefa:** projeto iniciado; documentos-fonte adicionados.
- **Segmento:** ambos
- **O que foi feito:** specs e CLAUDE.md no repositório; PROGRESS.md criado.
- **Arquivos principais:** CLAUDE.md, docs/SAAS-EDUCACIONAL-MASTER-SPEC.md, docs/ROADMAP-DELIVERIES.md, docs/PROGRESS.md
- **Migrations/RLS:** não
- **Testes:** —
- **Decisões (ADR?):** —
- **Pendências / bloqueios:** executar a Fase 0 (fundação do monorepo).
- **Credenciais/segredos necessários:** a definir no bootstrap (provável: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY).
- **Próximo passo sugerido:** rodar o "Prompt de BOOTSTRAP".
- **Commit(s):** docs: adiciona specs, CLAUDE.md e PROGRESS inicial
