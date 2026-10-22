import { PrescriptionStatus, QuoteStatus, Role } from '@prisma/client';
import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { processAndSavePrescriptionFile } from '../services/upload';
import { generateSignedPrescriptionUrl, verifyLocalSignedUrl } from '../services/prescriptionSecurity';
import { formatPriceCentsToDecimal } from '../lib/money';

export class PrescriptionController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: { code: 'MISSING_FILE', message: 'Arquivo da receita médica é obrigatório' } });
        return;
      }

      // Validação de magic bytes, sanitização e armazenamento privado
      const uploadResult = await processAndSavePrescriptionFile(req.file);

      const prescription = await prisma.prescription.create({
        data: {
          patientId: req.user.id,
          fileUrl: uploadResult.fileIdentifier,
          status: PrescriptionStatus.PENDING
        }
      });

      res.status(201).json(prescription);
    } catch (error: any) {
      if (error?.status) {
        res.status(error.status).json({
          error: {
            code: error.code || 'BAD_REQUEST',
            message: error.message
          }
        });
        return;
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao processar receita' } });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const { id } = req.params;
      const prescription = await prisma.prescription.findUnique({
        where: { id: id as string },
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          quotes: {
            include: { pharmacy: { select: { id: true, name: true } } }
          }
        }
      });

      if (!prescription) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receita médica não encontrada' } });
        return;
      }

      // Se for paciente, valida IDOR
      if (req.user.role === 'PATIENT' && prescription.patientId !== req.user.id) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Acesso negado: esta receita pertence a outro paciente'
          }
        });
        return;
      }

      // Se for farmácia, valida que está verificada
      if (req.user.role === 'PHARMACY') {
        const pharmacy = await prisma.pharmacy.findUnique({ where: { id: req.user.id } });
        if (!pharmacy || pharmacy.verificationStatus !== 'VERIFIED') {
          res.status(403).json({
            error: {
              code: 'PHARMACY_NOT_VERIFIED',
              message: 'Apenas farmácias verificadas podem acessar dados de receitas.'
            }
          });
          return;
        }
      }

      // Formata preços das cotações
      const formattedQuotes = prescription.quotes.map((q) => ({
        ...q,
        price: formatPriceCentsToDecimal(q.priceCents)
      }));

      res.json({
        ...prescription,
        quotes: formattedQuotes
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar receita' } });
    }
  }

  async getQuotes(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const { id } = req.params;
      const prescription = await prisma.prescription.findUnique({
        where: { id: id as string }
      });

      if (!prescription) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receita não encontrada' } });
        return;
      }

      // Checagem de dono: apenas o paciente dono da receita pode listar todas as cotações
      if (prescription.patientId !== req.user.id && req.user.role !== 'ADMIN') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Acesso negado: você não tem permissão para visualizar as cotações desta receita'
          }
        });
        return;
      }

      const quotes = await prisma.quote.findMany({
        where: { prescriptionId: id as string },
        include: {
          pharmacy: {
            select: { id: true, name: true, phone: true, address: true, deliveryArea: true }
          }
        },
        orderBy: { priceCents: 'asc' }
      });

      const formatted = quotes.map((q) => ({
        ...q,
        price: formatPriceCentsToDecimal(q.priceCents)
      }));

      res.json(formatted);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar cotações da receita' } });
    }
  }

  async getSignedViewUrl(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const { id } = req.params;
      const prescription = await prisma.prescription.findUnique({
        where: { id: id as string },
        include: {
          quotes: {
            where: { status: QuoteStatus.ACCEPTED },
            include: { order: true }
          }
        }
      });

      if (!prescription) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receita não encontrada' } });
        return;
      }

      // Autorização estrita:
      // (a) Paciente titular da receita
      const isOwnerPatient = prescription.patientId === req.user.id;

      // (b) Farmácia que possui a cotação aceita / pedido em produção
      const isAcceptedPharmacy = prescription.quotes.some(
        (q) => q.pharmacyId === req.user!.id && q.status === QuoteStatus.ACCEPTED
      );

      const isAdmin = req.user.role === 'ADMIN';

      if (!isOwnerPatient && !isAcceptedPharmacy && !isAdmin) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Acesso negado: arquivo confidencial disponível apenas para o paciente titular ou a farmácia contratada.'
          }
        });
        return;
      }

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

      const signedData = await generateSignedPrescriptionUrl(
        prescription,
        { id: req.user.id, role: req.user.role },
        clientIp
      );

      res.json(signedData);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao gerar URL assinada de acesso' } });
    }
  }

  async serveLocalView(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { token, expires } = req.query;

      if (!token || !expires) {
        res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'Token e expiração são obrigatórios' } });
        return;
      }

      const prescription = await prisma.prescription.findUnique({ where: { id: id as string } });
      if (!prescription) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receita não encontrada' } });
        return;
      }

      // Validação do token assinado e expiração
      // O ator está registrado no log ou checado pelo HMAC
      const lastLog = await prisma.prescriptionAccessLog.findFirst({
        where: { prescriptionId: id as string },
        orderBy: { createdAt: 'desc' }
      });

      const actorId = lastLog?.accessedById || '';
      const isValid = verifyLocalSignedUrl(id as string, actorId, String(token), Number(expires));

      if (!isValid) {
        res.status(403).json({
          error: {
            code: 'EXPIRED_OR_INVALID_URL',
            message: 'Esta URL de visualização expirou ou é inválida.'
          }
        });
        return;
      }

      const filename = prescription.fileUrl.replace('local://', '');
      const filePath = path.join(process.cwd(), 'uploads', filename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: { code: 'FILE_NOT_FOUND', message: 'Arquivo físico não encontrado' } });
        return;
      }

      const ext = path.extname(filename).toLowerCase();
      const contentType = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'inline');
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao servir arquivo' } });
    }
  }

  async getMyPrescriptions(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const prescriptions = await prisma.prescription.findMany({
        where: { patientId: req.user.id },
        include: {
          quotes: {
            include: { pharmacy: { select: { id: true, name: true, phone: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formatted = prescriptions.map((p) => ({
        ...p,
        quotes: p.quotes.map((q) => ({
          ...q,
          price: formatPriceCentsToDecimal(q.priceCents)
        }))
      }));

      res.json(formatted);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar receitas' } });
    }
  }

  async getAvailableForPharmacy(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      if (req.user.role !== 'PHARMACY') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Apenas farmácias podem acessar o mural de receitas' } });
        return;
      }

      // Guard "farmácia verificada": somente VERIFIED vê receitas
      const pharmacy = await prisma.pharmacy.findUnique({ where: { id: req.user.id } });
      if (!pharmacy || pharmacy.verificationStatus !== 'VERIFIED') {
        res.status(403).json({
          error: {
            code: 'PHARMACY_NOT_VERIFIED',
            message: 'Apenas farmácias com verificação ativa podem visualizar o mural de receitas.'
          }
        });
        return;
      }

      const prescriptions = await prisma.prescription.findMany({
        where: {
          status: { in: [PrescriptionStatus.PENDING, PrescriptionStatus.QUOTED] }
        },
        include: {
          quotes: {
            where: { pharmacyId: req.user.id }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // LGPD Art. 11: Não expor dados diretos (nome, telefone, endereço) nem arquivo da receita na listagem aberta
      const sanitized = prescriptions.map((p) => ({
        id: p.id,
        createdAt: p.createdAt,
        status: p.status,
        patient: {
          anonymousId: `Paciente #${p.patientId.slice(0, 5).toUpperCase()}`
        },
        quotes: p.quotes.map((q) => ({
          ...q,
          price: formatPriceCentsToDecimal(q.priceCents)
        }))
      }));

      res.json(sanitized);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar receitas para farmácia' } });
    }
  }
}
