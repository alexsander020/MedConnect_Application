import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  CapabilityStatus,
  CapabilityType,
  PharmacyVerificationStatus,
  Role
} from '@prisma/client';
import { createAndSendNotification } from '../services/notificationService';
import { AuditLogService } from '../services/auditLogService';
import {
  generateSignedCapabilityEvidenceUrl,
  verifySignedCapabilityEvidenceUrl
} from '../services/prescriptionSecurity';
import { cnpjLookup } from '../services/cnpj';
import { formatPriceCentsToDecimal } from '../lib/money';

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

  /**
   * 3.2 Lista solicitações de capacidade regulatória filtrando por tipo e status.
   */
  async listCapabilities(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Apenas administradores podem listar solicitações de capacidade'
          }
        });
        return;
      }

      const { type, status } = req.query;
      const where: any = {};

      if (type && ['HUMAN_COMPOUNDING', 'VETERINARY_COMPOUNDING'].includes(String(type))) {
        where.type = String(type) as CapabilityType;
      }

      if (
        status &&
        ['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'SUSPENDED'].includes(String(status))
      ) {
        where.status = String(status) as CapabilityStatus;
      }

      const capabilities = await prisma.pharmacyCapability.findMany({
        where,
        include: {
          pharmacy: {
            select: {
              id: true,
              name: true,
              email: true,
              cnpj: true,
              phone: true,
              address: true,
              verificationStatus: true,
              verified: true,
              sanitaryLicense: true,
              operatingAuth: true,
              cnpjData: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formatted = capabilities.map((cap) => ({
        ...cap,
        evidenceCount: cap.evidenceFileKeys.length,
        regulatoryChecklistItems: [
          'Registro MAPA conferido',
          'CRMV da empresa conferido',
          'RT e CRF conferidos'
        ]
      }));

      res.json(formatted);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro ao listar capacidades regulatórias'
        }
      });
    }
  }

  /**
   * 3.2 Gera URL assinada de curta duração para abertura de documento de evidência por ADMIN,
   * gravando registro compulsório em AuditLog.
   */
  async getCapabilityEvidenceSignedUrl(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Apenas administradores podem acessar documentos de evidência regulatória'
          }
        });
        return;
      }

      const { id, index } = req.params;
      const idx = parseInt(String(index), 10);

      const capability = await prisma.pharmacyCapability.findUnique({
        where: { id: String(id) }
      });

      if (!capability) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Solicitação de capacidade não encontrada'
          }
        });
        return;
      }

      if (isNaN(idx) || idx < 0 || idx >= capability.evidenceFileKeys.length) {
        res.status(404).json({
          error: {
            code: 'EVIDENCE_NOT_FOUND',
            message: 'Documento de evidência não encontrado para o índice informado'
          }
        });
        return;
      }

      const evidenceKey = capability.evidenceFileKeys[idx];
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

      const signed = await generateSignedCapabilityEvidenceUrl(
        capability,
        idx,
        evidenceKey,
        { id: req.user.id, email: req.user.email, role: req.user.role },
        clientIp,
        req.headers['user-agent']
      );

      res.json(signed);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro ao gerar URL assinada para evidência'
        }
      });
    }
  }

  /**
   * Serve o arquivo privado de evidência regulatória mediante validação estrita de URL assinada e expiração.
   */
  async serveCapabilityEvidence(req: Request, res: Response): Promise<void> {
    try {
      const { id, index } = req.params;
      const { token, expires } = req.query;

      if (!token || !expires) {
        res.status(400).json({
          error: {
            code: 'INVALID_SIGNED_URL',
            message: 'Parâmetros de assinatura (token e expires) são obrigatórios'
          }
        });
        return;
      }

      const idx = parseInt(String(index), 10);
      const expiresNum = parseInt(String(expires), 10);

      if (
        isNaN(idx) ||
        isNaN(expiresNum) ||
        !verifySignedCapabilityEvidenceUrl(String(id), idx, String(token), expiresNum)
      ) {
        res.status(403).json({
          error: {
            code: 'EXPIRED_OR_INVALID_SIGNATURE',
            message: 'URL assinada inválida ou expirada'
          }
        });
        return;
      }

      const capability = await prisma.pharmacyCapability.findUnique({
        where: { id: String(id) }
      });

      if (!capability || idx < 0 || idx >= capability.evidenceFileKeys.length) {
        res.status(404).json({
          error: {
            code: 'EVIDENCE_NOT_FOUND',
            message: 'Evidência não encontrada'
          }
        });
        return;
      }

      const evidenceKey = capability.evidenceFileKeys[idx];

      await AuditLogService.log({
        actorId: capability.verifiedByAdminId || 'ADMIN_SIGNED_URL',
        actorType: Role.ADMIN,
        action: 'OPEN_CAPABILITY_EVIDENCE_FILE',
        resource: 'PharmacyCapability',
        resourceId: capability.id,
        reason: 'SIGNED_URL_EVIDENCE_DOWNLOAD',
        details: {
          pharmacyId: capability.pharmacyId,
          evidenceIndex: idx
        },
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent']
      });

      const filename = path.basename(evidenceKey.replace('local://', ''));
      const filePath = path.join(process.cwd(), 'uploads', filename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Arquivo de evidência não encontrado no armazenamento privado'
          }
        });
        return;
      }

      const ext = path.extname(filename).toLowerCase();
      const mimeType =
        ext === '.pdf'
          ? 'application/pdf'
          : ext === '.png'
            ? 'image/png'
            : 'image/jpeg';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      res.sendFile(filePath);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro ao servir documento de evidência'
        }
      });
    }
  }

  /**
   * 3.2 Aprovação de capacidade regulatória pelo ADMIN.
   * Registra quem fez, quando e o motivo em AuditLog e notifica a farmácia sem dados sensíveis.
   */
  async approveCapability(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Apenas administradores podem aprovar capacidades regulatórias'
          }
        });
        return;
      }

      const { id } = req.params;
      const { reason, checklist } = req.body || {};

      const capability = await prisma.pharmacyCapability.findUnique({
        where: { id: String(id) }
      });

      if (!capability) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Solicitação de capacidade não encontrada'
          }
        });
        return;
      }

      const now = new Date();
      const updated = await prisma.pharmacyCapability.update({
        where: { id: capability.id },
        data: {
          status: CapabilityStatus.VERIFIED,
          verifiedByAdminId: req.user.id,
          verifiedAt: now,
          rejectionReason: null
        }
      });

      const auditReason =
        typeof reason === 'string' && reason.trim()
          ? reason.trim()
          : 'Conferência documental concluída e aprovada pelo administrador';

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      await AuditLogService.log({
        actorId: req.user.id,
        actorType: Role.ADMIN,
        actorEmail: req.user.email,
        action: 'APPROVE_PHARMACY_CAPABILITY',
        resource: 'PharmacyCapability',
        resourceId: updated.id,
        reason: auditReason,
        details: {
          pharmacyId: updated.pharmacyId,
          capabilityType: updated.type,
          previousStatus: capability.status,
          newStatus: CapabilityStatus.VERIFIED,
          verifiedAt: now.toISOString(),
          checklist: checklist || {
            mapaChecked: true,
            crmvChecked: true,
            rtCrfChecked: true
          }
        },
        ipAddress: clientIp,
        userAgent: req.headers['user-agent']
      });

      try {
        await createAndSendNotification({
          pharmacyId: updated.pharmacyId,
          type: 'CAPABILITY_APPROVED',
          title: 'Capacidade Veterinária Aprovada',
          message:
            'Sua habilitação para manipulação veterinária foi conferida e aprovada. O mural de receitas veterinárias já está disponível.'
        });
      } catch (e) {
        // Ignora falha não crítica de notificação
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro ao aprovar capacidade da farmácia'
        }
      });
    }
  }

  /**
   * 3.2 Recusa de capacidade regulatória com motivo obrigatório pelo ADMIN.
   * Registra quem fez, quando e o motivo em AuditLog e notifica a farmácia.
   */
  async rejectCapability(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Apenas administradores podem recusar capacidades regulatórias'
          }
        });
        return;
      }

      const { id } = req.params;
      const rawReason = req.body?.reason ?? req.body?.rejectionReason;

      if (!rawReason || typeof rawReason !== 'string' || !rawReason.trim()) {
        res.status(400).json({
          error: {
            code: 'MISSING_REASON',
            message: 'O motivo da recusa é obrigatório'
          }
        });
        return;
      }

      const capability = await prisma.pharmacyCapability.findUnique({
        where: { id: String(id) }
      });

      if (!capability) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Solicitação de capacidade não encontrada'
          }
        });
        return;
      }

      const cleanReason = rawReason.trim();
      const now = new Date();

      const updated = await prisma.pharmacyCapability.update({
        where: { id: capability.id },
        data: {
          status: CapabilityStatus.REJECTED,
          verifiedByAdminId: req.user.id,
          verifiedAt: now,
          rejectionReason: cleanReason
        }
      });

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      await AuditLogService.log({
        actorId: req.user.id,
        actorType: Role.ADMIN,
        actorEmail: req.user.email,
        action: 'REJECT_PHARMACY_CAPABILITY',
        resource: 'PharmacyCapability',
        resourceId: updated.id,
        reason: cleanReason,
        details: {
          pharmacyId: updated.pharmacyId,
          capabilityType: updated.type,
          previousStatus: capability.status,
          newStatus: CapabilityStatus.REJECTED,
          verifiedAt: now.toISOString()
        },
        ipAddress: clientIp,
        userAgent: req.headers['user-agent']
      });

      try {
        await createAndSendNotification({
          pharmacyId: updated.pharmacyId,
          type: 'CAPABILITY_REJECTED',
          title: 'Solicitação de Capacidade Recusada',
          message: `Sua solicitação de habilitação veterinária não foi aprovada na conferência documental. Motivo: ${cleanReason}`
        });
      } catch (e) {
        // Ignora falha não crítica de notificação
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro ao recusar capacidade da farmácia'
        }
      });
    }
  }

  /**
   * 3.2 e 3.3 Suspensão de capacidade VERIFIED com motivo obrigatório pelo ADMIN.
   * Impede novas cotações e listagem veterinária, preservando cotações e pedidos existentes.
   */
  async suspendCapability(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Apenas administradores podem suspender capacidades regulatórias'
          }
        });
        return;
      }

      const { id } = req.params;
      const rawReason = req.body?.reason ?? req.body?.rejectionReason;

      if (!rawReason || typeof rawReason !== 'string' || !rawReason.trim()) {
        res.status(400).json({
          error: {
            code: 'MISSING_REASON',
            message: 'O motivo da suspensão é obrigatório'
          }
        });
        return;
      }

      const capability = await prisma.pharmacyCapability.findUnique({
        where: { id: String(id) }
      });

      if (!capability) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Capacidade não encontrada'
          }
        });
        return;
      }

      if (capability.status !== CapabilityStatus.VERIFIED) {
        res.status(409).json({
          error: {
            code: 'INVALID_CAPABILITY_STATE',
            message: 'Apenas capacidades com status VERIFIED podem ser suspensas'
          }
        });
        return;
      }

      const cleanReason = rawReason.trim();
      const now = new Date();

      const updated = await prisma.pharmacyCapability.update({
        where: { id: capability.id },
        data: {
          status: CapabilityStatus.SUSPENDED,
          verifiedByAdminId: req.user.id,
          verifiedAt: now,
          rejectionReason: cleanReason
        }
      });

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      await AuditLogService.log({
        actorId: req.user.id,
        actorType: Role.ADMIN,
        actorEmail: req.user.email,
        action: 'SUSPEND_PHARMACY_CAPABILITY',
        resource: 'PharmacyCapability',
        resourceId: updated.id,
        reason: cleanReason,
        details: {
          pharmacyId: updated.pharmacyId,
          capabilityType: updated.type,
          previousStatus: CapabilityStatus.VERIFIED,
          newStatus: CapabilityStatus.SUSPENDED,
          verifiedAt: now.toISOString()
        },
        ipAddress: clientIp,
        userAgent: req.headers['user-agent']
      });

      try {
        await createAndSendNotification({
          pharmacyId: updated.pharmacyId,
          type: 'CAPABILITY_SUSPENDED',
          title: 'Capacidade Veterinária Suspensa',
          message: `Sua habilitação veterinária foi suspensa pela administração. Novas cotações estão bloqueadas, mas os pedidos em andamento permanecem ativos. Motivo: ${cleanReason}`
        });
      } catch (e) {
        // Ignora falha não crítica de notificação
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro ao suspender capacidade da farmácia'
        }
      });
    }
  }

  /**
   * 3.4 Reutiliza a interface de consulta de situação cadastral de CNPJ da Fase 2.2
   * para apoiar a conferência pelo ADMIN.
   */
  async lookupPharmacyCnpj(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Apenas administradores podem realizar consulta cadastral de CNPJ'
          }
        });
        return;
      }

      const { id } = req.params;
      const pharmacy = await prisma.pharmacy.findUnique({ where: { id: String(id) } });
      if (!pharmacy) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Farmácia não encontrada' } });
        return;
      }

      const result = await cnpjLookup.lookup(pharmacy.cnpj);

      await prisma.pharmacy.update({
        where: { id: pharmacy.id },
        data: { cnpjData: JSON.stringify(result) }
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro ao consultar situação cadastral do CNPJ'
        }
      });
    }
  }

  /**
   * 3.3 Lista pedidos existentes para visibilidade do ADMIN (incluindo pedidos de farmácias
   * com capacidade posteriormente suspensa).
   */
  async listOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Apenas administradores podem listar todos os pedidos'
          }
        });
        return;
      }

      const orders = await prisma.order.findMany({
        include: {
          quote: {
            include: {
              pharmacy: { select: { id: true, name: true, cnpj: true } },
              prescription: {
                select: {
                  id: true,
                  kind: true,
                  status: true,
                  createdAt: true
                }
              }
            }
          },
          history: { orderBy: { createdAt: 'desc' } }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formatted = orders.map((o) => ({
        ...o,
        quote: {
          ...o.quote,
          price: formatPriceCentsToDecimal(o.quote.priceCents)
        }
      }));

      res.json(formatted);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro ao listar pedidos para administração'
        }
      });
    }
  }
}
