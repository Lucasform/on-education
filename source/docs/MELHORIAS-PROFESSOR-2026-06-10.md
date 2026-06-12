# Melhorias focadas no professor — sessão 2026-06-10

> Documento de revisão. Resume tudo o que foi construído e entregue em produção nesta sessão,
> como usar cada coisa, decisões tomadas, o que depende de você e os próximos passos.
> O histórico detalhado por checkpoint continua em `PROGRESS.md`.

Produção: https://on-education-seven.vercel.app · auto-deploy no push para `main`.
Tudo validado com `lint + typecheck + test + build` (14/14) antes de cada push.

---

## Visão geral das entregas

| #   | Frente                                           | Commit    | Migration                    |
| --- | ------------------------------------------------ | --------- | ---------------------------- |
| 0   | Hardening: anti-ban WhatsApp em lote + env vars  | `68335ac` | não                          |
| 1   | Biblioteca de atividades: busca + reuso 1-clique | `40aa954` | não                          |
| 2   | Planejador de aula com WayOn (BNCC opcional)     | `aec7c3e` | não                          |
| 3   | Correção em lote por foto                        | `826a013` | não                          |
| 5   | UI/UX mobile estilo app (launcher de ícones)     | `4129849` | não                          |
| 4a  | Relatório do aluno aos pais                      | `5d0048e` | não                          |
| 4b  | Gamificação: pontos + medalhas                   | `c3c65d2` | **0036** (aditiva, aplicada) |
| 6   | Leaderboard de pontos por turma                  | `a900145` | não                          |
| 7   | Refino web: tabelas responsivas no mobile        | `6de2306` | não                          |
| 8   | Gamificação configurável (liga/desliga + faixas) | `bfaae48` | **0037** (aditiva, aplicada) |
| 9   | Auto-pontos por boa nota (opt-in)                | (este)    | **0038** (aditiva, aplicada) |

---

## Detalhe por frente

### 0 — Anti-ban no envio em lote do WhatsApp

- **Problema:** o disparo de comunicado "para todos" não tinha proteção; risco de a Meta banir o número.
- **O que faz agora:** cooldown de **6h** por escola entre envios em lote, **cap de 200** destinatários por disparo e **delay com jitter** entre mensagens. Feedback na própria tela de Comunicados.
- **Onde:** Comunicação › Comunicados › "WhatsApp a todos".
- **Técnico:** reusa `usage_meters` (sem migration). Funções em `packages/modules/nucleo/src/whatsapp.ts`.

### 1 — Biblioteca de atividades (reuso 1-clique)

- **Busca por título** na lista de atividades + filtros que já existiam (tipo/matéria/série/faixa).
- **Duplicar igual:** clona uma atividade na hora, sem IA, pronta para editar.
- **Duplicar e adaptar com o WayOn:** instrução livre ("deixe mais fácil", "adapte pro 5º ano", "vira prova") gera um rascunho a partir da atividade existente; pode trocar o tipo. Respeita o "Meu padrão".
- **Onde:** Pedagógico › Banco de atividades › abrir uma atividade › card "Reaproveitar".

### 2 — Planejador de aula com o WayOn

- Diga o **tema**; o WayOn monta o plano completo (objetivos, conteúdos, recursos, passo a passo com tempo, avaliação, tarefa) e salva direto no **planejamento da turma**.
- Também gera **avaliação** (com gabarito) e **trabalho** (com rubrica).
- **BNCC é opcional e personalizável:** caixa "Alinhar à BNCC" (sugere habilidades/códigos pra você confirmar, sem inventar) + campo para colar uma habilidade específica.
- **Onde:** Sala de aula › Planejamento › card "Gerar plano com o WayOn".

### 3 — Correção em lote por foto

- Fotografe a **pilha** de provas/trabalhos. Para cada aluno, o WayOn lê a foto, corrige contra **rubrica/gabarito** (opcionais) e sugere **nota + feedback**.
- Nota e feedback ficam **editáveis**; você confirma e **lança tudo no diário** de uma vez. A nota automática é só sugestão (decisão humana).
- **Onde:** WayOn › Correção em lote (`/app/ia/correcao`).

