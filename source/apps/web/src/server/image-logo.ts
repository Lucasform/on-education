import 'server-only';

import sharp from 'sharp';

/**
 * Compõe o logo real da escola no canto inferior direito da imagem gerada (PNG b64 -> PNG b64). O
 * modelo não reproduz o logo de verdade, então fazemos a sobreposição de forma determinística. Se
 * algo falhar (logo inacessível, formato inválido), devolve a imagem original sem quebrar.
 */
export async function compositeLogoPng(baseB64: string, logoUrl: string): Promise<string> {
  try {
    const base = Buffer.from(baseB64, 'base64');
    const meta = await sharp(base).metadata();
    const W = meta.width ?? 1024;
    const H = meta.height ?? 1024;

    const res = await fetch(logoUrl);
    if (!res.ok) return baseB64;
    const logoSrc = Buffer.from(await res.arrayBuffer());

    // Logo a ~16% da largura, sem ampliar logos pequenos.
    const logo = await sharp(logoSrc)
      .resize({ width: Math.round(W * 0.16), withoutEnlargement: true })
      .png()
      .toBuffer();
    const lMeta = await sharp(logo).metadata();

    const pad = Math.round(W * 0.03);
    const top = Math.max(0, H - (lMeta.height ?? 0) - pad);
    const left = Math.max(0, W - (lMeta.width ?? 0) - pad);

    const out = await sharp(base)
      .composite([{ input: logo, top, left }])
      .png()
      .toBuffer();
    return out.toString('base64');
  } catch {
    return baseB64;
  }
}
