import type { ReactNode } from 'react';

/** Anima a troca de tela dentro do app (fade-up curto). Re-monta a cada navegação. */
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
