# On Education — Roadmap

> Status atualizado em: 2026-06-21

---

## Fundação (Fase 0 + 1A)

| Fase | Status | Descrição |
|------|--------|-----------|
| **Autenticação multi-tenant** | ✅ Completo | Login Supabase, JWT, isolamento por tenant |
| **Perfil de escola / professor** | ✅ Completo | Tenant settings, logo, dados institucionais |
| **Planos e entitlements** | ✅ Completo | teacher_free, school_basic, school_full; guards de feature |
| **Convites e membros** | ✅ Completo | Invite por e-mail, roles (owner/director/teacher/etc.) |
| **Turmas e alunos** | ✅ Completo | CRUD, vínculos, matrícula individual e em lote |
| **Responsáveis** | ✅ Completo | Cadastro, vínculo aluno-responsável, múltiplos vínculos |
| **Ano letivo e períodos** | ✅ Completo | Ano letivo, bimestres/trimestres configuráveis |
| **Disciplinas e vínculos** | ✅ Completo | Disciplinas, professores por turma/matéria |
| **Calendário escolar** | ✅ Completo | Eventos, feriados, visualização mensal |

---

## Sala de Aula (Fase 1B)

| Módulo | Status | Descrição |
|--------|--------|-----------|
| **Planejamento de aulas** | ✅ Completo | Planos diários e semanais |
| **Plano de curso** | ✅ Completo | Unidades curriculares por disciplina |
| **Diário de classe** | ✅ Completo | Registro de aulas, conteúdo, observações |
| **Chamada** | ✅ Completo | Frequência diária, presença/falta por aluno |
| **Notas** | ✅ Completo | Pesos configuráveis, componentes de nota |
| **Boletim** | ✅ Completo | PDF imprimível por turma ou aluno |
| **Portfólio** | ✅ Completo | Trabalhos e evidências do aluno |
| **Ocorrências** | ✅ Completo | Registro disciplinar/pedagógico, gravidade |
| **Cronograma** | ✅ Completo | Grade horária semanal por turma |

---

## Comunicação (Fase 1C)

| Módulo | Status | Descrição |
|--------|--------|-----------|
| **Comunicados** | ✅ Completo | Avisos publicados para escola/turma |
| **Mural dos pais** | ✅ Completo | Feed de comunicações por responsável |
| **Mensagens internas** | ✅ Completo | Chat entre membros da escola |
| **WhatsApp** | ✅ Completo | Integração via Evolution API, instâncias por escola |
| **Inbox WhatsApp** | ✅ Completo | Conversas de contato, histórico |

---

## Pedagógico / IA (WayOn)

| Módulo | Status | Descrição |
|--------|--------|-----------|
| **Banco de atividades** | ✅ Completo | Criação, categorização e compartilhamento |
| **Banco coletivo** | ✅ Completo | Atividades compartilhadas entre escolas |
| **Simulados e quizzes** | ✅ Completo | Criação de provas com questões, tentativas |
| **Gerar conteúdo (IA)** | ✅ Completo | Planos de aula, atividades, resumos com IA |
| **Correção em lote (IA)** | ✅ Completo | Correção automática de redações |
| **Flashcards (IA)** | ✅ Completo | Baralhos de estudo gerados por IA |
| **Gerar imagem (IA)** | ✅ Completo | Imagens para material didático |
| **Tutor do aluno** | ✅ Completo | Chat IA focado em conteúdo escolar |
| **Padrão de correção** | ✅ Completo | Amostras de referência por disciplina |

---

## Financeiro

| Módulo | Status | Descrição |
|--------|--------|-----------|
| **Mensalidades** | ✅ Completo | Geração, controle e baixa de cobranças |
| **Inadimplência** | ✅ Completo | Relatório de faturas em aberto |

---

## Gestão e Analytics

| Módulo | Status | Descrição |
|--------|--------|-----------|
| **Relatórios de frequência** | ✅ Completo | Dashboard de faltas por turma/aluno |
| **Dashboards** | ✅ Completo | Visão geral da escola (métricas) |
| **Auditoria** | ✅ Completo | Log de ações dos membros |
| **API aberta** | ✅ Completo | API keys por tenant, docs de integração |

---

## Integrações

| Módulo | Status | Descrição |
|--------|--------|-----------|
| **Webhooks de integração** | ✅ Completo (2026-06-15) | Endpoints configuráveis por tenant; eventos: student.created, grade.posted, attendance.recorded, payment.received, occurrence.created |

---

## Novas Features (2026-06-15)

| Feature | Status | Localização na nav |
|---------|--------|--------------------|
| **Conselho de Classe** | ✅ Completo | Sala de aula |
| **Diário Infantil** | ✅ Completo | Sala de aula |
| **Autorização de Saída** | ✅ Completo | Sala de aula |
| **Inventário de Equipamentos** | ✅ Completo | Gestão e analytics |
| **Justificativas de Falta** | ✅ Completo | Comunicação |
| **Agendamento de Reunião** | ✅ Completo | Comunicação |
| **Portal do Responsável** | ✅ Completo | Responsáveis → gerar link; acesso em /portal/[token] |
| **Webhooks de Integração** | ✅ Completo | Integrações |
| **Multi-escola (Rede)** | 🔜 Planejado | Fase futura — tabela `networks` criada, UI pendente |

