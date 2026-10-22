import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const notificationController = new NotificationController();

router.use(authMiddleware);

// Listar notificações do usuário ou farmácia autenticado
router.get('/', notificationController.getMyNotifications);

// Marcar todas como lidas
router.patch('/read-all', notificationController.markAllAsRead);

// Marcar notificação individual como lida
router.patch('/:id/read', notificationController.markAsRead);

export default router;
