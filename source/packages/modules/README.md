# packages/modules — Bounded contexts

Cada módulo é um _bounded context_ (Master Spec §2, §13, §15). Módulos só conversam via
contratos públicos (serviços/eventos), **nunca** importando internos de outro módulo.

Módulos planejados (entram conforme o `docs/ROADMAP-DELIVERIES.md`):

| Pasta          | Módulo                                       | Segmento |
| -------------- | -------------------------------------------- | -------- |
| `nucleo`       | Núcleo / Plataforma                          | 🏫👤     |
| `sala-de-aula` | Acadêmico (diário, notas, faltas, boletim)   | 🏫👤\*   |
| `comunicacao`  | Notification Service, bilhetes, comunicados  | 🏫👤\*   |
| `financeiro`   | Mensalidades, NFS-e, inadimplência           | 🏫       |
| `pedagogico`   | BNCC, banco de atividades, simulados         | 🏫👤     |
| `ia`           | Plano de aula, parecer, correção, tutor, OCR | 🏫👤     |
| `gestao`       | Dashboards, INEP, evasão                     | 🏫       |
| `operacoes`    | Portaria, ponto, transporte                  | 🏫       |
| `inclusao`     | Laudos/PEI, NEE, socioemocional              | 🏫       |
| `integracoes`  | API aberta, Classroom/Teams, marketplace     | 🏫👤     |

> Nenhum módulo implementado na Fase 0. Cada um vira um pacote (`@on-education/module-*`)
> com `package.json` próprio quando o delivery correspondente começar.
