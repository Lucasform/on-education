import { getGeneratedImage } from '@on-education/module-ia';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Força o download de uma imagem gerada (proxy com Content-Disposition: attachment). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return new Response('Não autenticado.', { status: 401 });

  const img = await getGeneratedImage(db(), ctx, id).catch(() => null);
  if (!img) return new Response('Imagem não encontrada.', { status: 404 });

  const upstream = await fetch(img.url);
  if (!upstream.ok) return new Response('Falha ao baixar.', { status: 502 });
  const bytes = await upstream.arrayBuffer();

  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="imagem-${id}.png"`,
    },
  });
}
