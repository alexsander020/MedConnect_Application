import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export class NotificationController {
  async getMyNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const isPharmacy = req.user.role === 'PHARMACY';
      const notifications = await prisma.notification.findMany({
        where: isPharmacy ? { pharmacyId: req.user.id } : { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar notificações' } });
    }
  }

  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const { id } = req.params;
      const notification = await prisma.notification.findUnique({
        where: { id: id as string }
      });

      if (!notification) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notificação não encontrada' } });
        return;
      }

      // Validação de posse
      const isOwner =
        notification.userId === req.user.id || notification.pharmacyId === req.user.id;

      if (!isOwner) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Acesso negado' } });
        return;
      }

      const updated = await prisma.notification.update({
        where: { id: id as string },
        data: { read: true }
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar notificação' } });
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const isPharmacy = req.user.role === 'PHARMACY';
      const result = await prisma.notification.updateMany({
        where: isPharmacy
          ? { pharmacyId: req.user.id, read: false }
          : { userId: req.user.id, read: false },
        data: { read: true }
      });

      res.json({ message: 'Todas as notificações foram marcadas como lidas', updatedCount: result.count });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao marcar notificações como lidas' } });
    }
  }
}
