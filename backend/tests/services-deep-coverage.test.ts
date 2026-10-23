import { BrasilApiCnpjLookup } from '../src/services/cnpj/brasilApiCnpjLookup';
import { SmtpEmailSender } from '../src/services/email/smtpEmailSender';
import {
  validateMagicBytes,
  stripExifMetadata,
  malwareScanner,
  generateSignedPrescriptionUrl,
  verifyLocalSignedUrl
} from '../src/services/prescriptionSecurity';
import { processAndSavePrescriptionFile } from '../src/services/upload';
import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import nodemailer from 'nodemailer';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../src/config/env';

jest.mock('nodemailer');

describe('TAREFA 3.1 — Cobertura Profunda de Serviços (Services >= 80%)', () => {
  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
  });

  describe('1. BrasilApiCnpjLookup', () => {
    it('deve formatar resultado quando a BrasilAPI retorna sucesso', async () => {
      const lookup = new BrasilApiCnpjLookup();

      // Mock global fetch
      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          razao_social: 'Farmácia Modelo LTDA',
          nome_fantasia: 'Drogaria Modelo',
          descricao_situacao_cadastral: 'ATIVA',
          data_situacao_cadastral: '2020-01-01',
          cnae_fiscal_descricao: 'Comércio varejista de produtos farmacêuticos',
          uf: 'SP',
          municipio: 'São Paulo',
          logradouro: 'Rua Principal',
          numero: '100',
          cep: '01000-000'
        })
      } as any);

      const result = await lookup.lookup('11.222.333/0001-81');
      expect(result.cnpj).toBe('11222333000181');
      expect(result.razaoSocial).toBe('Farmácia Modelo LTDA');
      expect(result.situacaoCadastral).toBe('ATIVA');
      expect(result.uf).toBe('SP');

      mockFetch.mockRestore();
    });

    it('deve usar fallback gracioso quando a API externa falha', async () => {
      const lookup = new BrasilApiCnpjLookup();
      const mockFetch = jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network timeout'));

      const result = await lookup.lookup('11222333000181');
      expect(result.cnpj).toBe('11222333000181');
      expect(result.razaoSocial).toBe('Farmácia Cadastrada');
      expect(result.situacaoCadastral).toBe('ATIVA');
      expect((result.rawData as any)?.error).toContain('Network timeout');

      mockFetch.mockRestore();
    });

    it('deve lançar erro se o CNPJ não tiver 14 dígitos', async () => {
      const lookup = new BrasilApiCnpjLookup();
      await expect(lookup.lookup('123')).rejects.toThrow('CNPJ deve conter 14 dígitos');
    });
  });

  describe('2. SmtpEmailSender', () => {
    it('deve chamar transporter.sendMail com parâmetros corretos', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'msg-123' });
      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        sendMail: mockSendMail
      });

      const sender = new SmtpEmailSender();
      await sender.sendEmail({
        to: 'destinatario@medconnect.com',
        subject: 'Teste de Assunto',
        text: 'Corpo texto plano',
        html: '<p>Corpo HTML</p>'
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'destinatario@medconnect.com',
          subject: 'Teste de Assunto',
          text: 'Corpo texto plano',
          html: '<p>Corpo HTML</p>'
        })
      );
    });
  });

  describe('3. Prescription Security & Magic Bytes', () => {
    it('deve validar e identificar magic bytes de PDF', () => {
      const pdfBuffer = Buffer.from('%PDF-1.7\nconteudo...');
      const res = validateMagicBytes(pdfBuffer);
      expect(res.isValid).toBe(true);
      expect(res.detectedType).toBe('pdf');
    });

    it('deve validar e identificar magic bytes de JPEG e PNG', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const resJpeg = validateMagicBytes(jpegBuffer);
      expect(resJpeg.isValid).toBe(true);
      expect(resJpeg.detectedType).toBe('jpeg');

      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const resPng = validateMagicBytes(pngBuffer);
      expect(resPng.isValid).toBe(true);
      expect(resPng.detectedType).toBe('png');
    });

    it('deve rejeitar executáveis ou arquivos inválidos', () => {
      const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // 'MZ' Windows executable
      const resExe = validateMagicBytes(exeBuffer);
      expect(resExe.isValid).toBe(false);
      expect(resExe.error).toMatch(/executável/i);

      const textBuffer = Buffer.from('console.log("malware");');
      const resText = validateMagicBytes(textBuffer);
      expect(resText.isValid).toBe(false);
    });

    it('deve passar pela verificação de malware e remoção de EXIF', async () => {
      const buffer = Buffer.from('%PDF-1.4\n...');
      const malwareCheck = await malwareScanner.scan(buffer);
      expect(malwareCheck.isClean).toBe(true);

      const stripped = await stripExifMetadata(buffer, 'pdf');
      expect(stripped).toBeDefined();
    });

    it('deve gerar e verificar URL assinada de acesso à receita', async () => {
      const patient = await prisma.user.create({
        data: {
          id: 'sec-patient-1',
          name: 'Paciente Sec',
          email: 'sec@test.com',
          password: 'Password123!',
          role: 'PATIENT'
        }
      });

      const presc = await prisma.prescription.create({
        data: {
          id: 'sec-presc-1',
          patientId: patient.id,
          fileUrl: 'local://receita.pdf',
          status: 'PENDING'
        }
      });

      const signed = await generateSignedPrescriptionUrl(
        presc,
        { id: patient.id, role: 'PATIENT' },
        '127.0.0.1'
      );

      expect(signed.signedUrl).toBeDefined();
      expect(signed.expiresInSeconds).toBe(300);

      // Verificação de log de auditoria
      const accessLog = await prisma.prescriptionAccessLog.findFirst({
        where: { prescriptionId: presc.id }
      });
      expect(accessLog).toBeDefined();
      expect(accessLog?.accessedById).toBe(patient.id);
    });

    it('deve rejeitar URL com HMAC inválido ou expirada', () => {
      const invalid = verifyLocalSignedUrl(
        'sec-presc-1',
        'actor-1',
        'fake-token-tampered',
        Math.floor(Date.now() / 1000) + 10000
      );
      expect(invalid).toBe(false);

      const expired = verifyLocalSignedUrl(
        'sec-presc-1',
        'actor-1',
        'any-token',
        Math.floor(Date.now() / 1000) - 5000
      );
      expect(expired).toBe(false);
    });

    it('deve remover metadados EXIF (segmento APP1) de imagens JPEG', () => {
      // JPEG com SOI (0xFFD8) + APP1 (0xFFE1) com length 8 + SOS (0xFFDA)
      const jpegWithExif = Buffer.from([
        0xff, 0xd8,
        0xff, 0xe1,
        0x00, 0x08,
        0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
        0xff, 0xda,
        0x12, 0x34
      ]);

      const stripped = stripExifMetadata(jpegWithExif, 'jpeg');
      expect(stripped.length).toBeLessThan(jpegWithExif.length);
      expect(stripped.includes(Buffer.from([0xff, 0xe1]))).toBe(false);
    });

    it('deve gerar URL assinada do Cloudinary quando configurado e arquivo for cloudinary://', async () => {
      const patient = await prisma.user.create({
        data: {
          id: 'sec-patient-cld',
          name: 'Paciente Cloudinary',
          email: 'cld@test.com',
          password: 'Password123!',
          role: 'PATIENT'
        }
      });
      const presc = await prisma.prescription.create({
        data: {
          id: 'sec-presc-cld',
          patientId: patient.id,
          fileUrl: 'cloudinary://prescription-uuid-1234',
          status: 'PENDING'
        }
      });

      const origName = env.CLOUDINARY_CLOUD_NAME;
      const origKey = env.CLOUDINARY_API_KEY;
      const origSec = env.CLOUDINARY_API_SECRET;
      (env as any).CLOUDINARY_CLOUD_NAME = 'real-cloud-name';
      (env as any).CLOUDINARY_API_KEY = 'real-key';
      (env as any).CLOUDINARY_API_SECRET = 'real-secret';

      const spyUrl = jest.spyOn(cloudinary.utils, 'url').mockReturnValue('https://res.cloudinary.com/signed-url');

      const res = await generateSignedPrescriptionUrl(presc, { id: patient.id, role: 'PATIENT' });
      expect(res.signedUrl).toBe('https://res.cloudinary.com/signed-url');

      spyUrl.mockRestore();
      (env as any).CLOUDINARY_CLOUD_NAME = origName;
      (env as any).CLOUDINARY_API_KEY = origKey;
      (env as any).CLOUDINARY_API_SECRET = origSec;
    });
  });

  describe('4. Upload Service (processAndSavePrescriptionFile)', () => {
    it('deve salvar arquivo local com identificador seguro e tipo detectado', async () => {
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'receita_medica.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 100,
        buffer: Buffer.from('%PDF-1.4\nconteudo de teste'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any
      };

      const result = await processAndSavePrescriptionFile(file);
      expect(result.fileIdentifier).toBeDefined();
      expect(result.fileIdentifier).toMatch(/^local:\/\/|cloudinary:\/\//);
      expect(result.detectedType).toBe('pdf');
    });

    it('deve rejeitar arquivo sem buffer', async () => {
      await expect(processAndSavePrescriptionFile({} as any)).rejects.toMatchObject({
        code: 'MISSING_FILE'
      });
    });
  });
});

