import { Router } from 'express';
import { z } from 'zod';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';

const router = Router();
const orderController = new OrderController();

const createOrderSchema = {
  body: z.object({
    quoteId: z.string().min(1, 'ID da cotação é obrigatório')
  })
};

const updateOrderStatusSchema = {
  params: z.object({
    id: z.string().min(1, 'ID do pedido é obrigatório')
  }),
  body: z.object({
    status: z.enum(['PRODUCTION', 'DELIVERY', 'DELIVERED', 'CANCELLED'], {
      error: 'Status deve ser PRODUCTION, DELIVERY, DELIVERED ou CANCELLED'
    })
  })
};

const getOrderByIdSchema = {
  params: z.object({
    id: z.string().min(1, 'ID do pedido é obrigatório')
  })
};

// Apenas pacientes podem aprovar uma cotação e criar um pedido
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['PATIENT']),
  validateRequest(createOrderSchema),
  orderController.create
);

// Obter pedidos do usuário logado (paciente ou farmácia)
router.get('/my', authMiddleware, orderController.getMyOrders);

// Obter detalhes de um pedido específico (proteção IDOR: dono ou farmácia aceita)
router.get('/:id', authMiddleware, validateRequest(getOrderByIdSchema), orderController.getById);

// Farmácias atualizam o status do pedido
router.patch(
  '/:id/status',
  authMiddleware,
  roleMiddleware(['PHARMACY']),
  validateRequest(updateOrderStatusSchema),
  orderController.updateStatus
);

export default router;
