import type { ReactNode } from 'react';

/** Anima a troca de tela no console admin (fade-up curto). Re-monta a cada navegação. */
export default function AdminTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
