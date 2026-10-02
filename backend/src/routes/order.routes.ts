import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const orderController = new OrderController();

// Apenas pacientes podem aprovar uma cotação e criar um pedido
router.post('/', authMiddleware, roleMiddleware(['PATIENT']), orderController.create);

// Obter pedidos do usuário logado (paciente ou farmácia)
router.get('/my', authMiddleware, orderController.getMyOrders);

// Farmácias atualizam o status do pedido
router.patch('/:id/status', authMiddleware, roleMiddleware(['PHARMACY']), orderController.updateStatus);

export default router;
