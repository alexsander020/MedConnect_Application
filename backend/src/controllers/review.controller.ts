import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { OrderStatus } from '@prisma/client';

export class ReviewController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      if (req.user.role !== 'PATIENT') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Apenas pacientes podem avaliar pedidos entregues' } });
        return;
      }

      const { orderId, rating, comment } = req.body;

      if (!orderId || rating === undefined) {
        res.status(400).json({ error: { code: 'MISSING_FIELD', message: 'orderId e rating são obrigatórios' } });
        return;
      }

      const numericRating = Number(rating);
      if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
        res.status(400).json({ error: { code: 'INVALID_RATING', message: 'A nota da avaliação deve ser um número inteiro de 1 a 5' } });
        return;
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          quote: {
            include: { prescription: true }
          },
          review: true
        }
      });

      if (!order) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pedido não encontrado' } });
        return;
      }

      // Validação de posse do paciente
      if (order.quote.prescription.patientId !== req.user.id) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Acesso negado: você só pode avaliar seus próprios pedidos'
          }
        });
        return;
      }

      // Validação da máquina de estados: Apenas pedidos DELIVERED podem ser avaliados
      if (order.status !== OrderStatus.DELIVERED) {
        res.status(409).json({
          error: {
            code: 'ORDER_NOT_DELIVERED',
            message: 'Apenas pedidos concluídos e entregues (DELIVERED) podem ser avaliados'
          }
        });
        return;
      }

      // Unicidade: impede múltiplas avaliações para o mesmo pedido
      if (order.review) {
        res.status(409).json({
          error: {
            code: 'REVIEW_ALREADY_EXISTS',
            message: 'Este pedido já foi avaliado anteriormente'
          }
        });
        return;
      }

      const review = await prisma.review.create({
        data: {
          orderId,
          patientId: req.user.id,
          pharmacyId: order.quote.pharmacyId,
          rating: numericRating,
          comment: comment ? String(comment).trim() : null
        },
        include: {
          pharmacy: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true } }
        }
      });

      res.status(201).json(review);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json({
          error: {
            code: 'REVIEW_ALREADY_EXISTS',
            message: 'Este pedido já foi avaliado'
          }
        });
        return;
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao registrar avaliação' } });
    }
  }

  async getPharmacyReviews(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const reviews = await prisma.review.findMany({
        where: { pharmacyId: id as string },
        include: {
          patient: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Sanitiza nome do paciente (ex.: "Carlos S.") para privacidade
      const formatted = reviews.map((r) => {
        const parts = r.patient.name.trim().split(' ');
        const displayName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
        return {
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          patientName: displayName
        };
      });

      res.json(formatted);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar avaliações da farmácia' } });
    }
  }
}
