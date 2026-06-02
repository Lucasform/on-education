import type { TenantType } from '@on-education/core';

export interface NavLeaf {
  label: string;
  /** Âncora para uma seção da página (funcionalidade já pronta) ou undefined se "em breve". */
  anchor?: string;
}

export interface NavGroup {
  label: string;
  /** Restringe o grupo a um segmento; ausente = aparece para todos. */
  only?: TenantType;
  children: NavLeaf[];
}

/**
 * Menu de funcionalidades (padrão do On Condomínio: grupos + itens). Mostra TUDO, mesmo
 * o que ainda não foi construído (sem `anchor` = "em breve"), para dar a visão completa.
 */
export const NAV: NavGroup[] = [
  {
    label: 'Visão geral',
    children: [{ label: 'Início', anchor: 'topo' }],
  },
  {
    label: 'Escola',
    only: 'organization',
    children: [
      { label: 'Unidades', anchor: 'escola' },
      { label: 'Convites e membros', anchor: 'escola' },
      { label: 'Ano letivo e períodos', anchor: 'escola' },
      { label: 'Disciplinas', anchor: 'escola' },
      { label: 'Responsáveis', anchor: 'escola' },
      { label: 'Matrícula e documentos' },
    ],
  },
  {
    label: 'Sala de aula',
    children: [
      { label: 'Turmas', anchor: 'turmas' },
      { label: 'Alunos', anchor: 'alunos' },
      { label: 'Diário de classe' },
      { label: 'Notas' },
      { label: 'Faltas' },
      { label: 'Boletim' },
    ],
  },
  {
    label: 'Pedagógico',
    children: [
      { label: 'Banco de atividades', anchor: 'atividades' },
      { label: 'Simulados e quizzes' },
      { label: 'Portfólio' },
      { label: 'Planejamento BNCC' },
    ],
  },
  {
    label: 'Inteligência artificial',
    children: [
      { label: 'Gerar conteúdo', anchor: 'ia' },
      { label: 'Correção de redação' },
      { label: 'Tutor do aluno' },
    ],
  },
  {
    label: 'Comunicação',
    children: [{ label: 'Comunicados' }, { label: 'Mensagens' }, { label: 'WhatsApp' }],
  },
  {
    label: 'Gestão e analytics',
    only: 'organization',
    children: [{ label: 'Dashboards' }, { label: 'Relatórios' }, { label: 'Censo INEP' }],
  },
  {
    label: 'Financeiro',
    only: 'organization',
    children: [{ label: 'Mensalidades' }, { label: 'Inadimplência' }, { label: 'NFS-e' }],
  },
  {
    label: 'Integrações',
    children: [{ label: 'Marketplace' }, { label: 'API aberta' }, { label: 'Google Classroom' }],
  },
];

export function navFor(tenantType: TenantType): NavGroup[] {
  return NAV.filter((g) => !g.only || g.only === tenantType);
}
