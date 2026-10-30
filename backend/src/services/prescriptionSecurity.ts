import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';
import { AuditLogService } from './auditLogService';

export interface FileValidationResult {
  isValid: boolean;
  detectedType: 'pdf' | 'jpeg' | 'png' | 'unknown';
  error?: string;
}

export interface MalwareScanner {
  scan(buffer: Buffer): Promise<{ isClean: boolean; reason?: string }>;
}

export class DefaultMalwareScanner implements MalwareScanner {
  async scan(buffer: Buffer): Promise<{ isClean: boolean; reason?: string }> {
    // Ponto de extensão para antivírus (ex.: ClamAV daemon via socket)
    // Simula bloqueio de assinaturas maliciosas conhecidas (ex.: EICAR test string)
    const eicarSignature = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    if (buffer.toString('utf8').includes(eicarSignature)) {
      return { isClean: false, reason: 'Assinatura de arquivo suspeito/malware detectada.' };
    }
    return { isClean: true };
  }
}

/**
 * Inspeciona os Magic Bytes (cabeçalho binário real) do arquivo.
 */
export function validateMagicBytes(buffer: Buffer): FileValidationResult {
  if (!buffer || buffer.length < 4) {
    return { isValid: false, detectedType: 'unknown', error: 'Arquivo vazio ou truncado.' };
  }

  // 1. PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { isValid: true, detectedType: 'pdf' };
  }

  // 2. JPEG: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, detectedType: 'jpeg' };
  }

  // 3. PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, detectedType: 'png' };
  }

  // Detecta executáveis comuns disfarçados
  // MZ (Windows PE): 0x4D 0x5A
  // ELF (Linux): 0x7F 0x45 0x4C 0x46
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return {
      isValid: false,
      detectedType: 'unknown',
      error: 'Arquivo executável Windows (MZ) não permitido.'
    };
  }

  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return {
      isValid: false,
      detectedType: 'unknown',
      error: 'Arquivo executável Linux (ELF) não permitido.'
    };
  }

  return {
    isValid: false,
    detectedType: 'unknown',
    error: 'Formato de arquivo incompatível. Apenas PDF, JPEG e PNG autênticos são aceitos.'
  };
}

/**
 * Remove metadados EXIF básicos de imagens JPEG para preservar a privacidade de localização do paciente.
 */
export function stripExifMetadata(buffer: Buffer, type: 'pdf' | 'jpeg' | 'png' | 'unknown'): Buffer {
  if (type !== 'jpeg') {
    return buffer;
  }

  try {
    // Localiza e remove segmentos APP1 (EXIF: 0xFF 0xE1)
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] === 0xff && buffer[offset + 1] === 0xe1) {
        const length = buffer.readUInt16BE(offset + 2);
        const before = buffer.subarray(0, offset);
        const after = buffer.subarray(offset + 2 + length);
        return Buffer.concat([before, after]);
      }
      if (buffer[offset] === 0xff && buffer[offset + 1] === 0xda) {
        break; // Início do scan de imagem
      }
      offset++;
    }
  } catch (err) {
    // Se falhar a remoção de baixo nível, retorna buffer original
  }
  return buffer;
}

const malwareScanner = new DefaultMalwareScanner();
export { malwareScanner };

/**
 * Gera URL assinada de visualização de curta duração (padrão 5 minutos = 300 segundos)
 * e registra auditoria compulsória em PrescriptionAccessLog.
 */
