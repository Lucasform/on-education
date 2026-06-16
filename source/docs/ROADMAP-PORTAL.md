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
- [x] Badges de não lidas (chat e comunicados) + marca chat lido ao abrir a aba.
- [x] Financeiro: faturas/mensalidades (competência, valor, vencimento, status, vencido). Falta só a 2ª via online (Pix/boleto), que depende do gateway de pagamento.
- [x] Anexo de atestado na justificativa (upload Supabase Storage).
- [x] Escola vê quem escreveu (tag "responsável") e responde pela página Mensagens.
- [ ] Notificação por WhatsApp/e-mail quando há novidade no portal.
- [ ] 2ª via Pix/boleto (depende do gateway — ligar junto do Stripe).

### Fase 3 — extras
- [x] Carteirinha digital do aluno (QR) — na aba Conta.
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
