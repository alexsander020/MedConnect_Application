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

  async getPilotMetrics(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito a administradores' } });
        return;
      }

      const [
        totalPrescriptions,
        prescriptionsWithQuotes,
        totalQuotes,
        acceptedQuotesCount,
        verifiedPharmaciesCount,
        totalOrders,
        deliveredOrders,
        cancelledPrescriptionsWithQuotes
      ] = await Promise.all([
        prisma.prescription.count(),
        prisma.prescription.findMany({
          where: { quotes: { some: {} } },
          select: {
            id: true,
            createdAt: true,
            status: true,
            quotes: {
              select: {
                id: true,
                createdAt: true,
                status: true,
                priceCents: true,
                deliveryDays: true,
                pharmacyId: true
              },
              orderBy: { createdAt: 'asc' }
            }
          }
        }),
        prisma.quote.count(),
        prisma.quote.count({ where: { status: 'ACCEPTED' } }),
        prisma.pharmacy.count({ where: { verified: true } }),
        prisma.order.count(),
        prisma.order.count({ where: { status: 'DELIVERED' } }),
        prisma.prescription.count({
          where: {
            status: 'CANCELLED',
            quotes: { some: {} }
          }
        })
      ]);

      // Calcula TTFQ (Time to First Quote) médio em minutos
      let totalTtfqMinutes = 0;
      let prescriptionsWithValidTtfq = 0;

      const anonymizedEvents: Array<{
        event: string;
        anonymousId: string;
        timeToQuoteMinutes?: number;
        priceCents?: number;
        timestamp: string;
      }> = [];

      for (const p of prescriptionsWithQuotes) {
        if (p.quotes.length > 0) {
          const firstQuote = p.quotes[0];
          const diffMs = new Date(firstQuote.createdAt).getTime() - new Date(p.createdAt).getTime();
          const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
          totalTtfqMinutes += diffMinutes;
          prescriptionsWithValidTtfq++;

          // Gera amostra de eventos anonimizados para telemetria sem PII
          if (anonymizedEvents.length < 10) {
            anonymizedEvents.push({
              event: 'quote_submitted',
              anonymousId: `anon_rx_${p.id.substring(0, 6)}`,
              timeToQuoteMinutes: diffMinutes,
              priceCents: firstQuote.priceCents,
              timestamp: firstQuote.createdAt.toISOString()
            });
          }
        }
      }

      const avgTtfqMinutes = prescriptionsWithValidTtfq > 0
        ? Math.round(totalTtfqMinutes / prescriptionsWithValidTtfq)
        : 0;

      const quotedPrescriptionsCount = prescriptionsWithQuotes.length;
      const quotesPerPrescription = totalPrescriptions > 0
        ? Number((totalQuotes / totalPrescriptions).toFixed(1))
        : 0;

      const acceptanceRate = quotedPrescriptionsCount > 0
        ? Number(((acceptedQuotesCount / quotedPrescriptionsCount) * 100).toFixed(1))
        : 0;

      // Estimativa de vazamento (prescrições com cotação que cancelaram ou expiraram sem fechar)
      const leakageEstimate = quotedPrescriptionsCount > 0
        ? Number(((cancelledPrescriptionsWithQuotes / quotedPrescriptionsCount) * 100).toFixed(1))
        : 0;

      res.json({
        metrics: {
          totalPrescriptions,
          quotedPrescriptions: quotedPrescriptionsCount,
          totalQuotes,
          quotesPerPrescription,
          acceptedQuotes: acceptedQuotesCount,
          acceptanceRate,
          avgTtfqMinutes,
          activePharmacies: verifiedPharmaciesCount,
          totalOrders,
          deliveredOrders,
          leakageEstimatePercent: leakageEstimate
        },
        targets: {
          ttfqMinutesMax: 120,
          quotesPerPrescriptionMin: 2.2,
          acceptanceRateMin: 30.0,
          leakageMax: 15.0
        },
        anonymizedEvents
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao calcular métricas do piloto' } });
    }
  }
}
