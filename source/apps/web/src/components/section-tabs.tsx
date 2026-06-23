'use client';

import { createContext, useContext, useState } from 'react';

const TabCtx = createContext<string>('');

/**
 * Abas DENTRO de uma página (sem trocar de rota), para separar objetos com muitas seções.
 * O conteúdo de cada aba vai num <TabPanel id="..."> e fica montado (hidden) quando inativo,
 * então formulários preservam o que foi digitado ao alternar.
 */
export function Tabs({
  tabs,
  children,
}: {
  tabs: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? '');
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm transition-colors ${
              active === t.id
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <TabCtx.Provider value={active}>{children}</TabCtx.Provider>
    </div>
  );
}

export function TabPanel({ id, children }: { id: string; children: React.ReactNode }) {
  const active = useContext(TabCtx);
  // Inativo fica escondido na tela, mas APARECE na impressão (não esconder conteúdo no PDF).
  return (
    <div className={`flex-col gap-5 ${active === id ? 'flex' : 'hidden print:flex'}`}>{children}</div>
  );
}
