# Domínio — On Education

> Conhecimento de domínio externalizado para a IA (o "moat" do cap. 6 do playbook).
> O Claude lê isto antes de implementar lógica acadêmica. **Lucas: adicione edge
> cases reais conforme aparecem; cada um vira vantagem difícil de copiar.**

## Conceitos-chave (educação no Brasil)

- **Ano letivo** dividido em períodos: bimestre, trimestre ou semestre (configurável por escola).
- **Notas:** média (simples ou ponderada), recuperação, conselho de classe. Escalas
  variam: 0 a 10, 0 a 100, ou conceitos (A a E). O tenant define a escala.
- **Frequência:** mínimo legal de **75%** para aprovação na educação básica (LDB). Faltas
  justificadas existem. Cursos livres não seguem essa regra.
- **Matrícula x rematrícula:** rematrícula é o ciclo anual do aluno já existente.
- **Responsável pedagógico x responsável financeiro:** podem ser pessoas diferentes
  (ex.: mãe acompanha notas, pai paga a mensalidade). Modelar separado.

## Multi-tenant

- Cada escola é um tenant isolado (RLS por `tenant_id`). Um **professor autônomo**
  também é um tenant (segmento diferente, menos funcionalidades).
- Educação básica x curso livre têm regras diferentes (frequência, boletim) — não
  assumir que toda escola segue regra de escola regular.

## Privacidade (LGPD com menores)

- Dados de alunos menores exigem consentimento do responsável.
- Cuidado redobrado com exposição de nome, foto e desempenho. Não vazar entre tenants.

## IA pedagógica

- Conteúdo gerado (plano de aula, atividade, flashcard) passa por aprovação do professor.
- O motor de treino por ratings (`content_ratings` + `buildTrainingContext`) usa o que
  o professor aprova/rejeita para melhorar as próximas gerações. Esse é o data flywheel.
- Alinhar conteúdo de educação básica à **BNCC** (competências) quando aplicável.

## Edge cases conhecidos (expandir sempre)

- Aluno em mais de uma turma/disciplina.
- Transferência no meio do período (notas e frequência parciais).
- Dependência (DP) e recuperação final.
- Turma multisseriada (idades/séries misturadas).
- Professor que dá aula em várias escolas (vários tenants para o mesmo usuário).
