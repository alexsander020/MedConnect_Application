import { env } from '../../config/env';

/**
 * Armazenamento privado de receitas no Supabase Storage (API REST, sem supabase-js).
 *
 * - O bucket é privado e não tem policies em `storage.objects`: só a chave secreta (server-side)
 *   lê ou grava. A chave nunca sai do backend.
 * - O identificador gravado no banco é `supabase://<caminho-no-bucket>`, nunca uma URL pública.
 * - A leitura é sempre por URL assinada de curta duração, emitida após a trilha de auditoria.
 */

export const SUPABASE_FILE_PREFIX = 'supabase://';

export function isSupabaseStorageConfigured(): boolean {
  return !!(env.SUPABASE_URL && env.SUPABASE_SECRET_KEY);
}

function storageBaseUrl(): string {
  return `${String(env.SUPABASE_URL).replace(/\/+$/, '')}/storage/v1`;
}

function authHeaders(): Record<string, string> {
  const key = String(env.SUPABASE_SECRET_KEY);
  return { apikey: key, Authorization: `Bearer ${key}` };
}

/** Codifica cada segmento do caminho, preservando as barras. */
function encodeObjectPath(objectPath: string): string {
  return objectPath.split('/').map(encodeURIComponent).join('/');
}

export async function uploadToSupabaseStorage(
  objectPath: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const url = `${storageBaseUrl()}/object/${env.SUPABASE_STORAGE_BUCKET}/${encodeObjectPath(objectPath)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'x-upsert': 'false'
    },
    body: new Uint8Array(body)
  });

  if (!response.ok) {
    throw {
      status: 500,
      code: 'UPLOAD_FAILED',
      message: 'Falha no upload para armazenamento em nuvem.'
    };
  }

  return `${SUPABASE_FILE_PREFIX}${objectPath}`;
}

export async function createSupabaseSignedUrl(fileIdentifier: string, expiresInSeconds: number): Promise<string> {
  const objectPath = fileIdentifier.slice(SUPABASE_FILE_PREFIX.length);
  const url = `${storageBaseUrl()}/object/sign/${env.SUPABASE_STORAGE_BUCKET}/${encodeObjectPath(objectPath)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: expiresInSeconds })
  });

  const payload = response.ok ? ((await response.json()) as { signedURL?: string; signedUrl?: string }) : null;
  const signedPath = payload?.signedURL || payload?.signedUrl;
  if (!signedPath) {
    throw {
      status: 502,
      code: 'SIGNED_URL_FAILED',
      message: 'Não foi possível gerar o link temporário da receita.'
    };
  }

  // A API devolve o caminho relativo a /storage/v1 (ex.: "/object/sign/<bucket>/<arquivo>?token=...")
  return /^https?:\/\//i.test(signedPath) ? signedPath : `${storageBaseUrl()}${signedPath}`;
}
