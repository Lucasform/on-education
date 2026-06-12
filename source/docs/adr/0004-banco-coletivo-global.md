# ADR 0004 — Banco de atividades coletivas como tabela global (sem tenant_id)

- **Status:** aceito (2026-06-03)
- **Contexto:** o item 13 do roadmap pede um banco de atividades coletivas "padrão On Way, sem vínculo com a escola, por faixa etária". Diferente de todo o resto do produto, esse acervo é **compartilhado entre todos os tenants**, não isolado por escola.

## Decisão

Criar a tabela `shared_activities` **sem `tenant_id`** (global), com:

- RLS habilitado, mas com policy **permissiva** (`using true / with check true`): o acervo é público por design.
- Acesso da aplicação via a **conexão dona** (`client.db`, sem `withTenant`), que não passa pelo RLS de tenant — coerente com uma tabela compartilhada.
- Apenas **conteúdo pedagógico não sensível** entra: título, disciplina, conteúdo, faixa etária, tags. **Nunca** `tenant_id`, nome de aluno, ou qualquer PII.
- Fluxo: o professor **compartilha** uma atividade do próprio banco (cópia anonimizada) e qualquer um **copia** uma coletiva para o seu banco (via `createActivity`, que volta a ser tenant-scoped).

## Consequências

- **Positivas:** acervo comunitário cresce com o uso; não quebra o isolamento das atividades privadas (que continuam tenant-scoped com RLS).
- **Atenção:** como é o primeiro objeto global, futuros itens globais devem seguir o mesmo padrão (conteúdo não sensível + acesso pela conexão dona). Moderação/denúncia de conteúdo impróprio fica como evolução. Sem ownership por linha no MVP (sem editar/excluir alheio); evoluir depois.

Migration: `0021`. Tabela: `on_education.shared_activities`. Módulo: `@on-education/module-pedagogico` (`collective.ts`). UI: `/app/banco-coletivo`.
