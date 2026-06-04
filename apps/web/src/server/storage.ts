import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client do Supabase Storage com **service role** — SÓ no servidor (RSC / server actions).
 * Bypassa RLS de Storage; a chave nunca pode chegar ao browser. Por isso este módulo é
 * `server-only` e a chave vem de `SUPABASE_SERVICE_ROLE_KEY` (sem prefixo público).
 */
let _client: SupabaseClient | null = null;
function serviceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Storage indisponível: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  }
  _client ??= createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Sobe a logo da escola no bucket público `public-assets` (path por tenant) e devolve a
 * URL pública. Valida tipo e tamanho. A logo é branding, não dado sensível — por isso bucket
 * público; materiais de aluno irão para o bucket privado `tenant-files` com signed URL.
 */
export async function uploadPublicLogo(tenantId: string, file: File): Promise<string> {
  if (!LOGO_TYPES.includes(file.type)) {
    throw new Error('Formato inválido. Use PNG, JPG, SVG ou WEBP.');
  }
  if (file.size > LOGO_MAX_BYTES) {
    throw new Error('Imagem muito grande (máx. 2 MB).');
  }
  const ext =
    file.name
      .split('.')
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'png';
  const path = `${tenantId}/logo-${Date.now()}.${ext}`;
  const sb = serviceClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await sb.storage
    .from('public-assets')
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  return sb.storage.from('public-assets').getPublicUrl(path).data.publicUrl;
}
