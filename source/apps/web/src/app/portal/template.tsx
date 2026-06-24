import type { ReactNode } from 'react';

/** Anima a troca de tela no portal dos responsáveis (fade-up curto). */
export default function PortalTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
