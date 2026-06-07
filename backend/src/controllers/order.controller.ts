import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export class OrderController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
         res.status(401).json({ error: 'Não autorizado' });
         return;
      }

      const { quoteId } = req.body;

      const order = await prisma.order.create({
        data: {
          quoteId,
          status: 'PRODUCTION'
        }
      });
      
      // Atualizar status da cotação para 'ACCEPTED'
      await prisma.quote.update({
        where: { id: quoteId },
        data: { status: 'ACCEPTED' }
      });
      
      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao aprovar cotação e gerar pedido' });
    }
  }

  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
         res.status(401).json({ error: 'Não autorizado' });
         return;
      }
      
      const { id } = req.params;
      const { status } = req.body;

      const order = await prisma.order.update({
        where: { id: id as string },
        data: { status: status as any }
      });
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
    }
  }
}
