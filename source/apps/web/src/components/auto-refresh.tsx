'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Atualiza os dados do server component em intervalos (router.refresh) — "quase realtime"
 * sem websocket. Usado no inbox do WhatsApp para puxar mensagens novas automaticamente.
 */
export function AutoRefresh({ seconds = 8 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
