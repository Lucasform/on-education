# On Education — Contexto de Projeto

**Status**: Ativo | **Tipo**: SaaS Educacional (Next.js + Drizzle + Supabase)
**Diretório Real**: `Desktop\On Way\On education`

---

## 🎯 O que é

Plataforma educacional multi-tenant para cursos online. Stack: Next.js 14, Drizzle ORM, Supabase (PostgreSQL + RLS), TypeScript. Design docs-driven com checkpoints obrigatórios.

---

## 🔒 Ambiente

| Recurso | Valor |
|---------|-------|
| **Supabase Project** | tioajglbvclchzcsasfl (compartilhado) |
| **Schema** | `on_education` |
| **Auth** | Supabase Auth (JWT) |

---

## 📋 Roadmap

| Fase | Status | Descrição |
|------|--------|-----------|
| **0** | ✅ MVP | Autenticação, cursos, módulos, lições básicas |
| **1A** | 🔜 | (Phase 1A) |
| **1B** | 🔜 | Próximo passo após 1A |
| **Fase 2** | 📋 Ideias | Módulos personalizáveis + IA sugerir YouTube (backlog, não iniciar sem go) |

**Workflow**: Docs-driven. Cada fase tem checkpoint obrigatório antes de começar.

---

## 🏗️ Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Drizzle ORM
- **Database**: PostgreSQL on_education schema (courses, modules, lessons, enrollments)
- **Auth**: Supabase Auth

---

## 🔄 Workflow

```
1. Fase X inicia
   ├─ Design doc criado (spec completo)
   ├─ Checkpoint: Lucas revisa (go/no-go)
   ↓
2. Se GO: develop
   ├─ Drizzle migrations
   ├─ API routes
   ├─ UI components
   ├─ Tests
   ↓
3. Fase X concluída
   ├─ Captura padrões em memory
   ├─ Próxima fase pode iniciar
```

---

## 🛠️ Convenções

- **DB**: Drizzle schema (typed), migrations versionadas
- **API**: RESTful, versioning (v1/)
- **RLS**: Policies por tenant (multi-tenant isolation obrigatória)

---

## 📚 Referências

- Credenciais Supabase: `reference_supabase_credentials_on_education.md` (Memory)
- Fase 2 ideias: `project_on_education_fase2_ideias.md` (Memory, backlog)

---

## 🌐 Domínio do produto

Conhecimento de domínio (regras acadêmicas, LGPD com menores, edge cases) em
[`DOMINIO.md`](DOMINIO.md). Consultar antes de implementar lógica de notas,
frequência, matrícula ou IA pedagógica.

---

## 🧪 Ritual de pré-mortem / advogado do diabo (obrigatório)

Antes de qualquer mudança significativa (feature, schema, integração):

1. **Pré-mortem:** "6 meses no futuro, isso falhou. Quais as 3 causas mais prováveis?"
2. **Advogado do diabo:** pedir ao Claude para argumentar CONTRA a ideia e achar
   evidência que a refute, não que a confirme. Postura padrão: cético.
3. **Premissas:** listar as 3 premissas de que a ideia mais depende; o que precisa
   ser verdade, e o que acontece se não for.
4. Só prosseguir se as respostas não derrubarem a ideia. Registrar a conclusão no
   doc da fase / decisão.

---

**Contato**: lucas.gonzaga (pessoal)
**Última atualização**: 2026-06-23
