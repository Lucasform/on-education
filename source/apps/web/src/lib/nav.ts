import type { TenantType } from '@on-education/core';
import { type Feature } from '@on-education/entitlements';
import {
  AlertCircle,
  BarChart3,
  BookMarked,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarX,
  ClipboardList,
  Contact,
  CreditCard,
  DoorOpen,
  FileBarChart,
  FileQuestion,
  FileSignature,
  FileText,
  FolderOpen,
  GraduationCap,
  Home,
  Image as ImageIcon,
  Layers,
  Library,
  ListChecks,
  ListOrdered,
  Lock,
  type LucideIcon,
  Megaphone,
  MessageCircleQuestion,
  MessagesSquare,
  Network,
  NotebookPen,
  Package,
  Palette,
  PenLine,
  Phone,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  Wand2,
} from 'lucide-react';

export { Lock };

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Funcionalidade ainda não construída (página de "em construção"). */
  soon?: boolean;
  /** Restringe o item a um segmento; ausente = aparece para todos. */
  only?: TenantType;
  /** Entitlement necessário; ausente = disponível em todos os planos. */
  requiresFeature?: Feature;
  /** Preenchido por navFor quando o plano não inclui requiresFeature. */
  locked?: boolean;
}

export interface NavGroup {
  label: string;
  /** Restringe o grupo a um segmento; ausente = aparece para todos. */
  only?: TenantType;
  /** Oculta o título do grupo no sidebar (ex.: grupo de utilitários no rodapé). */
  hideLabel?: boolean;
  /** Fixa o grupo no rodapé do sidebar, fora da área de scroll. */
  pinBottom?: boolean;
  /** Label exibida é o nome do agente IA (substitui "WayOn" pelo nome personalizado). */
  isAgentGroup?: boolean;
  items: NavItem[];
}

/**
 * Menu de funcionalidades (padrão On Condomínio): grupos + itens, cada item com sua própria rota.
 */
