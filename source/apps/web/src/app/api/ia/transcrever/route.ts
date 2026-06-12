import { type AiImage, transcribePhoto } from '@on-education/module-ia';
import { NextResponse, type NextRequest } from 'next/server';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Transcrição genérica: recebe foto(s) e devolve o texto (ex.: enunciado de exercício). */
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const form = await req.formData();
  const files = form.getAll('images').filter((f): f is File => f instanceof File);
  if (files.length === 0)
    return NextResponse.json({ error: 'Envie ao menos uma foto.' }, { status: 400 });
  if (files.length > 4) return NextResponse.json({ error: 'Máximo de 4 fotos.' }, { status: 400 });

  const images: AiImage[] = [];
  for (const f of files) {
    if (!f.type.startsWith('image/'))
      return NextResponse.json({ error: 'Apenas imagens são aceitas.' }, { status: 400 });
    if (f.size > 6_000_000)
      return NextResponse.json({ error: 'Foto muito grande (máx. 6MB).' }, { status: 400 });
    const data = Buffer.from(await f.arrayBuffer()).toString('base64');
    images.push({ data, mediaType: f.type });
  }

  try {
    const text = await transcribePhoto(db(), ctx, images);
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao transcrever.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
