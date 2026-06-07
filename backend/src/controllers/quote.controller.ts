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

      const quote = await prisma.quote.create({
        data: {
          prescriptionId,
          pharmacyId: req.user.id,
          price,
          deliveryDays,
          notes,
          status: 'QUOTED'
        }
      });
      
      // Atualiza o status da receita para 'QUOTED'
      const prescription = await prisma.prescription.update({
        where: { id: prescriptionId },
        data: { status: 'QUOTED' }
      });
      
      // Notificação em tempo real via WebSocket
      // Emite um evento para a sala do paciente que fez a receita
      io.to(prescription.patientId).emit('new_quote', {
        message: 'Você recebeu uma nova cotação!',
        quote
      });
      
      res.status(201).json(quote);
    } catch (error) {
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
