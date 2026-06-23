# MVP — Escopo, Segurança, Dívida técnica e Feedback (On Education)

Disciplina da etapa MVP do Founder's Playbook. Complementa o MASTER-SPEC e os ADRs
em `docs/`. Atualizado 2026-06-23.

---

## 1. Escopo (o que faz, o que NÃO faz)

### O produto faz
- Multi-tenant: cada escola ou professor autônomo no seu ambiente isolado.
- Gestão acadêmica: turmas, matérias, alunos, matrículas, notas, frequência.
- Conteúdo e avaliações, com IA que sugere e melhora plano de aula, atividades e provas.
- Cobrança por assinatura (Stripe), entitlements por plano.

### O produto NÃO faz (por decisão)
- Não é folha de pagamento nem ERP financeiro da escola.
- Não emite documento fiscal/contábil.
- Backlog Fase 2 (NÃO fazer agora sem go explícito): painel de rede multi-escola,
  app mobile, módulos personalizáveis por matéria, IA sugerir vídeo do YouTube,
  gamificação avançada, relatório por aluno em PDF.

### Critério para adicionar uma feature nova
Só entra com evidência de usuário (várias escolas/professores pedindo o mesmo) e
passando pelo checkpoint docs-driven (design, go/no-go, build, validação). Entusiasmo
não é critério.

## 2. Controle de scope creep
- Workflow docs-driven com checkpoint obrigatório por fase (já praticado).
- Fase 2 explicitamente travada como backlog até go do Lucas.

## 3. Revisão de segurança (antes de usuários reais)
Checklist do estado atual:
- [x] RLS por `tenant_id` em todas as tabelas, com teste de anti-vazamento entre tenants.
- [x] MFA (TOTP) implementado (páginas de ativação e desafio).
- [x] Segredos no `.gitignore` (verificado: `.env.local` não versionado; o alarme de
      "vazamento no git" foi falso, as chaves estão só no arquivo local).
- [x] CI roda lint + typecheck + test + build, bloqueando em falha.
- [ ] **Pendente:** tornar MFA obrigatório para `ADMIN_ROLES` (hoje é opcional).
- [ ] **Pendente:** habilitar `FORCE ROW LEVEL SECURITY` (backstop), citado como opcional.
- [ ] **Pendente:** rotacionar a `STRIPE_SECRET_KEY` de teste antes do go-live em produção.

## 4. Dívida técnica conhecida (logar sempre)
- Drift de migrations: o journal em `drizzle_oe.__drizzle_migrations` pode mentir;
  verificar o schema real antes de culpar o app; aplicar `.sql` idempotente.
- Faltam testes de UI e E2E (hoje só unitários nos packages).
- MFA opcional (enforcement pendente, ver segurança).
> Regra: toda dívida assumida entra aqui, com motivo e quando pagar.

## 5. Loop de feedback do usuário
- **Hoje (parcial):** `content_ratings` + `buildTrainingContext` capturam aprovação/
  rejeição do professor sobre o conteúdo da IA (data flywheel, item de Scale também).
- **Falta:** intake estruturado de bug/feature request geral (não só rating de conteúdo).
- **Próximo passo (build curto):** tabela `user_feedback` (tipo, descrição, tenant) +
  modal "Enviar feedback" + síntese semanal para o admin. Manter humano no loop.

---

## 6. Etapas 3-4 — Launch & Scale (prontidão)

### 19. Produto aguenta carga de produção
- Stack gerenciada (Vercel + Supabase) escala bem no início; CI roda lint, typecheck, test, build.
- Pendente: monitoramento de runtime (Sentry está no `.env.example`, ativar) e teste de carga.

### 20. Segurança e compliance (LGPD com menores)
- Dados pessoais de alunos, muitos menores: exige consentimento do responsável.
- RLS por tenant com teste de anti-vazamento, MFA (TOTP), segredos no `.gitignore`.
- Definir retenção e direitos do titular; tornar MFA obrigatório para admin (pendente).

### 24. Moat por profundidade de domínio
- `DOMINIO.md` externaliza regras acadêmicas e edge cases da vertical.
- Reforço: o data flywheel (content_ratings) embute a forma de ensinar de cada professor.

### 26. Workflow lock-in via integrações
- Integração atual: Stripe (cobrança). 
- Próximo nível: importar de Google Classroom, API/webhook para o sistema da escola.

### 28. Codificar conhecimento institucional
- Conhecimento vive em: CLAUDE.md, MASTER-SPEC, ADRs (docs/adr), DOMINIO.md, ROADMAP, skills e memória.
- Mantém o conhecimento transferível e fora da cabeça do fundador.

> Dependem de build (não marcar verde sem código): integrações de lock-in (26); enforcement de MFA (parte do 20/14).
