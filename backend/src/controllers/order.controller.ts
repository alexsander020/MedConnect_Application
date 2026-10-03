import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const VALID_STATUSES = ['PENDING', 'REVIEWING', 'QUOTED', 'ACCEPTED', 'PRODUCTION', 'DELIVERY', 'DELIVERED', 'CANCELLED'];

export class OrderController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const { quoteId } = req.body;
      if (!quoteId) {
        res.status(400).json({ error: 'quoteId é obrigatório' });
        return;
      }

      // Validar existência da cotação e permissão do paciente
      const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: { prescription: true, orders: true }
      });

      if (!quote) {
        res.status(404).json({ error: 'Cotação não encontrada' });
        return;
      }

      // IDOR check: Apenas o paciente dono da receita pode aprovar
      if (quote.prescription.patientId !== req.user.id) {
        res.status(403).json({ error: 'Acesso negado: esta cotação pertence a outro paciente' });
        return;
      }

      // Evitar pedidos duplicados para a mesma cotação
      if (quote.orders.length > 0) {
        res.status(400).json({ error: 'Já existe um pedido para esta cotação' });
        return;
      }

      // Execução atômica com transação
      const [order] = await prisma.$transaction([
        prisma.order.create({
          data: {
            quoteId,
            status: 'PRODUCTION'
          }
        }),
        prisma.quote.update({
          where: { id: quoteId },
          data: { status: 'ACCEPTED' }
        }),
        prisma.prescription.update({
          where: { id: quote.prescriptionId },
          data: { status: 'ACCEPTED' }
        })
      ]);

      res.status(201).json(order);
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
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

      if (!status || !VALID_STATUSES.includes(status)) {
        res.status(400).json({
          error: `Status inválido. Valores aceitos: ${VALID_STATUSES.join(', ')}`
        });
        return;
      }

      const order = await prisma.order.findUnique({
        where: { id: id as string },
        include: { quote: true }
      });

      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado' });
        return;
      }

      // IDOR check: Apenas a farmácia dona da cotação do pedido pode alterar o status
      if (order.quote.pharmacyId !== req.user.id) {
        res.status(403).json({ error: 'Acesso negado: este pedido pertence a outra farmácia' });
        return;
      }

      const updatedOrder = await prisma.order.update({
        where: { id: id as string },
        data: { status: status as any }
      });

      res.json(updatedOrder);
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
    }
  }

  async getMyOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      let orders;
      if (req.user.role === 'PHARMACY') {
        orders = await prisma.order.findMany({
          where: {
            quote: { pharmacyId: req.user.id }
          },
          include: {
            quote: {
              include: {
                prescription: {
                  include: { patient: { select: { id: true, name: true, phone: true, address: true } } }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      } else {
        orders = await prisma.order.findMany({
          where: {
            quote: {
              prescription: { patientId: req.user.id }
            }
          },
          include: {
            quote: {
              include: {
                pharmacy: { select: { id: true, name: true, phone: true, address: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      }

      res.json(orders);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      res.status(500).json({ error: 'Erro ao buscar pedidos' });
    }
  }
}
