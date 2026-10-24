import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

/**
 * Serviço de Trilha de Auditoria Imutável (LGPD Art. 11, Art. 46 / Compliance).
 * Tabela append-only: NUNCA permite alteração (UPDATE) ou exclusão (DELETE).
 */

export interface CreateAuditLogParams {
  actorId: string;
  actorType: Role;
  actorEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  reason: string;
  details?: Record<string, any> | string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ListAuditLogsQuery {
  actorId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  page?: number;
  limit?: number;
}

export class AuditLogService {
  /**
   * Registra um evento de auditoria de forma estritamente somente-inserção.
   */
  static async log(params: CreateAuditLogParams): Promise<void> {
    try {
      const detailsString = typeof params.details === 'object' && params.details !== null
        ? JSON.stringify(params.details)
        : params.details;

      await prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          actorType: params.actorType,
          actorEmail: params.actorEmail,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          reason: params.reason,
          details: detailsString,
          ipAddress: params.ipAddress || '127.0.0.1',
          userAgent: params.userAgent || 'unknown',
        }
      });
    } catch (err: any) {
      logger.error({ err, action: params.action }, 'Falha ao gravar registro de trilha de auditoria');
    }
  }

  /**
   * Consulta a trilha de auditoria (exclusiva para perfil ADMIN).
   */
  static async listLogs(query: ListAuditLogsQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.actorId) {
      where.actorId = query.actorId;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.resource) {
      where.resource = query.resource;
    }
    if (query.resourceId) {
      where.resourceId = query.resourceId;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      logs
    };
  }
}
