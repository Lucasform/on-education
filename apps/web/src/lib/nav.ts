import type { TenantType } from '@on-education/core';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarX,
  ClipboardList,
  Contact,
  FileBarChart,
  FileSignature,
  FileText,
  FolderOpen,
  GraduationCap,
  Home,
  Library,
  ListChecks,
  type LucideIcon,
  Megaphone,
  MessageCircleQuestion,
  MessagesSquare,
  Network,
  NotebookPen,
  Palette,
  PenLine,
  Phone,
  Plug,
  Receipt,
  School,
  Sparkles,
  Store,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  Wand2,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Funcionalidade ainda não construída (página de "em construção"). */
  soon?: boolean;
  /** Restringe o item a um segmento; ausente = aparece para todos. */
  only?: TenantType;
}

export interface NavGroup {
  label: string;
  /** Restringe o grupo a um segmento; ausente = aparece para todos. */
  only?: TenantType;
  items: NavItem[];
}

const soon = (label: string, slug: string, icon: LucideIcon): NavItem => ({
  label,
  href: `/app/em-breve/${slug}`,
  icon,
  soon: true,
});

/**
 * Menu de funcionalidades (padrão On Condomínio): grupos + itens, cada item com sua própria
 * rota. Itens `soon` levam a uma página de "em construção" para já navegarem.
 */
export const NAV: NavGroup[] = [
  {
    label: 'Visão geral',
    items: [
      { label: 'Início', href: '/app', icon: Home },
      { label: 'Calendário', href: '/app/calendario', icon: CalendarDays },
      { label: 'Lixeira', href: '/app/lixeira', icon: Trash2 },
    ],
  },
  {
    label: 'Escola',
    only: 'organization',
    items: [
      { label: 'Unidades', href: '/app/escola/unidades', icon: Building2 },
      { label: 'Quadro de funcionários', href: '/app/escola/quadro', icon: Users },
      { label: 'Convites e membros', href: '/app/escola/convites', icon: UserPlus },
      { label: 'Ano letivo e períodos', href: '/app/escola/ano-letivo', icon: CalendarDays },
      { label: 'Disciplinas', href: '/app/escola/disciplinas', icon: Library },
      { label: 'Professores e vínculos', href: '/app/escola/professores', icon: Network },
      { label: 'Responsáveis', href: '/app/escola/responsaveis', icon: Contact },
      { label: 'Notas e pesos', href: '/app/escola/notas', icon: ClipboardList },
      { label: 'Personalização', href: '/app/escola/personalizacao', icon: Palette },
      soon('Matrícula e documentos', 'matricula', FileSignature),
    ],
  },
  {
    label: 'Sala de aula',
    items: [
      { label: 'Turmas', href: '/app/turmas', icon: Users },
      { label: 'Alunos', href: '/app/alunos', icon: GraduationCap },
      { label: 'Cronograma', href: '/app/cronograma', icon: CalendarClock },
      { label: 'Planejamento', href: '/app/sala/planejamento', icon: ListChecks },
      { label: 'Diário de classe', href: '/app/sala/diario', icon: NotebookPen },
      { label: 'Chamada', href: '/app/sala/chamada', icon: ClipboardList },
      { label: 'Notas', href: '/app/sala/notas', icon: ClipboardList },
      { label: 'Faltas', href: '/app/sala/faltas', icon: CalendarX },
      { label: 'Boletim', href: '/app/sala/boletim', icon: FileText },
      { label: 'Ocorrências', href: '/app/ocorrencias', icon: AlertCircle, only: 'organization' },
    ],
  },
  {
    label: 'Pedagógico',
    items: [
      { label: 'Banco de atividades', href: '/app/atividades', icon: FolderOpen },
      { label: 'Simulados e quizzes', href: '/app/simulados', icon: ClipboardList },
      { label: 'Portfólio', href: '/app/portfolio', icon: BookOpen },
      { label: 'Documentos', href: '/app/documentos', icon: FileSignature },
      soon('Planejamento BNCC', 'bncc', BookOpen),
    ],
  },
  {
    label: 'EduON',
    items: [
      { label: 'Gerar conteúdo', href: '/app/ia', icon: Sparkles },
      { label: 'Correção de redação', href: '/app/ia/redacao', icon: PenLine },
      { label: 'Tutor do aluno', href: '/app/ia/tutor', icon: MessageCircleQuestion },
      { label: 'Meu padrão', href: '/app/meu-padrao', icon: Wand2 },
    ],
  },
  {
    label: 'Comunicação',
    only: 'organization',
    items: [
      { label: 'Comunicados', href: '/app/comunicados', icon: Megaphone },
      { label: 'Mural dos pais', href: '/app/mural', icon: Megaphone },
      { label: 'Mensagens', href: '/app/mensagens', icon: MessagesSquare },
      soon('WhatsApp', 'whatsapp', Phone),
    ],
  },
  {
    label: 'Gestão e analytics',
    only: 'organization',
    items: [
      { label: 'Relatórios', href: '/app/relatorios', icon: FileBarChart },
      { label: 'Relatório de faltas', href: '/app/relatorios/faltas', icon: CalendarX },
      soon('Dashboards avançados', 'dashboards', BarChart3),
      soon('Censo INEP', 'inep', School),
    ],
  },
  {
    label: 'Financeiro',
    only: 'organization',
    items: [
      soon('Mensalidades', 'mensalidades', Wallet),
      soon('Inadimplência', 'inadimplencia', AlertCircle),
      soon('NFS-e', 'nfse', Receipt),
    ],
  },
  {
    label: 'Integrações',
    only: 'organization',
    items: [soon('Marketplace', 'marketplace', Store), soon('API aberta', 'api', Plug)],
  },
];

/**
 * Menu por segmento. O professor autônomo (`individual`) recebe um formato simplificado
 * (item 18): some a gestão institucional (Escola, Comunicação, Gestão, Financeiro,
 * Integrações e itens marcados `only`), sobrando o essencial: turmas/alunos, sala de aula,
 * pedagógico, EduON e agenda. A escola (`organization`) vê tudo.
 */
export function navFor(tenantType: TenantType): NavGroup[] {
  const groups = NAV.filter((g) => !g.only || g.only === tenantType)
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.only || i.only === tenantType) }))
    .filter((g) => g.items.length > 0);

  // Professor autônomo (item 18.8): navegação centrada no EduON. O EduON sobe logo após a
  // visão geral; o resto (sala de aula, pedagógico) vem depois. A escola mantém a ordem.
  if (tenantType === 'individual') {
    const ordem = ['Visão geral', 'EduON', 'Pedagógico', 'Sala de aula'];
    return [...groups].sort((a, b) => {
      const ia = ordem.indexOf(a.label);
      const ib = ordem.indexOf(b.label);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }
  return groups;
}

/** Mapa slug -> rótulo para a página de "em construção". */
export const SOON_LABELS: Record<string, string> = Object.fromEntries(
  NAV.flatMap((g) => g.items)
    .filter((i) => i.soon)
    .map((i) => [i.href.split('/').pop() as string, i.label]),
);
