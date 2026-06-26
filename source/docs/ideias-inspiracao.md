# Ideias de inspiração (de outros sistemas)

Backlog de ideias que o Lucas viu em outros sistemas e quer avaliar para o On Education.
NÃO implementar sem o "ok, faz" dele. Só anotar e priorizar.

---

## 1. Command palette / busca global (Cmd+K)

**Fonte:** ERP visto pelo Lucas (print 2026-06-25).

**O que é:** um botão "Buscar ⌘K" no header que abre um modal central de busca rápida para
navegar por páginas, módulos e ações, sem depender do menu lateral.

**Detalhes observados:**
- Atalho de teclado: **⌘K / Ctrl+K** (e botão "Buscar" no topo).
- Input grande: "Buscar página, módulo ou ação...".
- Resultados agrupados por categoria (ex.: seção **NAVEGAR**).
- Cada item: **ícone + título + descrição curta** (ex.: "Painel do Sócio — KPIs do dia: vendas,
  a receber/pagar, NF, estoque").
- Navegação 100% por teclado: **↑↓ navegar, ↵ executar, esc fechar** (dicas no rodapé).
- Item em foco destacado; contador de resultados no rodapé ("21 resultados").

**Por que cabe no On Education:** o app tem muitas páginas (sala de aula, pedagógico, financeiro,
comunicação, gestão, conta). Um Cmd+K acelera demais a navegação de professores e gestores e dá
cara de produto sênior.

**Esforço (estimativa):** médio. Já existe a estrutura de NAV (lib/nav.ts) para gerar a lista de
páginas; dá para reaproveitar como fonte das ações. Falta o componente de palette + atalho global.

---

## 2. Convite por link "definir senha" (onboarding de equipe por papel)

**Fonte:** ERP visto pelo Lucas (2026-06-25). Três convites por papel: Vendedor (Pedro),
Estoquista (João), Conferente (Maria), cada um com um link único `…/definir-senha/?token=…`.

**O que é:** o admin **pré-cadastra** a pessoa com nome + papel, e o sistema gera um **link único
com token** que abre a tela "definir senha". A pessoa clica, cria a própria senha e o acesso fica
pronto, sem ela passar pelo cadastro do zero.

**Detalhes observados:**
- Um link por usuário, com token longo na URL (`/definir-senha/?token=<hash>`).
- O papel já vem definido pelo admin no convite (Vendedor/Estoquista/Conferente).
- Bom para montar a equipe inteira de uma vez (a escola cadastra diretor, coordenação, secretaria
  e professores e dispara os links).

**Status no On Education:** já existe base de convite (`createInvite` em `organization.ts`, com
token). A ideia é confirmar/elevar esse fluxo: tela dedicada "definir senha" por token, criação em
lote por papel e um jeito fácil de copiar/enviar o link de cada pessoa (WhatsApp/e-mail).

**Por que cabe:** escola adora cadastrar o time todo de uma vez sem depender de cada um se
inscrever. Reduz atrito de onboarding e dá controle de papéis ao gestor.

**Esforço (estimativa):** baixo a médio (boa parte da base de convite já existe).

**Segurança:** o token é credencial. Tratar como sensível, com expiração e uso único, e nunca logar
o token. Não abrir links de convite de terceiros.

---

## Estudo do Evercol (Catalisa) — melhorias para portar

Análise read-only do ERP Evercol (NestJS + Next + Prisma) cruzada com o On Education. Ordem por
impacto/esforço (quick wins primeiro). Adaptado ao domínio escolar, nunca copiado 1:1.

> O On Education já tem, com qualidade igual ou superior: multi-tenant por RLS, RBAC em 3 camadas,
> audit log, validação Zod, command palette (acabamos de criar), import CSV, comunicação multicanal
> e o motor de rating da IA. As ideias abaixo cobrem lacunas reais.

| # | Melhoria | O que é (no Evercol) | Onde aplicar no On Education | Esforço · Impacto |
|---|---|---|---|---|
| 3 | **Régua de cobrança (dunning)** | ladder D-3/D0/D+1/D+7/D+15 com idempotência por (lançamento, estágio), cron por tenant | `/app/inadimplencia` hoje é casca; criar módulo de cobrança de mensalidade usando WhatsApp+push que já existem | médio · **alto** |
| 4 | **Motor de alertas (sino + push)** | regras em cron geram `Notification` com `dedupeKey`, entrega no sino e Web Push | tabela `notifications` + regras escolares: 3 faltas seguidas, mensalidade vencendo, ocorrência grave | médio · **alto** |
| 5 | **Field-Level Security (mascarar campos)** | interceptor remove valores sensíveis de quem não tem permissão | helper de "redação de campos por papel" nas leituras de notas/financeiro/ocorrência (complementa o RLS) | médio · **alto** |
| 6 | **Escopo por hierarquia (ALL/TEAM/OWN)** | filtro de "quais registros" pelo papel | `scopeFilter(ctx)` devolve turmas/alunos visíveis; professor vê as dele, coordenação vê a unidade/série | médio · **alto** |
| 7 | **Widget de feedback in-app com triagem** | botão flutuante BUG/IDEIA/DÚVIDA captura rota+versão, painel de triagem | feedback do professor sobre a plataforma, com captura de rota + plano do tenant | baixo · médio |
| 8 | **Briefing diário do gestor (KPIs numa tela)** | 7 KPIs com tom de alerta (âmbar) | "Painel do diretor": matrículas do mês, a receber/vencidas, % presença baixa, alunos em risco | baixo · médio |
| 9 | **Aprovação por link mágico (sem login)** | token JWT 24h numa página pública aprova/rejeita | aprovação de despesa por diretor, ou autorização de saída do aluno pelo responsável no celular | médio · médio |
| 10 | **Custom fields (EAV) por entidade** | tabelas def/valor, tipos TEXT/NUMBER/SELECT/FORMULA | campos próprios por aluno/matrícula (tipo sanguíneo, autorização de imagem, restrição alimentar) | alto · médio |
| 11 | **Copiloto da escola (read-only, agregado)** | contexto só com contagens (sem PII), responde perguntas de negócio | "quantos alunos em risco?", "taxa de inadimplência?" usando snapshot agregado | médio · médio |
| 12 | **Report builder simples** | escolher fonte + período + filtro, salvar e reexecutar | `/app/relatorios` com builder (presença/notas/financeiro por turma), respeitando o escopo do #6 | alto · médio |
| 13 | **Import CSV pt-BR tolerante + erro por linha** | coerção `1.234,56`→nº, `sim/x/1`→bool, relatório `{row, message}` | reforçar o `csv-import` atual com coerção pt-BR e upsert idempotente | baixo · médio |

### Padrões de engenharia do Evercol que valem adotar
1. **Idempotência explícita** em toda comunicação/cobrança automática (chave de dedupe por construção, não checagem frágil). Protege a reputação quando o worker roda repetido.
2. **Best-effort que nunca derruba a operação** (notificação/WhatsApp fora do ar loga e segue, não trava matrícula/cobrança).
3. **Máquinas de estado nomeadas** (status como enum com transições validadas, não flags booleanas soltas).
4. **Cron por tenant com isolamento de erro** (iterar tenants ativos, `withTenant` + try/catch por tenant; o worker do On Education hoje é vazio).
5. **Validação de ambiente fail-fast no boot** (não subir parcialmente quebrado).

> Nota honesta do estudo: o Evercol usa `@nestjs/schedule` para crons, mas **não** tem fila real
> (BullMQ/Redis é só TODO). Então para filas o On Education não copia nada de lá; a referência é o
> padrão de cron por tenant. O caminho de fila certo (pg-boss/Inngest) já está citado no nosso worker.

---

## 3. Atalhos personalizáveis no painel (quick actions de 1 clique)

**Fonte:** ERP visto pelo Lucas (2026-06-25). Seção "ATALHOS" no painel: "Escolha os atalhos que
você mais usa, eles abrem a ação em 1 clique." Grade de checkboxes (Novo pedido, Novo produto,
Importar NF-e, Notas fiscais, Cobrança, Estoque, Abrir caso de suporte...), com um botão "Concluir"
para sair do modo de edição.

