# Roadmap — Portal do Responsável

Portal em `/portal/login` → `/portal/me`. Login por e-mail+senha do responsável.

## ✅ Entregue (Fase 1 + chat + rematrícula)

Dashboard com **abas** e **seletor de filho** (multi-aluno):

- **Visão geral**: média, faltas e situação do aluno; próximos eventos do calendário; comunicados (com confirmação de leitura automática).
- **Notas & faltas**: boletim com médias por componente + média final + situação; notas lançadas; frequência detalhada (datas das faltas); aulas recentes; ocorrências.
- **Solicitações** (mão dupla, validando posse do aluno):
  - Autorização de saída (solicitar + histórico/status)
  - Justificativa de falta (enviar + histórico/status)
  - Agendar reunião (escolhe horário disponível → reserva)
  - **Rematrícula** (solicita renovação → vira pendência na secretaria)
- **Mensagens**: chat interno bidirecional com a escola (bolhas; `messages.sender`).
- **Conta**: atualizar contato (telefone/e-mail/endereço) e trocar senha.

Infra: `getPortalBundle` (leitura única) + funções `guardian*` de escrita baseadas na
sessão do portal (sem AuthContext de staff), todas validando `student_guardians`.

## 🔜 Próximas fases

### Fase 2 — interação e finanças
- [ ] Badges de não lidas (chat e comunicados) — coluna `messages.read_at` já existe.
- [ ] Notificação por WhatsApp/e-mail quando há novidade no portal.
- [ ] Financeiro: faturas, vencimentos, 2ª via (Pix/boleto), histórico de pagamentos.
- [ ] Anexo de atestado na justificativa (upload Supabase Storage).
- [ ] Escola responder o chat a partir do app (hoje a escola usa Mensagens/WhatsApp).

### Fase 3 — extras
- [ ] Carteirinha digital do aluno (QR).
- [ ] Cardápio da merenda da semana.
- [ ] Lista de materiais.
- [ ] Galeria de fotos de eventos da turma.
- [ ] Enquetes/pesquisas da escola.
- [ ] Portfólio do aluno no portal.
- [ ] Diário infantil (educação infantil) no portal.
- [ ] Preferências de notificação / idioma / acessibilidade.
- [ ] Solicitar declaração de matrícula/frequência (gera documento).

## Notas técnicas
- Escritas do responsável: `packages/modules/nucleo/src/portal-guardian.ts`.
- Actions: `apps/web/src/app/portal/me/actions.ts`.
- UI: `apps/web/src/app/portal/me/PortalClient.tsx`.
- Rematrícula reusa `enrollment_requests` (mesma fila da matrícula pública).
