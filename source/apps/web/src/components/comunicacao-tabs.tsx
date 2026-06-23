import { TabNav, type TabItem } from '@/components/tab-nav';

/** Abas da área de Comunicação (substitui os ~8 itens repetidos no sidebar por 1 + abas). */
const TABS: TabItem[] = [
  { href: '/app/feed', label: 'Mural & feed' },
  { href: '/app/comunicados', label: 'Comunicados' },
  { href: '/app/mensagens', label: 'Mensagens' },
  { href: '/app/mensagens-pais', label: 'Mensagens dos pais' },
  { href: '/app/mural', label: 'Mural dos pais' },
  { href: '/app/whatsapp', label: 'WhatsApp', match: ['/app/whatsapp/inbox'] },
  { href: '/app/reunioes', label: 'Reuniões' },
  { href: '/app/justificativas', label: 'Justificativas' },
];

export function ComunicacaoTabs() {
  return <TabNav tabs={TABS} />;
}
