import { assertWithinQuota, recordUsage, resolveTenantProvider } from '@on-education/module-ia';
import { assertEntitled, getTenantSettings } from '@on-education/module-nucleo';
import { NextResponse, type NextRequest } from 'next/server';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM =
  'Você redige documentos escolares formais em português do Brasil (declarações, autorizações, ' +
  'comunicados e ofícios), no padrão de uma instituição de ensino. Gere APENAS o corpo do texto: ' +
  'não inclua cabeçalho, logo, data nem assinatura (a plataforma adiciona isso). Linguagem formal, ' +
  'clara e correta, sem travessão no meio de frase. NÃO invente dados: quando faltar uma ' +
  'informação, deixe uma lacuna com sublinhados (ex.: ____). Responda só o documento, sem comentários.';

/** Gera/ajusta o corpo de um documento escolar com a IA do tenant. */
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    modelLabel?: string;
    info?: string;
    current?: string;
    adjustment?: string;
  };

  try {
    const planId = await assertEntitled(db(), ctx.tenantId, 'ai.activities');
    await assertWithinQuota(db(), ctx.tenantId, planId);
    const settings = await getTenantSettings(db(), ctx).catch(() => null);
    const padrao = settings?.aiStandard?.trim();

    const isAdjust = !!body.current?.trim() && !!body.adjustment?.trim();
    const prompt = isAdjust
      ? `Documento atual:\n${body.current}\n\nAjuste solicitado: ${body.adjustment}\n\nReescreva o documento aplicando o ajuste, mantendo o tom formal.`
      : [
          `Tipo de documento: ${body.modelLabel || 'documento escolar'}.`,
          body.info?.trim() ? `Informações fornecidas: ${body.info.trim()}` : '',
          padrao ? `Padrão da instituição a seguir quando fizer sentido:\n${padrao}` : '',
          'Redija o corpo do documento.',
        ]
          .filter(Boolean)
          .join('\n\n');

    const provider = await resolveTenantProvider(db(), ctx);
    const r = await provider.generate({ system: SYSTEM, prompt, maxTokens: 1500 });
    await recordUsage(db(), ctx.tenantId, r.tokensIn + r.tokensOut).catch(() => {});
    const text = r.text.trim();
    if (!text) return NextResponse.json({ error: 'A IA não retornou texto.' }, { status: 500 });
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao gerar o documento.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