**O que é:** o usuário escolhe (marcando) quais atalhos quer ver no topo do painel/início, e eles
viram botões grandes que disparam a ação direta. Personalizado por usuário, com modo de edição.

**Como aplicaria no On Education:** atalhos do dia a dia escolar, por papel: "Nova atividade (WayOn)",
"Fazer chamada", "Lançar notas", "Novo comunicado", "Nova matrícula", "Gerar boletim", "Abrir
suporte". O catálogo de atalhos pode reusar a mesma fonte do command palette (`nav.ts`). Salvar a
seleção nas preferências do usuário (por aparelho ou no tenant_settings/perfil). Modo "Editar
atalhos" com checkboxes, igual ao print.

**Por que cabe:** professor e gestor repetem as mesmas 3 ou 4 ações o dia todo; deixar isso a 1
clique no início economiza muito tempo e dá sensação de produto sob medida. Casa com o command
palette (#1) que acabamos de fazer.

**Refinamento (catálogo = tabela de referência própria):** os atalhos não são só as páginas do
`nav.ts`. Vale ter uma **tabela/catálogo de AÇÕES** (à parte das rotas), porque no ERP de referência
os atalhos misturam página e ação direta ("Importar NF-e", "Abrir caso de suporte", "Novo pedido").
No On Education: catálogo com itens do tipo `{ id, label, icon, tipo: 'pagina' | 'acao', destino,
papéis }`, onde "ação" dispara um fluxo (ex.: abrir o gerador do WayOn já no tipo certo, iniciar uma
chamada, abrir o suporte). A seleção do usuário **referencia esse catálogo** por id, não duplica
rota. Isso também alimenta o command palette (#1) com ações, não só navegação.

**Esforço (estimativa):** baixo a médio. **Impacto:** médio.

---

<!-- Próximas ideias entram abaixo, uma por seção numerada. -->
