'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Barra de progresso fina no topo, em toda navegação interna. Dá feedback imediato no clique
 * (a sensação de "não entrou" some) enquanto o servidor resolve a próxima página. Sem dependência:
 * inicia ao clicar num link interno / voltar, e completa quando o pathname muda.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [width, setWidth] = useState(0);
  const first = useRef(true);

  // Inicia a barra ao navegar (clique em link interno ou botão voltar/avançar).
  useEffect(() => {
    const start = () => {
      setActive(true);
      setWidth(8);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || anchor.target === '_blank' || anchor.hasAttribute('download')) {
        return;
      }
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', start);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', start);
    };
  }, []);

  // Enquanto ativa, sobe gradualmente até ~90% (espera o servidor).
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setWidth((w) => (w < 90 ? w + (90 - w) * 0.12 : w));
    }, 180);
    return () => window.clearInterval(id);
  }, [active]);

  // Mudou de página: completa e some.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setWidth(100);
    const t = window.setTimeout(() => {
      setActive(false);
      setWidth(0);
    }, 240);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
      style={{ opacity: active ? 1 : 0, transition: 'opacity 200ms ease' }}
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_rgba(47,91,255,0.7)]"
        style={{ width: `${width}%`, transition: 'width 200ms ease' }}
      />
    </div>
  );
}
