import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Módulo de Criptografia em Repouso para Campos Sensíveis (LGPD Art. 46 / Segurança da Informação).
 * Implementa AES-256-GCM com IV aleatório de 12 bytes (96 bits) e AuthTag de 16 bytes (128 bits).
 * 
 * Suporta Rotação de Chaves através de versionamento por `keyId`:
 * Formato padrão: "{keyId}:{ivHex}:{tagHex}:{ciphertextHex}"
 * Formato legado suportado (retrocompatibilidade): "{ivHex}:{tagHex}:{ciphertextHex}" (assume keyId="v1")
 */

export interface Keyring {
  [keyId: string]: string;
}

export { maskCpf } from './cpfCrypto';

let customKeyring: Keyring | null = null;
let currentKeyIdOverride: string | null = null;

export function setCustomKeyring(keyring: Keyring | null, activeKeyId?: string): void {
  customKeyring = keyring;
  if (activeKeyId) {
    currentKeyIdOverride = activeKeyId;
  }
}

export function getCurrentKeyId(): string {
  if (currentKeyIdOverride) {
    return currentKeyIdOverride;
  }
  return process.env.FIELD_ENCRYPTION_CURRENT_KEY_ID || 'v1';
}

/**
 * Obtém o Buffer de 32 bytes para a chave solicitada.
 * Busca no keyring customizado, variável FIELD_ENCRYPTION_KEYS (JSON) ou fallback para CPF_ENCRYPTION_KEY.
 */
export function getKeyBuffer(keyId: string = getCurrentKeyId()): Buffer {
  // 1. Verificar custom keyring em memória (útil para testes de rotação)
  if (customKeyring && customKeyring[keyId]) {
    return crypto.createHash('sha256').update(customKeyring[keyId]).digest();
  }

  // 2. Verificar variável de ambiente FIELD_ENCRYPTION_KEYS (JSON)
  if (process.env.FIELD_ENCRYPTION_KEYS) {
    try {
      const parsed = JSON.parse(process.env.FIELD_ENCRYPTION_KEYS);
      if (parsed[keyId]) {
        return crypto.createHash('sha256').update(parsed[keyId]).digest();
      }
    } catch {
      // JSON inválido, prossegue para os fallbacks
    }
  }

  // 3. Fallback para chave única configurada ou chave padrão dev
  const baseKey = env.CPF_ENCRYPTION_KEY || 'default_dev_key_32_bytes_long_min!';
  // Caso seja outra versão não especificada, combina keyId com baseKey para testes reproduzíveis
  const keySeed = keyId === 'v1' ? baseKey : `${baseKey}:${keyId}`;
  return crypto.createHash('sha256').update(keySeed).digest();
}

/**
 * Verifica se uma string possui o formato de valor criptografado AES-256-GCM.
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  const parts = value.split(':');
  if (parts.length === 3) {
    // Formato legado: iv (24 hex), tag (32 hex), ciphertext
    const [iv, tag, cipher] = parts;
    return /^[0-9a-f]{24}$/i.test(iv) && /^[0-9a-f]{32}$/i.test(tag) && /^[0-9a-f]+$/i.test(cipher);
  }
  if (parts.length === 4) {
    // Formato com keyId: keyId, iv (24 hex), tag (32 hex), ciphertext
    const [, iv, tag, cipher] = parts;
    return /^[0-9a-f]{24}$/i.test(iv) && /^[0-9a-f]{32}$/i.test(tag) && /^[0-9a-f]+$/i.test(cipher);
  }
  return false;
}

/**
 * Criptografa um texto em repouso com AES-256-GCM usando o keyId atual ou o especificado.
 */
export function encryptField(plaintext: string, keyId: string = getCurrentKeyId()): string {
  if (plaintext === null || plaintext === undefined) {
    return plaintext;
  }
  const str = String(plaintext);
  const iv = crypto.randomBytes(12);
  const key = getKeyBuffer(keyId);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${keyId}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Descriptografa um valor criptografado em repouso com validação por AuthTag.
 */
export function decryptField(encryptedData: string): string {
  if (!encryptedData || typeof encryptedData !== 'string') {
    throw new Error('Dado inválido para descriptografia');
  }

  const parts = encryptedData.split(':');
  let keyId = 'v1';
  let ivHex: string;
  let tagHex: string;
  let ciphertextHex: string;

  if (parts.length === 4) {
    [keyId, ivHex, tagHex, ciphertextHex] = parts;
  } else if (parts.length === 3) {
    [ivHex, tagHex, ciphertextHex] = parts;
  } else {
    throw new Error('Formato inválido de dados criptografados');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const key = getKeyBuffer(keyId);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Descriptografa com segurança: se já for texto plano, retorna o próprio texto;
 * se for criptografado, descriptografa.
 */
export function decryptFieldSafe(value: string | null | undefined): string | null | undefined {
  if (!value || typeof value !== 'string') return value;
  if (!isEncrypted(value)) return value;
  try {
    return decryptField(value);
  } catch {
    return value;
  }
}

/**
 * Rotaciona um dado criptografado para um novo keyId.
 */
export function rotateEncryptedField(
  encryptedData: string,
  targetKeyId: string = getCurrentKeyId()
): { rotatedValue: string; fromKeyId: string; toKeyId: string } {
  const parts = encryptedData.split(':');
  const fromKeyId = parts.length === 4 ? parts[0] : 'v1';
  const plaintext = decryptField(encryptedData);
  const rotatedValue = encryptField(plaintext, targetKeyId);

  return {
    rotatedValue,
    fromKeyId,
    toKeyId: targetKeyId
  };
}
