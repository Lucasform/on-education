'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker (`/sw.js`) para tornar o app instalável (PWA, item 16).
 * Não renderiza nada. Falha silenciosa (navegador sem suporte ou SW desabilitado).
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* sem PWA neste ambiente; segue normal */
      });
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);
  return null;
}
