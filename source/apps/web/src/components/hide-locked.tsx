'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';

const KEY = 'eow_hide_locked';
const EVT = 'eow-hide-locked';

/** Preferência (salva no aparelho): esconder os recursos bloqueados pelo plano. */
export function useHideLocked(): boolean {
  const [hide, setHide] = useState(false);
  useEffect(() => {
    const read = () => setHide(localStorage.getItem(KEY) === '1');
    read();
    window.addEventListener(EVT, read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener(EVT, read);
      window.removeEventListener('storage', read);
    };
  }, []);
  return hide;
}

function setHideLocked(value: boolean) {
  localStorage.setItem(KEY, value ? '1' : '0');
  window.dispatchEvent(new Event(EVT));
}

/** Botão pequeno e discreto pra ligar/desligar a exibição dos recursos bloqueados. */
export function HideLockedToggle({ className = '' }: { className?: string }) {
  const hide = useHideLocked();
  return (
    <button
      type="button"
      onClick={() => setHideLocked(!hide)}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground ${className}`}
    >
      {hide ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      {hide ? 'Mostrar recursos bloqueados' : 'Ocultar recursos bloqueados'}
    </button>
  );
}
