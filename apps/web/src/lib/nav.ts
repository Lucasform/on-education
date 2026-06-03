import type { TenantType } from '@on-education/core';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Building2,
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
  type LucideIcon,
  Megaphone,
  MessageCircleQuestion,
  MessagesSquare,
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
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Funcionalidade ainda não construída (página de "em construção"). */
  soon?: boolean;
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
      { label: 'Convites e membros', href: '/app/escola/convites', icon: UserPlus },
      { label: 'Ano letivo e períodos', href: '/app/escola/ano-letivo', icon: CalendarDays },
      { label: 'Disciplinas', href: '/app/escola/disciplinas', icon: Library },
      { label: 'Responsáveis', href: '/app/escola/responsaveis', icon: Contact },
      { label: 'Personalização', href: '/app/escola/personalizacao', icon: Palette },
      soon('Matrícula e documentos', 'matricula', FileSignature),
    ],
  },
  {
    label: 'Sala de aula',
    items: [
      { label: 'Turmas', href: '/app/turmas', icon: Users },
      { label: 'Alunos', href: '/app/alunos', icon: GraduationCap },
      { label: 'Diário de classe', href: '/app/sala/diario', icon: NotebookPen },
      { label: 'Chamada', href: '/app/sala/chamada', icon: ClipboardList },
      { label: 'Notas', href: '/app/sala/notas', icon: ClipboardList },
      { label: 'Faltas', href: '/app/sala/faltas', icon: CalendarX },
      { label: 'Boletim', href: '/app/sala/boletim', icon: FileText },
    ],
  },
  {
    label: 'Pedagógico',
    items: [
      { label: 'Banco de atividades', href: '/app/atividades', icon: FolderOpen },
      { label: 'Simulados e quizzes', href: '/app/simulados', icon: ClipboardList },
      { label: 'Portfólio', href: '/app/portfolio', icon: BookOpen },
      soon('Planejamento BNCC', 'bncc', BookOpen),
    ],
  },
  {
    label: 'EduON',
    items: [
      { label: 'Gerar conteúdo', href: '/app/ia', icon: Sparkles },
      { label: 'Correção de redação', href: '/app/ia/redacao', icon: PenLine },
      { label: 'Tutor do aluno', href: '/app/ia/tutor', icon: MessageCircleQuestion },
    ],
  },
  {
    label: 'Comunicação',
    items: [
      { label: 'Comunicados', href: '/app/comunicados', icon: Megaphone },
      { label: 'Mensagens', href: '/app/mensagens', icon: MessagesSquare },
      soon('WhatsApp', 'whatsapp', Phone),
    ],
  },
  {
    label: 'Gestão e analytics',
    only: 'organization',
    items: [
      { label: 'Relatórios', href: '/app/relatorios', icon: FileBarChart },
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
    items: [soon('Marketplace', 'marketplace', Store), soon('API aberta', 'api', Plug)],
  },
];

export function navFor(tenantType: TenantType): NavGroup[] {
  return NAV.filter((g) => !g.only || g.only === tenantType);
}

/** Mapa slug -> rótulo para a página de "em construção". */
export const SOON_LABELS: Record<string, string> = Object.fromEntries(
  NAV.flatMap((g) => g.items)
    .filter((i) => i.soon)
    .map((i) => [i.href.split('/').pop() as string, i.label]),
);
