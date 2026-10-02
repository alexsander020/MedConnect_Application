import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { io } from '../server';

export class QuoteController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const { prescriptionId, price, deliveryDays, notes } = req.body;

      if (!prescriptionId) {
        res.status(400).json({ error: 'ID da receita é obrigatório' });
        return;
      }

      const parsedPrice = parseFloat(String(price).replace(',', '.'));
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        res.status(400).json({ error: 'Preço deve ser um número positivo válido' });
        return;
      }

      const parsedDays = deliveryDays !== undefined && deliveryDays !== null && deliveryDays !== ''
        ? parseInt(String(deliveryDays), 10)
        : null;

      const existingPrescription = await prisma.prescription.findUnique({
        where: { id: prescriptionId }
      });

      if (!existingPrescription) {
        res.status(404).json({ error: 'Receita não encontrada' });
        return;
      }

      const quote = await prisma.quote.create({
        data: {
          prescriptionId,
          pharmacyId: req.user.id,
          price: parsedPrice,
          deliveryDays: parsedDays,
          notes: notes ? String(notes).trim() : null,
          status: 'QUOTED'
        },
        include: {
          pharmacy: { select: { id: true, name: true, phone: true } }
        }
      });
      
      // Atualiza o status da receita para 'QUOTED'
      const prescription = await prisma.prescription.update({
        where: { id: prescriptionId },
        data: { status: 'QUOTED' }
      });
      
      // Notificação em tempo real via WebSocket
      io.to(prescription.patientId).emit('new_quote', {
        message: 'Você recebeu uma nova cotação!',
        quote
      });
      
      res.status(201).json(quote);
    } catch (error) {
      console.error('Erro ao enviar cotação:', error);
      res.status(500).json({ error: 'Erro ao enviar cotação' });
    }
  }

  async getPharmacyQuotes(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
         res.status(401).json({ error: 'Não autorizado' });
         return;
      }
      
      const quotes = await prisma.quote.findMany({
        where: { pharmacyId: req.user.id },
        include: { prescription: true, orders: true }
      });
      res.json(quotes);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar cotações da farmácia' });
    }
  }
}