export const NAV: NavGroup[] = [
  {
    label: 'Visão geral',
    items: [
      { label: 'Início', href: '/app', icon: Home },
      { label: 'Calendário', href: '/app/calendario', icon: CalendarDays },
      { label: 'Planos', href: '/app/planos', icon: CreditCard },
      { label: 'Meu perfil', href: '/app/conta/perfil', icon: Settings, only: 'individual' },
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
      { label: 'Calendário escolar', href: '/app/calendario', icon: CalendarClock },
      { label: 'Disciplinas', href: '/app/escola/disciplinas', icon: Library },
      { label: 'Professores e vínculos', href: '/app/escola/professores', icon: Network },
      { label: 'Responsáveis', href: '/app/escola/responsaveis', icon: Contact },
      { label: 'Notas e pesos', href: '/app/escola/notas', icon: ClipboardList },
      { label: 'Personalização', href: '/app/escola/personalizacao', icon: Palette },
      { label: 'Matrícula', href: '/app/matricula', icon: FileSignature },
    ],
  },
  {
    label: 'Sala de aula',
    items: [
      { label: 'Turmas', href: '/app/turmas', icon: Users, requiresFeature: 'classes.manage' },
      { label: 'Alunos', href: '/app/alunos', icon: GraduationCap, requiresFeature: 'students' },
      { label: 'Cronograma', href: '/app/cronograma', icon: CalendarClock, requiresFeature: 'classes.planning' },
      { label: 'Planejamento', href: '/app/sala/planejamento', icon: ListChecks, requiresFeature: 'classes.planning' },
      { label: 'Plano de curso', href: '/app/sala/plano-curso', icon: ListOrdered, requiresFeature: 'classes.planning' },
      { label: 'Plano de aulas', href: '/app/sala/plano-diario', icon: CalendarClock, requiresFeature: 'classes.planning' },
      { label: 'Diário de classe', href: '/app/sala/diario', icon: NotebookPen, requiresFeature: 'classes.planning' },
      { label: 'Chamada', href: '/app/sala/chamada', icon: ClipboardList, requiresFeature: 'classes.manage' },
      { label: 'Notas', href: '/app/sala/notas', icon: ClipboardList, requiresFeature: 'classes.manage' },
      { label: 'Faltas', href: '/app/sala/faltas', icon: CalendarX, requiresFeature: 'classes.manage' },
      { label: 'Boletim', href: '/app/sala/boletim', icon: FileText, requiresFeature: 'classes.manage' },
      { label: 'Ocorrências', href: '/app/ocorrencias', icon: AlertCircle, only: 'organization' },
      { label: 'Conselho de Classe', href: '/app/conselho-classe', icon: CalendarCheck, only: 'organization' },
      { label: 'Diário Infantil', href: '/app/diario-infantil', icon: BookMarked, requiresFeature: 'classes.planning' },
      { label: 'Autorização de Saída', href: '/app/autorizacao-saida', icon: DoorOpen, only: 'organization' },
    ],
  },
  {
    label: 'Pedagógico',
    items: [
      { label: 'Banco de atividades', href: '/app/atividades', icon: FolderOpen },
      { label: 'Banco coletivo', href: '/app/banco-coletivo', icon: Library, requiresFeature: 'marketplace' },
      { label: 'Simulados e quizzes', href: '/app/simulados', icon: ClipboardList },
      { label: 'Portfólio', href: '/app/portfolio', icon: BookOpen },
      { label: 'Documentos', href: '/app/documentos', icon: FileSignature },
    ],
  },
  {
    label: 'WayOn',
    isAgentGroup: true,
    items: [
      { label: 'Gerar conteúdo', href: '/app/ia', icon: Sparkles },
      { label: 'Correção em lote', href: '/app/ia/correcao', icon: ListChecks, requiresFeature: 'ai.essayGrading' },
      { label: 'Correção de redação', href: '/app/ia/redacao', icon: PenLine, requiresFeature: 'ai.essayGrading' },
      { label: 'Tutor do aluno', href: '/app/ia/tutor', icon: MessageCircleQuestion },
      { label: 'Flashcards', href: '/app/ia/flashcards', icon: Layers },
      { label: 'Gerar imagem', href: '/app/ia/imagem', icon: ImageIcon, requiresFeature: 'ai.images' },
      { label: 'Meu padrão', href: '/app/meu-padrao', icon: Wand2 },
    ],
  },
  {
    label: 'Comunicação',
    only: 'organization',
    items: [
      { label: 'Mural & feed', href: '/app/feed', icon: Megaphone },
      { label: 'Comunicados', href: '/app/comunicados', icon: Megaphone },
      { label: 'Mural dos pais', href: '/app/mural', icon: Megaphone },
      { label: 'Mensagens', href: '/app/mensagens', icon: MessagesSquare },
      { label: 'WhatsApp', href: '/app/whatsapp', icon: Phone },
      { label: 'Inbox WhatsApp', href: '/app/whatsapp/inbox', icon: MessagesSquare },
      { label: 'Justificativas de Falta', href: '/app/justificativas', icon: FileQuestion },
      { label: 'Agendamento de Reunião', href: '/app/reunioes', icon: CalendarCheck },
    ],
  },
  {
    label: 'Gestão e analytics',
    only: 'organization',
    items: [
      { label: 'Relatórios', href: '/app/relatorios', icon: FileBarChart, requiresFeature: 'analytics.director' },
      { label: 'Relatório de faltas', href: '/app/relatorios/faltas', icon: CalendarX, requiresFeature: 'analytics.director' },
      { label: 'Dashboards', href: '/app/dashboards', icon: BarChart3, requiresFeature: 'analytics.director' },
      { label: 'Auditoria', href: '/app/auditoria', icon: ShieldCheck, requiresFeature: 'analytics.director' },
      { label: 'Acesso & segurança', href: '/app/conta/seguranca', icon: ShieldCheck },
      { label: 'Inventário', href: '/app/inventario', icon: Package },
    ],
  },
  {
    label: 'Financeiro',
    only: 'organization',
    items: [
      { label: 'Mensalidades', href: '/app/financeiro', icon: Wallet, requiresFeature: 'finance.institutional' },
      { label: 'Inadimplência', href: '/app/inadimplencia', icon: AlertCircle, requiresFeature: 'finance.institutional' },
    ],
  },
  // Integrações (API + webhooks) ficam SÓ no admin (aplicadas por escola via impersonação),
  // para não incentivar uso/custo de recurso no tenant. A conexão de IA do usuário (BYOK)
  // segue disponível em "Meu padrão". As páginas continuam acessíveis por URL para o admin.
  {
    label: 'Sistema',
    hideLabel: true,
    pinBottom: true,
    items: [{ label: 'Lixeira', href: '/app/lixeira', icon: Trash2 }],
  },
];

/**
 * Menu por segmento. O professor autônomo (`individual`) recebe um formato simplificado
 * (item 18): some a gestão institucional (Escola, Comunicação, Gestão, Financeiro,
 * Integrações e itens marcados `only`), sobrando o essencial: turmas/alunos, sala de aula,
 * pedagógico, WayOn e agenda. A escola (`organization`) vê tudo.
 */
/**
 * @param enabledFeatures conjunto de funcionalidades habilitadas do tenant.
 *   `null` = tenant sem plano definido (ungated) → nada é travado.
 */
export function navFor(
  tenantType: TenantType,
  enabledFeatures?: readonly Feature[] | null,
): NavGroup[] {
  const gated = enabledFeatures != null;
  const enabled = new Set(enabledFeatures ?? []);
  const groups = NAV.filter((g) => !g.only || g.only === tenantType)
    .map((g) => ({
      ...g,
      items: g.items
        .filter((i) => !i.only || i.only === tenantType)
        .map((i) => ({
          ...i,
          locked: i.requiresFeature ? gated && !enabled.has(i.requiresFeature) : false,
        })),
    }))
    .filter((g) => g.items.length > 0);

  // Professor autônomo (item 18.8): navegação centrada no WayOn. O WayOn sobe logo após a
  // visão geral; o resto (sala de aula, pedagógico) vem depois. A escola mantém a ordem.
  if (tenantType === 'individual') {
    const ordem = ['Visão geral', 'WayOn', 'Pedagógico', 'Sala de aula'];
    return [...groups].sort((a, b) => {
      const ia = ordem.indexOf(a.label);
      const ib = ordem.indexOf(b.label);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }
  return groups;
}