---

## Lançamento (pré-lançamento)

> Status técnico: **pronto para lançar**. Tudo abaixo já está em prod, exceto a ativação do pagamento (mão do Lucas).

| Item | Status | Notas |
|------|--------|-------|
| **Jurídico / LGPD** | ✅ Completo | `/privacidade` + `/termos` (controlador/operador, dados de menores, suboperadores, direitos do titular); consentimento nos 3 cadastros; links no rodapé. Revisar com advogado. |
| **Funil de entrada** | ✅ Completo | Landing → cadastro (professor/escola/e-mail, link mágico, slug) → login → app |
| **Segurança** | ✅ 8/10 | Isolamento withTenant+RLS, headers de hardening, 2FA opcional. Backstop role-sem-bypass = opcional (8→9). |
| **Identidade / UX** | ✅ Completo | Marca, splash, loading nos botões, barra de progresso |
| **Cobrança (código)** | ✅ Pronto | Stripe Checkout + webhook assinado (`server/billing.ts` + `/api/billing/webhook`). **Sem as chaves, plano pago ativa de graça (modo ativação imediata).** |

### ⏳ PAGAMENTO — fazer quando o Lucas pedir "vamos começar a parte de pagamento"
**Gatilho:** quando o Lucas pedir para começar a parte de pagamento, **o Claude ENSINA o passo a passo** (ele faz no painel; eu oriento). Roteiro:
1. Criar os 4 preços no Stripe (live): `teacher_basic` R$39, `teacher_pro` R$79, `school_starter` R$549, `school_full` R$999.
2. Criar o webhook no Stripe → `https://eduonway.com/api/billing/webhook` (evento `checkout.session.completed`).
3. Setar no Vercel (Production): `STRIPE_SECRET_KEY` (live), `STRIPE_WEBHOOK_SECRET` (live), `APP_PUBLIC_URL=https://eduonway.com`, `STRIPE_PRICE_PLAN_TEACHER_BASIC`, `_TEACHER_PRO`, `_SCHOOL_STARTER`, `_SCHOOL_FULL`. Redeploy.
4. Ativar Pix/boleto no Stripe (opcional).
5. Testar um checkout real e conferir que o webhook aplica plano/entitlements.

### Opcional pós-lançamento (não bloqueia)
- Backstop de segurança (role sem bypass) — 8→9.
- Cache nas páginas leves (navegação instantânea).
- Override de limites/cotas por conta no admin.

---

## Backlog / Fase 2

| Feature | Prioridade | Notas |
|---------|------------|-------|
| **Multi-escola (painel da rede)** | Alta | Base de dados pronta (`networks`, `tenants.network_id`); falta UI de painel consolidado |
| **App mobile (responsável)** | Média | Portal público como PWA base |
| **Módulos personalizáveis por matéria** | Média | Ver `project_on_education_fase2_ideias.md` |
| **IA sugerir vídeos YouTube** | Baixa | API YouTube Key disponível; aguardar validação pedagógica |
| **Relatório de progresso por aluno (PDF)** | Média | Geração automatizada para responsável |
| **Gamificação avançada (ranking)** | Baixa | `student_points` já existe; falta leaderboard |

---

## Arquitetura

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 15, App Router, Tailwind CSS, TypeScript |
| Backend | Next.js Server Actions, módulos em packages/modules/* |
| Banco | Supabase PostgreSQL, schema `on_education`, RLS por tenant |
| ORM | Drizzle ORM — schema em `packages/db/src/schema.ts` |
| Auth | Supabase Auth (JWT) + GUC `app.tenant_id` para RLS |
| IA | Anthropic SDK (claude-sonnet-4-6), OpenAI para embeddings |
| WhatsApp | Evolution API em Railway (multi-instância) |
| Deploy | Vercel (web), Supabase (banco) |

---

## Padrões de desenvolvimento

- **Multi-tenant**: toda tabela tem `tenant_id` + RLS policy `tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid`
- **Módulos**: lógica de domínio em `packages/modules/{nucleo,ia,pedagogico,sala-de-aula,comunicacao}/src/*.ts`
- **Migrations**: `drizzle-kit generate` gera SQL; aplicar com `pnpm db:migrate` no diretório `packages/db` (ou aplicar `.sql` diretamente em caso de drift)
- **Drift de migrations**: journal em `drizzle_oe.__drizzle_migrations` pode divergir. Aplicar `.sql` idempotente diretamente quando necessário.
- **Sem FK rígidas**: integridade via aplicação + RLS; FK omitidas para performance