export async function generateSignedPrescriptionUrl(
  prescription: { id: string; fileUrl: string; patientId: string },
  actor: { id: string; role: Role | string },
  ipAddress?: string
): Promise<{ signedUrl: string; expiresInSeconds: number }> {
  const expiresInSeconds = 300; // 5 minutos
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  // 1. Gravação compulsória da linha de auditoria (LGPD Art. 11 & Segurança)
  await prisma.prescriptionAccessLog.create({
    data: {
      prescriptionId: prescription.id,
      accessedById: actor.id,
      accessedByType: actor.role as Role,
      ipAddress: ipAddress || '127.0.0.1'
    }
  });

  const hasCloudinary = !!(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_CLOUD_NAME !== 'demo' &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  );

  if (hasCloudinary && prescription.fileUrl.startsWith('cloudinary://')) {
    const publicId = prescription.fileUrl.replace('cloudinary://', '');
    const signedUrl = cloudinary.utils.url(publicId, {
      type: 'authenticated',
      sign_url: true,
      expires_at: expiresAt
    });
    return { signedUrl, expiresInSeconds };
  }

  // Fallback seguro com token HMAC determinístico para ambiente local/desenvolvimento
  const secret = env.JWT_SECRET || 'secret';
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(`${prescription.id}:${actor.id}:${expiresAt}`)
    .digest('hex');

  const signedUrl = `/api/prescriptions/${prescription.id}/view?token=${hmac}&expires=${expiresAt}`;
  return { signedUrl, expiresInSeconds };
}

/**
 * Valida o token de uma URL assinada local de receita.
 */
export function verifyLocalSignedUrl(
  prescriptionId: string,
  actorId: string,
  token: string,
  expiresTimestamp: number
): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (now > expiresTimestamp) {
    return false; // Expirada
  }

  const secret = env.JWT_SECRET || 'secret';
  const expectedHmac = crypto
    .createHmac('sha256', secret)
    .update(`${prescriptionId}:${actorId}:${expiresTimestamp}`)
    .digest('hex');

  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedHmac);

  if (tokenBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
}

/**
 * Gera URL assinada de curta duração (300 segundos) para abertura de documento de evidência
 * regulatória de capacidade da farmácia (exclusivo para ADMIN) e grava AuditLog imutável.
 */
export async function generateSignedCapabilityEvidenceUrl(
  capability: { id: string; pharmacyId: string; type: string },
  evidenceIndex: number,
  evidenceKey: string,
  actor: { id: string; email?: string; role: Role | string },
  ipAddress?: string,
  userAgent?: string
): Promise<{ signedUrl: string; expiresInSeconds: number; evidenceIndex: number }> {
  const expiresInSeconds = 300; // 5 minutos
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  await AuditLogService.log({
    actorId: actor.id,
    actorType: actor.role as Role,
    actorEmail: actor.email,
    action: 'VIEW_CAPABILITY_EVIDENCE',
    resource: 'PharmacyCapability',
    resourceId: capability.id,
    reason: 'ADMIN_REGULATORY_EVIDENCE_REVIEW',
    details: {
      pharmacyId: capability.pharmacyId,
      capabilityType: capability.type,
      evidenceIndex,
      evidenceKey
    },
    ipAddress: ipAddress || '127.0.0.1',
    userAgent: userAgent || 'unknown'
  });

  const hasCloudinary = !!(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_CLOUD_NAME !== 'demo' &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  );

  if (hasCloudinary && evidenceKey.startsWith('cloudinary://')) {
    const publicId = evidenceKey.replace('cloudinary://', '');
    const signedUrl = cloudinary.utils.url(publicId, {
      type: 'authenticated',
      sign_url: true,
      expires_at: expiresAt
    });
    return { signedUrl, expiresInSeconds, evidenceIndex };
  }

  const secret = env.JWT_SECRET || 'secret';
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(`cap_evidence:${capability.id}:${evidenceIndex}:${expiresAt}`)
    .digest('hex');

  const signedUrl = `/api/admin/capabilities/${capability.id}/evidences/${evidenceIndex}/view?token=${hmac}&expires=${expiresAt}`;
  return { signedUrl, expiresInSeconds, evidenceIndex };
}

/**
 * Valida o token HMAC e expiração de uma URL assinada de evidência regulatória.
 */
export function verifySignedCapabilityEvidenceUrl(
  capabilityId: string,
  evidenceIndex: number,
  token: string,
  expiresTimestamp: number
): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (now > expiresTimestamp) {
    return false;
  }

  const secret = env.JWT_SECRET || 'secret';
  const expectedHmac = crypto
    .createHmac('sha256', secret)
    .update(`cap_evidence:${capabilityId}:${evidenceIndex}:${expiresTimestamp}`)
    .digest('hex');

  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedHmac);

  if (tokenBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
}
