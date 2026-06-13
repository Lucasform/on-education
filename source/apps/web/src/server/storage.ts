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
const PHOTO_MAX_BYTES = 4 * 1024 * 1024; // 4 MB

/**
 * Sobe a logo da escola no bucket público `public-assets` (path por tenant) e devolve a
 * URL pública. Valida tipo e tamanho. A logo é branding, não dado sensível — por isso bucket
 * público; materiais de aluno irão para o bucket privado `tenant-files` com signed URL.
 */
/** Sobe uma imagem gerada (PNG, base64) no bucket público e devolve a URL. */
export async function uploadPublicImagePng(tenantId: string, b64: string): Promise<string> {
  const bytes = Buffer.from(b64, 'base64');
  const path = `${tenantId}/img-${Date.now()}.png`;
  const sb = serviceClient();
  const { error } = await sb.storage
    .from('public-assets')
    .upload(path, bytes, { contentType: 'image/png', upsert: true });
  if (error) throw new Error(`Falha no upload da imagem: ${error.message}`);
  return sb.storage.from('public-assets').getPublicUrl(path).data.publicUrl;
}

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

/** Sobe a foto de um aluno no bucket público e devolve a URL permanente. */
export async function uploadStudentPhoto(
  tenantId: string,
  studentId: string,
  file: File,
): Promise<string> {
  if (!LOGO_TYPES.includes(file.type)) {
    throw new Error('Formato inválido. Use PNG, JPG ou WEBP.');
  }
  if (file.size > PHOTO_MAX_BYTES) {
    throw new Error('Foto muito grande (máx. 4 MB).');
  }
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${tenantId}/students/${studentId}.${ext}`;
  const sb = serviceClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await sb.storage
    .from('public-assets')
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (error) throw new Error(`Falha no upload da foto: ${error.message}`);
  return sb.storage.from('public-assets').getPublicUrl(path).data.publicUrl;
}

const MATERIAL_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export interface UploadedFile {
  path: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number;
  extractedText: string | null;
}

/**
 * Extrai texto do arquivo para o WayOn usar como contexto (RAG-lite). PDF via `unpdf`
 * (import dinâmico), texto puro direto. Outros formatos → null. Nunca lança.
 */
export async function extractMaterialText(
  bytes: Uint8Array,
  mimeType: string | null,
  fileName: string,
): Promise<string | null> {
  try {
    const isPdf = mimeType === 'application/pdf' || /\.pdf$/i.test(fileName);
    if (isPdf) {
      const { extractText, getDocumentProxy } = await import('unpdf');
      const pdf = await getDocumentProxy(bytes);
      const { text } = await extractText(pdf, { mergePages: true });
      const t = (Array.isArray(text) ? text.join('\n') : text).trim();
      return t ? t.slice(0, 40_000) : null;
    }
    if (mimeType?.startsWith('text/') || /\.(txt|md|csv)$/i.test(fileName)) {
      const t = new TextDecoder().decode(bytes).trim();
      return t ? t.slice(0, 40_000) : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sobe um material no bucket PRIVADO `tenant-files`, em `<tenant>/<turma>/<ts>-<nome>`.
 * Nada público: o acesso é só por signed URL gerada no servidor. Devolve os metadados.
 */
export async function uploadTenantFile(
  tenantId: string,
  classId: string,
  file: File,
): Promise<UploadedFile> {
  if (file.size === 0) throw new Error('Arquivo vazio.');
  if (file.size > MATERIAL_MAX_BYTES) throw new Error('Arquivo muito grande (máx. 25 MB).');
  const safe = (file.name.split('/').pop() ?? 'arquivo')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-80);
  const path = `${tenantId}/${classId}/${Date.now()}-${safe || 'arquivo'}`;
  const sb = serviceClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await sb.storage.from('tenant-files').upload(path, bytes, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  const extractedText = await extractMaterialText(bytes, file.type || null, file.name);
  return {
    path,
    fileName: file.name,
    mimeType: file.type || null,
    sizeBytes: file.size,
    extractedText,
  };
}

/** Gera uma URL temporária (default 1h) para baixar um arquivo do bucket privado. */
export async function signedUrlForTenantFile(
  path: string,
  expiresInSec = 3600,
): Promise<string | null> {
  const { data, error } = await serviceClient()
    .storage.from('tenant-files')
    .createSignedUrl(path, expiresInSec);
  return error ? null : data.signedUrl;
}

/** Remove o arquivo do bucket privado (ao excluir o material). */
export async function removeTenantFile(path: string): Promise<void> {
  await serviceClient().storage.from('tenant-files').remove([path]);
}
