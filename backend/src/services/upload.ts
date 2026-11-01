import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { validateMagicBytes, stripExifMetadata, malwareScanner } from './prescriptionSecurity';
import { env } from '../config/env';

// Multer configurado com memória para permitir inspeção profunda de Magic Bytes e sanitização
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  }
});

export function isCloudinaryConfigured(): boolean {
  return !!(
  env.CLOUDINARY_CLOUD_NAME &&
  env.CLOUDINARY_CLOUD_NAME !== 'demo' &&
  env.CLOUDINARY_API_KEY &&
  env.CLOUDINARY_API_SECRET
  );
}

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
  });
}

export interface StoredPrescriptionResult {
  fileIdentifier: string; // "cloudinary://..." ou "local://..." (NUNCA caminho de disco do servidor)
  detectedType: string;
}

/**
 * Valida o conteúdo binário (magic bytes), varre contra malware, remove EXIF
 * e armazena de forma privada em Cloudinary (authenticated) ou disco local de desenvolvimento.
 */
export async function processAndSavePrescriptionFile(
  file: Express.Multer.File
): Promise<StoredPrescriptionResult> {
  if (!file || !file.buffer) {
    throw {
      status: 400,
      code: 'MISSING_FILE',
      message: 'Arquivo da receita médica é obrigatório.'
    };
  }

  // 1. Validação do conteúdo real (Magic Bytes)
  const validation = validateMagicBytes(file.buffer);
  if (!validation.isValid) {
    throw {
      status: 400,
      code: 'INVALID_FILE_CONTENT',
      message: validation.error || 'O conteúdo do arquivo não é um PDF, JPEG ou PNG válido.'
    };
  }

  // 2. Varredura de Malware / Assinaturas Suspeitas
  const scanResult = await malwareScanner.scan(file.buffer);
  if (!scanResult.isClean) {
    throw {
      status: 400,
      code: 'MALWARE_DETECTED',
      message: scanResult.reason || 'Arquivo rejeitado por políticas de segurança.'
    };
  }

  // 3. Remoção de Metadados EXIF
  const cleanBuffer = stripExifMetadata(file.buffer, validation.detectedType);

  // 4. Geração de nome único aleatório via UUID (não expõe nome original do arquivo do cliente)
  const fileUuid = crypto.randomUUID();
  const ext = validation.detectedType === 'pdf' ? '.pdf' : validation.detectedType === 'png' ? '.png' : '.jpg';

  // 5. Armazenamento Seguro
  if (isCloudinaryConfigured()) {
    cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET });
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'medconnect_prescriptions',
          public_id: fileUuid,
          type: 'authenticated', // Armazenamento privado autenticado (sem acesso público)
          resource_type: validation.detectedType === 'pdf' ? 'raw' : 'image'
        },
        (error, result) => {
          if (error || !result) {
            reject({
              status: 500,
              code: 'UPLOAD_FAILED',
              message: 'Falha no upload para armazenamento em nuvem.'
            });
          } else {
            resolve({
              fileIdentifier: `cloudinary://${result.public_id}`,
              detectedType: validation.detectedType
            });
          }
        }
      );
      uploadStream.end(cleanBuffer);
    });
  }

  // Fallback Local de Desenvolvimento: armazena em pasta 'uploads' sem expor caminhos absolutos
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filename = `${fileUuid}${ext}`;
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, cleanBuffer);

  return {
    fileIdentifier: `local://${filename}`,
    detectedType: validation.detectedType
  };
}
