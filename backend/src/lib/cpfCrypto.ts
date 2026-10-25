import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Utilitário de criptografia e hashing seguro de CPF utilizando AES-256-GCM e HMAC-SHA256.
 * Atende às diretrizes da LGPD (anonimização, pseudonimização e confidencialidade).
 */

function getKey(): Buffer {
  const rawKey = env.CPF_ENCRYPTION_KEY || 'default_dev_key_32_bytes_long_min!';
  // Garante exatamente 32 bytes para AES-256
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Remove qualquer caractere não numérico do CPF.
 */
export function sanitizeCpf(cpf: string): string {
  return String(cpf).replace(/\D/g, '');
}

/**
 * Criptografa o CPF usando AES-256-GCM com IV aleatório de 12 bytes.
 * Formato retornado: "iv_hex:tag_hex:ciphertext_hex"
 */
export function encryptCpf(rawCpf: string): string {
  const clean = sanitizeCpf(rawCpf);
  const iv = crypto.randomBytes(12);
  const key = getKey();

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(clean, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Descriptografa o CPF com validação de integridade por AuthTag.
 */
export function decryptCpf(encryptedData: string): string {
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
    throw new Error('Formato inválido de CPF criptografado');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const key = getKey();

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Gera um hash determinístico HMAC-SHA256 do CPF para busca segura e índice de unicidade.
 */
export function hashCpf(rawCpf: string): string {
  const clean = sanitizeCpf(rawCpf);
  const key = getKey();
  return crypto.createHmac('sha256', key).update(clean).digest('hex');
}

/**
 * Extrai os 2 últimos dígitos para máscara e exibição segura (ex: "***.***.***-89").
 */
export function getCpfLastDigits(rawCpf: string): string {
  const clean = sanitizeCpf(rawCpf);
  return clean.slice(-2);
}

/**
 * Formata CPF para exibição mascarada.
 */
export function maskCpf(lastDigits: string): string {
  return `***.***.***-${lastDigits}`;
}
