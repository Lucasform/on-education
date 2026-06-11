/**
 * Busca de vídeo no YouTube (Fase 2): sugere UM vídeo relacionado ao tema, junto do conteúdo
 * gerado. No-op seguro quando não configurado (`YOUTUBE_API_KEY` ausente) ou sem resultado —
 * nesse caso não sugere nada (não inventa link). Usa a YouTube Data API v3 (cota gratuita).
 */
export interface YoutubeVideo {
  title: string;
  url: string;
}

export function isYoutubeConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

/** Retorna o vídeo mais relevante para a query, ou null. Nunca lança. */
export async function searchYouTube(query: string): Promise<YoutubeVideo | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || !query.trim()) return null;
  try {
    const url =
      'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1' +
      `&relevanceLanguage=pt&safeSearch=strict&q=${encodeURIComponent(query)}&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      items?: { id?: { videoId?: string }; snippet?: { title?: string } }[];
    };
    const item = data.items?.[0];
    const id = item?.id?.videoId;
    if (!id) return null;
    return {
      title: item?.snippet?.title ?? 'Vídeo relacionado',
      url: `https://www.youtube.com/watch?v=${id}`,
    };
  } catch {
    return null;
  }
}
