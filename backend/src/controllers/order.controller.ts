import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { Prisma, OrderStatus, PrescriptionStatus, QuoteStatus, Role } from '@prisma/client';
import {
  assertValidOrderTransition,
  assertPharmacyCanUpdateOrder,
  OrderTransitionError,
  OrderAuthorizationError
} from '../domain/orderStateMachine';
import { formatPriceCentsToDecimal } from '../lib/money';
import { createAndSendNotification } from '../services/notificationService';

export class OrderController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const { quoteId } = req.body;
      if (!quoteId) {
        res.status(400).json({ error: { code: 'MISSING_FIELD', message: 'quoteId é obrigatório' } });
        return;
      }

      // Execução atômica com isolamento Serializable para prevenir race conditions
      const order = await prisma.$transaction(
        async (tx) => {
          const quote = await tx.quote.findUnique({
            where: { id: quoteId },
            include: { prescription: true, order: true }
          });

          if (!quote) {
            throw { status: 404, code: 'QUOTE_NOT_FOUND', message: 'Cotação não encontrada' };
          }

          // (a) Validação IDOR: cotação pertence a uma receita do paciente autenticado
          if (quote.prescription.patientId !== req.user!.id) {
            throw {
              status: 403,
              code: 'FORBIDDEN',
              message: 'Acesso negado: esta cotação pertence a outro paciente'
            };
          }

          // (b) Valida que a receita não está ACCEPTED/CANCELLED
          if (
            quote.prescription.status === PrescriptionStatus.ACCEPTED ||
            quote.prescription.status === PrescriptionStatus.CANCELLED
          ) {
            throw {
              status: 409,
              code: 'PRESCRIPTION_ALREADY_FINALIZED',
              message: 'A receita vinculada já foi aceita ou cancelada'
            };
          }

          if (quote.order) {
            throw {
              status: 409,
              code: 'ORDER_ALREADY_EXISTS',
              message: 'Já existe um pedido criado para esta cotação'
            };
          }

          // (c) Cria o pedido com status inicial PRODUCTION
          const createdOrder = await tx.order.create({
            data: {
              quoteId,
              status: OrderStatus.PRODUCTION,
              history: {
                create: {
                  fromStatus: OrderStatus.PRODUCTION,
                  toStatus: OrderStatus.PRODUCTION,
                  changedByType: Role.PATIENT,
                  changedById: req.user!.id
                }
              }
            },
            include: {
              quote: {
                include: {
                  pharmacy: { select: { id: true, name: true, phone: true } },
                  prescription: true
                }
              },
              history: true
            }
          });

          // (d) Marca a cotação como ACCEPTED
          await tx.quote.update({
            where: { id: quoteId },
            data: { status: QuoteStatus.ACCEPTED }
          });

          // (e) Marca as demais cotações da receita como REJECTED
          await tx.quote.updateMany({
            where: {
              prescriptionId: quote.prescriptionId,
              id: { not: quoteId }
            },
            data: { status: QuoteStatus.REJECTED }
          });

          // (f) Marca a receita como ACCEPTED
          await tx.prescription.update({
            where: { id: quote.prescriptionId },
            data: { status: PrescriptionStatus.ACCEPTED }
          });

          return createdOrder;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        }
      );

      // Notifica a farmácia sobre a nova aprovação e criação do pedido
      try {
        await createAndSendNotification({
          pharmacyId: order.quote.pharmacyId,
          type: 'QUOTE_ACCEPTED',
          title: 'Cotação Aprovada!',
          message: `Sua cotação foi aprovada pelo paciente. Um novo pedido foi iniciado em Produção.`
        });
      } catch (e) {
        // Ignora erros não críticos de notificação
      }

      res.status(201).json({
        ...order,
        quote: {
          ...order.quote,
          price: formatPriceCentsToDecimal(order.quote.priceCents)
        }
      });
    } catch (error: any) {
      if (error?.code === 'P2002' || error?.code === 'P2034') {
        res.status(409).json({
          error: {
            code: 'ORDER_ALREADY_EXISTS',
            message: 'Conflito de concorrência: já existe um pedido gerado para esta cotação ou receita'
          }
        });
        return;
      }

      if (error?.status) {
        res.status(error.status).json({
          error: {
            code: error.code || 'BAD_REQUEST',
            message: error.message
          }
        });
        return;
      }

      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao aprovar cotação e gerar pedido' } });
    }
  }

  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ error: { code: 'MISSING_STATUS', message: 'Status é obrigatório' } });
        return;
      }

      const order = await prisma.order.findUnique({
        where: { id: id as string },
        include: { quote: { include: { prescription: true } } }
      });

      if (!order) {
        res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Pedido não encontrado' } });
        return;
      }

      // Autorização: somente a farmácia responsável pelo pedido pode alterar o status
      assertPharmacyCanUpdateOrder(req.user, order.quote.pharmacyId);

      // Validação da máquina de estados
      assertValidOrderTransition(order.status, status as OrderStatus);

      // Atualização com gravação atômica do histórico
      const [updatedOrder] = await prisma.$transaction([
        prisma.order.update({
          where: { id: id as string },
          data: { status: status as OrderStatus },
          include: {
            quote: true,
            history: { orderBy: { createdAt: 'desc' } }
          }
        }),
        prisma.orderStatusHistory.create({
          data: {
            orderId: id as string,
            fromStatus: order.status,
            toStatus: status as OrderStatus,
            changedByType: Role.PHARMACY,
            changedById: req.user.id
          }
        })
      ]);

      // Notifica o paciente sobre o avanço no status do pedido
      try {
        await createAndSendNotification({
          userId: order.quote.prescription.patientId,
          type: 'ORDER_STATUS_UPDATE',
          title: 'Status do Pedido Atualizado',
          message: `O status do seu pedido foi alterado para: ${status}.`
        });
      } catch (e) {
        // Ignora erros não críticos de notificação
      }

      res.json({
        ...updatedOrder,
        quote: {
          ...updatedOrder.quote,
          price: formatPriceCentsToDecimal(updatedOrder.quote.priceCents)
        }
      });
    } catch (error: any) {
      if (error instanceof OrderTransitionError) {
        res.status(error.statusCode).json({
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      if (error instanceof OrderAuthorizationError) {
        res.status(error.statusCode).json({
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar status do pedido' } });
    }
  }

  async getMyOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
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
                  include: {
                    patient: { select: { id: true, name: true, phone: true, address: true } }
                  }
                }
              }
            },
            history: { orderBy: { createdAt: 'desc' } }
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
            },
            history: { orderBy: { createdAt: 'desc' } }
          },
          orderBy: { createdAt: 'desc' }
        });
      }

      const formatted = orders.map((o) => ({
        ...o,
        quote: {
          ...o.quote,
          price: formatPriceCentsToDecimal(o.quote.priceCents)
        }
      }));

      res.json(formatted);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar pedidos' } });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const { id } = req.params;

      const order = await prisma.order.findUnique({
        where: { id: id as string },
        include: {
          quote: {
            include: {
              prescription: {
                include: {
                  patient: {
                    select: { id: true, name: true, phone: true, address: true }
                  }
                }
              },
              pharmacy: {
                select: { id: true, name: true, phone: true, address: true }
              }
            }
          },
          history: { orderBy: { createdAt: 'asc' } }
        }
      });

      if (!order) {
        res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Pedido não encontrado' } });
        return;
      }

      // IDOR protection: apenas o paciente dono da receita ou a farmácia da cotação aceita
      const isPatientOwner = order.quote.prescription.patientId === req.user.id;
      const isAcceptedPharmacy = order.quote.pharmacyId === req.user.id;

      if (!isPatientOwner && !isAcceptedPharmacy && req.user.role !== 'ADMIN') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Acesso negado: você não tem permissão para visualizar este pedido'
          }
        });
        return;
      }

      res.json({
        ...order,
        quote: {
          ...order.quote,
          price: formatPriceCentsToDecimal(order.quote.priceCents)
        }
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar pedido' } });
    }
  }
}
