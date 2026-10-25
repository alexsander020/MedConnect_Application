import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { PharmacyVerificationStatus } from '@prisma/client';
import { createAndSendNotification } from '../services/notificationService';
import { AuditLogService } from '../services/auditLogService';

export class AdminController {
  async getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Apenas administradores podem consultar a trilha de auditoria' } });
        return;
      }

      const { actorId, action, resource, resourceId, startDate, endDate, page, limit } = req.query;

      const result = await AuditLogService.listLogs({
        actorId: actorId as string,
        action: action as string,
        resource: resource as string,
        resourceId: resourceId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao consultar trilha de auditoria' } });
    }
  }

  async getPendingPharmacies(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Apenas administradores podem acessar esta área' } });
        return;
      }

      const pending = await prisma.pharmacy.findMany({
        where: {
          verificationStatus: PharmacyVerificationStatus.PENDING_VERIFICATION
        },
        select: {
          id: true,
          name: true,
          email: true,
          cnpj: true,
          phone: true,
          address: true,
          deliveryArea: true,
          verificationStatus: true,
          sanitaryLicense: true,
          operatingAuth: true,
          technicalResponsibleName: true,
          technicalResponsibleCrf: true,
          technicalResponsibleUf: true,
          documentUrl: true,
          cnpjData: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      });

      res.json(pending);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar farmácias pendentes' } });
    }
  }

  async verifyPharmacy(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Apenas administradores podem verificar farmácias' } });
        return;
      }

      const { id } = req.params;
      const { approved, rejectionReason } = req.body;

      if (approved === undefined) {
        res.status(400).json({ error: { code: 'MISSING_FIELD', message: 'Campo "approved" (booleano) é obrigatório' } });
        return;
      }

      const pharmacy = await prisma.pharmacy.findUnique({ where: { id: id as string } });
      if (!pharmacy) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Farmácia não encontrada' } });
        return;
      }

      const newStatus = approved
        ? PharmacyVerificationStatus.VERIFIED
        : PharmacyVerificationStatus.REJECTED;

      const updated = await prisma.pharmacy.update({
        where: { id: id as string },
        data: {
          verificationStatus: newStatus,
          verified: approved,
          verifiedById: req.user.id,
          verifiedAt: new Date(),
          rejectionReason: approved ? null : (rejectionReason || 'Documentação em desacordo com as exigências regulatórias.')
        },
        select: {
          id: true,
          name: true,
          email: true,
          cnpj: true,
          verificationStatus: true,
          verified: true,
          verifiedById: true,
          verifiedAt: true,
          rejectionReason: true
        }
      });

      // Dispara notificação à farmácia
      try {
        await createAndSendNotification({
          pharmacyId: id as string,
          type: 'PHARMACY_VERIFIED',
          title: approved ? 'Parabéns! Sua farmácia foi aprovada' : 'Aviso sobre seu credenciamento',
          message: approved
            ? 'Sua documentação foi aprovada pelo comitê regulatório. Agora você já pode responder a cotações!'
            : `Sua solicitação de verificação foi recusada: ${updated.rejectionReason}`
        });
      } catch (e) {
        // Ignora erro de notificação
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao processar verificação da farmácia' } });
    }
  }
}
