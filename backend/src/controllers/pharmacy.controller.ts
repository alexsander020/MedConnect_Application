import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { ehEmailValido, ehSenhaForte, ehCNPJValido } from '@medconnect/validation';
import { AuthRequest } from '../middlewares/auth.middleware';
import { cnpjLookup } from '../services/cnpj';
import { formatPriceCentsToDecimal } from '../lib/money';
import { OrderStatus, QuoteStatus, PharmacyVerificationStatus } from '@prisma/client';

export class PharmacyController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        email,
        password,
        cnpj,
        phone,
        address,
        deliveryArea,
        sanitaryLicense,
        operatingAuth,
        technicalResponsibleName,
        technicalResponsibleCrf,
        technicalResponsibleUf,
        documentUrl
      } = req.body;

      if (!name || !email || !password || !cnpj) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Nome, e-mail, senha e CNPJ são obrigatórios'
          }
        });
        return;
      }

      if (!ehEmailValido(email)) {
        res.status(400).json({
          error: {
            code: 'INVALID_EMAIL',
            message: 'Formato de e-mail inválido'
          }
        });
        return;
      }

      if (!ehSenhaForte(password)) {
        res.status(400).json({
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Senha fraca. A senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, número e caractere especial.'
          }
        });
        return;
      }

      if (!ehCNPJValido(cnpj)) {
        res.status(400).json({
          error: {
            code: 'INVALID_CNPJ',
            message: 'CNPJ inválido. Verifique os 14 dígitos informados.'
          }
        });
        return;
      }

      const cleanCNPJ = String(cnpj).replace(/[^\d]+/g, '');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Consulta de situação cadastral do CNPJ via CnpjLookup
      let cnpjEvidenceData: string | null = null;
      try {
        const lookupResult = await cnpjLookup.lookup(cleanCNPJ);
        cnpjEvidenceData = JSON.stringify(lookupResult);
      } catch (e) {
        // Não impede o cadastro se a consulta externa oscilar
      }

      const pharmacy = await prisma.pharmacy.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          cnpj: cleanCNPJ,
          phone,
          address,
          deliveryArea,
          verified: false,
          verificationStatus: PharmacyVerificationStatus.PENDING_VERIFICATION,
          sanitaryLicense,
          operatingAuth,
          technicalResponsibleName,
          technicalResponsibleCrf,
          technicalResponsibleUf,
          documentUrl,
          cnpjData: cnpjEvidenceData,
          emailVerified: false
        }
      });

      const { password: _, ...pharmacyWithoutPassword } = pharmacy;
      res.status(201).json(pharmacyWithoutPassword);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const isEmail = error?.meta?.target?.includes('email');
        res.status(409).json({
          error: {
            code: isEmail ? 'EMAIL_ALREADY_EXISTS' : 'CNPJ_ALREADY_EXISTS',
            message: isEmail ? 'E-mail já está cadastrado.' : 'CNPJ já está cadastrado.'
          }
        });
        return;
      }
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Erro ao criar farmácia. Verifique os dados.'
        }
      });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const pharmacies = await prisma.pharmacy.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          cnpj: true,
          phone: true,
          address: true,
          deliveryArea: true,
          verified: true,
          verificationStatus: true,
          createdAt: true
        }
      });
      res.json(pharmacies);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar farmácias' } });
    }
  }

  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      if (req.user.role !== 'PHARMACY') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Apenas farmácias têm acesso a métricas' } });
        return;
      }

      const pharmacyId = req.user.id;

      const [
        pharmacy,
        totalQuotes,
        pendingQuotes,
        acceptedQuotes,
        productionOrders,
        deliveryOrders,
        deliveredOrders,
        reviews
      ] = await Promise.all([
        prisma.pharmacy.findUnique({ where: { id: pharmacyId } }),
        prisma.quote.count({ where: { pharmacyId } }),
        prisma.quote.count({ where: { pharmacyId, status: QuoteStatus.PENDING } }),
        prisma.quote.count({ where: { pharmacyId, status: QuoteStatus.ACCEPTED } }),
        prisma.order.count({ where: { quote: { pharmacyId }, status: OrderStatus.PRODUCTION } }),
        prisma.order.count({ where: { quote: { pharmacyId }, status: OrderStatus.DELIVERY } }),
        prisma.order.findMany({
          where: { quote: { pharmacyId }, status: OrderStatus.DELIVERED },
          include: { quote: true }
        }),
        prisma.review.findMany({
          where: { pharmacyId }
        })
      ]);

      const totalRevenueCents = deliveredOrders.reduce((sum, o) => sum + o.quote.priceCents, 0);
      const averageRating =
        reviews.length > 0
          ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1))
          : 5.0;

      const totalOrders = productionOrders + deliveryOrders + deliveredOrders.length;
      const inProgressOrders = productionOrders + deliveryOrders;

      res.json({
        verificationStatus: pharmacy?.verificationStatus || 'PENDING_VERIFICATION',
        verified: pharmacy?.verified || false,
        totalQuotes,
        pendingQuotes,
        acceptedQuotes,
        totalOrders,
        inProgressOrders,
        productionOrders,
        deliveryOrders,
        deliveredOrders: deliveredOrders.length,
        totalRevenueCents,
        totalRevenue: formatPriceCentsToDecimal(totalRevenueCents),
        averageRating,
        reviewsCount: reviews.length
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao calcular métricas da farmácia' } });
    }
  }
}
