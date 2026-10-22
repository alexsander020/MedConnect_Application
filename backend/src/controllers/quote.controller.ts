import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { io } from '../server';
import { parsePriceToCents, formatPriceCentsToDecimal } from '../lib/money';
import { PrescriptionStatus, QuoteStatus } from '@prisma/client';
import { createAndSendNotification } from '../services/notificationService';

export class QuoteController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      if (req.user.role !== 'PHARMACY') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Apenas farmácias podem enviar cotações' } });
        return;
      }

      // Guard: Exigir farmácia com verificação ativa (VERIFIED)
      const pharmacy = await prisma.pharmacy.findUnique({
        where: { id: req.user.id }
      });

      if (!pharmacy || pharmacy.verificationStatus !== 'VERIFIED' || !pharmacy.verified) {
        res.status(403).json({
          error: {
            code: 'PHARMACY_NOT_VERIFIED',
            message: 'Apenas farmácias com verificação ativa podem enviar orçamentos na plataforma.'
          }
        });
        return;
      }

      const { prescriptionId, price, deliveryDays, notes } = req.body;

      if (!prescriptionId) {
        res.status(400).json({ error: { code: 'MISSING_FIELD', message: 'ID da receita é obrigatório' } });
        return;
      }

      let priceCents: number;
      try {
        priceCents = parsePriceToCents(price);
      } catch (err: any) {
        res.status(400).json({ error: { code: 'INVALID_PRICE', message: err.message } });
        return;
      }

      const parsedDays =
        deliveryDays !== undefined && deliveryDays !== null && deliveryDays !== ''
          ? parseInt(String(deliveryDays), 10)
          : null;

      const prescription = await prisma.prescription.findUnique({
        where: { id: prescriptionId }
      });

      if (!prescription) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receita não encontrada' } });
        return;
      }

      // Rejeita se a receita já foi aceita ou cancelada (409)
      if (
        prescription.status === PrescriptionStatus.ACCEPTED ||
        prescription.status === PrescriptionStatus.CANCELLED
      ) {
        res.status(409).json({
          error: {
            code: 'PRESCRIPTION_ALREADY_FINALIZED',
            message: 'Esta receita já foi aceita ou cancelada e não pode mais receber cotações'
          }
        });
        return;
      }

      // Rejeita se a farmácia já cotou essa receita (409)
      const existingQuote = await prisma.quote.findUnique({
        where: {
          prescriptionId_pharmacyId: {
            prescriptionId,
            pharmacyId: req.user.id
          }
        }
      });

      if (existingQuote) {
        res.status(409).json({
          error: {
            code: 'QUOTE_ALREADY_EXISTS',
            message: 'Esta farmácia já enviou uma cotação para esta receita'
          }
        });
        return;
      }

      // Cria a cotação
      const quote = await prisma.quote.create({
        data: {
          prescriptionId,
          pharmacyId: req.user.id,
          priceCents,
          deliveryDays: parsedDays,
          notes: notes ? String(notes).trim() : null,
          status: QuoteStatus.PENDING
        },
        include: {
          pharmacy: { select: { id: true, name: true, phone: true } }
        }
      });

      // Atualiza o status da receita para 'QUOTED' se ainda estava 'PENDING'
      if (prescription.status === PrescriptionStatus.PENDING) {
        await prisma.prescription.update({
          where: { id: prescriptionId },
          data: { status: PrescriptionStatus.QUOTED }
        });
      }

      // Notificação persistida e em tempo real via WebSocket
      try {
        await createAndSendNotification({
          userId: prescription.patientId,
          type: 'NEW_QUOTE',
          title: 'Nova Proposta de Cotação',
          message: `Você recebeu uma nova cotação no valor de R$ ${formatPriceCentsToDecimal(quote.priceCents)}.`
        });
        io.to(prescription.patientId).emit('new_quote', {
          message: 'Você recebeu uma nova cotação!',
          quote: {
            ...quote,
            price: formatPriceCentsToDecimal(quote.priceCents)
          }
        });
      } catch (e) {
        // Ignora erros de websocket em teste ou sem clientes conectados
      }

      res.status(201).json({
        ...quote,
        price: formatPriceCentsToDecimal(quote.priceCents)
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json({
          error: {
            code: 'QUOTE_ALREADY_EXISTS',
            message: 'Esta farmácia já enviou uma cotação para esta receita'
          }
        });
        return;
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao enviar cotação' } });
    }
  }

  async getPharmacyQuotes(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const quotes = await prisma.quote.findMany({
        where: { pharmacyId: req.user.id },
        include: { prescription: true, order: true }
      });

      const formatted = quotes.map((q) => ({
        ...q,
        price: formatPriceCentsToDecimal(q.priceCents)
      }));

      res.json(formatted);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar cotações da farmácia' } });
    }
  }
}