### 5 — UI/UX mobile estilo app

- No celular **sem sidebar**: a home vira um **launcher com ícones grandes** agrupados por seção; tocar abre. O menu também abre em **tela cheia**.
- **Bottom bar** refinada (safe-area, estado ativo com pílula).
- No desktop a sidebar continua igual.

### 4a — Relatório do aluno aos pais

- Relatório de desempenho por aluno (**média, frequência, notas**) **imprimível** com a identidade da escola (logo).
- **Recado aos pais escrito pelo WayOn** com base só nos números (não inventa) — você revisa.
- **Envio no WhatsApp** ao responsável com telefone vinculado.
- **Onde:** Alunos › abrir um aluno › "Relatório aos pais" (`/app/alunos/[id]/relatorio`).

### 4b — Gamificação (pontos e medalhas)

- O professor **premia o aluno com pontos** (com motivo). O total vira **medalha**: ⭐ → 🥉 bronze (50) → 🥈 prata (150) → 🥇 ouro (300).
- Card **Conquistas** na ficha do aluno: medalha, total, "faltam X para a próxima" e as premiações recentes.
- **Migration `0036`** criou a tabela `student_points` (aditiva, com RLS; aplicada em produção).
- **Onde:** Alunos › abrir um aluno › card "Conquistas".

### 6 — Leaderboard de pontos por turma

- Na página da turma, cada aluno mostra **medalha + pontos**, e há um card **🏆 Ranking de pontos da turma** (ordenado, só quem tem pontos).
- **Onde:** Sala de aula › Turmas › abrir uma turma.

### 7 — Refino web (tabelas responsivas)

- Tabelas que faltavam (home/aniversariantes, relatório de faltas) agora rolam na horizontal no mobile em vez de estourar o layout. As demais já tinham. Nenhuma tela reescrita.

### 8 — Gamificação configurável

- **Liga/desliga** a gamificação inteira por escola/professor; quando desligada, somem Conquistas, Ranking e medalhas.
- **Faixas de medalha personalizáveis** (a partir de quantos pontos cada medalha).
- **Onde:** Escola › Personalização (escola) e Meu padrão (professor) › card "Gamificação".

### 9 — Auto-pontos por boa nota (opt-in)

- Defina quantos pontos o aluno ganha **automaticamente** ao receber uma nota formal **≥ 60% da escala** (também vale na correção em lote). **0 = desligado** (padrão), então nada muda até você ativar.
- **Onde:** mesmo card "Gamificação" (campo "Auto-pontos por boa nota").

---

## Decisões e princípios mantidos

- **Nada quebrado:** mudanças aditivas; a única migração cria tabela nova (não altera nada existente).
- **Tudo opt-in:** BNCC, nota automática e recado aos pais são opcionais; nada é forçado.
- **Human-in-the-loop:** toda saída de IA é rascunho/sugestão que o professor confirma.
- **Segurança:** checagem tripla (RBAC + entitlement + RLS) em toda operação de dados; cota de IA por plano.
- **"Meu padrão" do professor** é respeitado em toda geração.

## Pendências suas (credenciais no Vercel)

- `OPENAI_API_KEY` → destrava geração de imagem (resto da IA já roda com `ANTHROPIC_API_KEY`).
- `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` → WhatsApp (conectar número, inbox, envio).
- `SUPABASE_SERVICE_ROLE_KEY` → upload de logo e materiais.

## Próximos passos sugeridos

- Faixas de medalha **configuráveis por escola** (precisa de coluna em `tenant_settings`).
- **Auto-pontos** por nota/frequência (premiar automaticamente ao lançar boas notas/presença).
- Refino de web: tabela genérica (DataTable) e densidade consistente nas listagens.
- RAG com embeddings (WayOn ler material da turma de verdade).
- Bloqueados por credencial/decisão: Stripe (assinatura), PSP Asaas/Iugu (mensalidade), NFS-e, Resend/SMTP, WhatsApp Cloud API oficial, BNCC (dataset).
