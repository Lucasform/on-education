import { loadEnv, modelFor } from '@on-education/config';
import { NextResponse, type NextRequest } from 'next/server';

import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM = `Você é um assistente especializado em extrair feriados e dias não letivos de calendários escolares.

Analise o documento/imagem fornecido e extraia TODOS os feriados, recesses, dias sem aula e datas comemorativas.

Retorne SOMENTE um JSON válido no formato abaixo, sem texto antes ou depois:
{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "name": "Nome do feriado ou evento",
      "type": "holiday"
    }
  ]
}

Tipos possíveis:
- "holiday": feriado nacional, estadual ou municipal (dia não letivo obrigatório)
- "no_school": recesso, emenda, semana pedagógica (dia sem aula mas não é feriado)
- "commemorative": data comemorativa (aula ocorre mas é uma data especial)

Regras importantes:
- Se não tiver certeza do ano, use o ano que fizer mais sentido no contexto do calendário.
- Datas de carnaval (segunda e terça) são "no_school".
- Finais de semana NÃO devem ser incluídos.
- Se uma data aparecer marcada como "recesso" ou "emenda", use type "no_school".
- Retorne APENAS o JSON, sem markdown, sem explicações.`;

interface ExtractedEvent {
  date: string;
  name: string;
  type: string;
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const apiKey = loadEnv().ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'IA não configurada.' }, { status: 503 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });

  if (file.size > 20_000_000)
    return NextResponse.json({ error: 'Arquivo muito grande (máx. 20MB).' }, { status: 400 });

  const isPdf = file.type === 'application/pdf';
  const isImage = file.type.startsWith('image/');
  if (!isPdf && !isImage)
    return NextResponse.json({ error: 'Envie uma imagem (JPEG/PNG/WebP) ou PDF.' }, { status: 400 });

  const data = Buffer.from(await file.arrayBuffer()).toString('base64');
  const model = modelFor('haiku');

  const messageContent = isPdf
    ? [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data },
        },
        { type: 'text', text: 'Extraia todos os feriados e dias não letivos deste calendário escolar.' },
      ]
    : [
        {
          type: 'image',
          source: { type: 'base64', media_type: file.type, data },
        },
        { type: 'text', text: 'Extraia todos os feriados e dias não letivos deste calendário escolar.' },
      ];

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };
  if (isPdf) headers['anthropic-beta'] = 'pdfs-2024-09-25';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: SYSTEM,
      messages: [{ role: 'user', content: messageContent }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: `Erro na IA: ${body}` }, { status: 500 });
  }

  const aiData = (await res.json()) as {
    content: { type: string; text?: string }[];
  };

  const text = aiData.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('');

  let events: ExtractedEvent[] = [];
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as { events?: ExtractedEvent[] };
      events = (parsed.events ?? []).filter(
        (e) =>
          typeof e.date === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
          typeof e.name === 'string' &&
          e.name.trim().length > 0,
      );
    }
  } catch {
    return NextResponse.json({ error: 'Não foi possível extrair datas do calendário. Tente com uma imagem mais clara.' }, { status: 500 });
  }

  return NextResponse.json({ events });
}
