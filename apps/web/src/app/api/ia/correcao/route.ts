import { type AiImage, correctWorkFromPhotos } from '@on-education/module-ia';
import { NextResponse, type NextRequest } from 'next/server';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Recebe a(s) foto(s) do trabalho de um aluno + config e devolve nota sugerida + feedback. */
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const form = await req.formData();
  const files = form.getAll('images').filter((f): f is File => f instanceof File);
  if (files.length === 0)
    return NextResponse.json({ error: 'Envie ao menos uma foto.' }, { status: 400 });
  if (files.length > 4)
    return NextResponse.json({ error: 'Máximo de 4 fotos por trabalho.' }, { status: 400 });

  const images: AiImage[] = [];
  for (const f of files) {
    if (!f.type.startsWith('image/'))
      return NextResponse.json({ error: 'Apenas imagens são aceitas.' }, { status: 400 });
    if (f.size > 6_000_000)
      return NextResponse.json({ error: 'Foto muito grande (máx. 6MB).' }, { status: 400 });
    const data = Buffer.from(await f.arrayBuffer()).toString('base64');
    images.push({ data, mediaType: f.type });
  }

  const maxScore = Number(form.get('maxScore') ?? 10) || 10;
  const rubric = (form.get('rubric') as string) || undefined;
  const answerKey = (form.get('answerKey') as string) || undefined;
  const context = (form.get('context') as string) || undefined;

  try {
    const out = await correctWorkFromPhotos(db(), ctx, {
      images,
      maxScore,
      rubric,
      answerKey,
      context,
    });
    return NextResponse.json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao corrigir.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
