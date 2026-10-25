import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AuditLogService } from './auditLogService';
import { Role } from '@prisma/client';

/**
 * Serviço de Retenção e Expurgo de Dados (LGPD Art. 15 e Art. 16).
 * Por padrão, esta rotina é DESATIVADA (RETENTION_PURGE_ENABLED=false).
 * Prazos de retenção dependem obrigatoriamente de validação jurídica e sanitária.
 */

export interface RetentionReport {
  timestamp: string;
  expiredRefreshTokensPurged: number;
  expiredPasswordResetTokensPurged: number;
  expiredVerificationTokensPurged: number;
  cancelledPrescriptionsPurged: number;
}

export class DataRetentionService {
  /**
   * Verifica se a rotina automática de retenção está ativada no ambiente.
   */
  static isEnabled(): boolean {
    return process.env.RETENTION_PURGE_ENABLED === 'true';
  }

  /**
   * Expurga tokens de autenticação expirados (Refresh, PasswordReset, EmailVerification).
   */
  static async purgeExpiredTokens(): Promise<{
    refresh: number;
    passwordReset: number;
    emailVerification: number;
  }> {
    const now = new Date();

    const [refreshRes, passwordResetRes, emailVerificationRes] = await Promise.all([
      prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { isRevoked: true }
          ]
        }
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { used: true }
          ]
        }
      }),
      prisma.emailVerificationToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { used: true }
          ]
        }
      })
    ]);

    return {
      refresh: refreshRes.count,
      passwordReset: passwordResetRes.count,
      emailVerification: emailVerificationRes.count
    };
  }

  /**
   * Expurga receitas canceladas ou abandonadas sem qualquer pedido associado,
   * criadas há mais de N dias (padrão 30 dias [sugestão técnica a validar]).
   */
  static async purgeCancelledPrescriptions(daysOld: number = 30): Promise<number> {
    const threshold = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    // Encontra receitas CANCELLED ou PENDING sem pedidos concluídos
    const eligible = await prisma.prescription.findMany({
      where: {
        status: 'CANCELLED',
        createdAt: { lt: threshold },
        quotes: {
          none: {
            order: { isNot: null }
          }
        }
      },
      select: { id: true }
    });

    if (eligible.length === 0) {
      return 0;
    }

    const ids = eligible.map((p) => p.id);
    const deleteResult = await prisma.prescription.deleteMany({
      where: { id: { in: ids } }
    });

    return deleteResult.count;
  }

  /**
   * Executa um ciclo completo da rotina de retenção e expurgo.
   * Se a variável RETENTION_PURGE_ENABLED não for "true", a execução é ignorada.
   */
  static async runScheduledPurge(): Promise<{
    executed: boolean;
    reason?: string;
    report?: RetentionReport;
  }> {
    if (!this.isEnabled()) {
      logger.info('Rotina agendada de retenção/expurgo ignorada: desativada por padrão (RETENTION_PURGE_ENABLED != true).');
      return {
        executed: false,
        reason: 'Rotina de expurgo desativada por padrão. Configure RETENTION_PURGE_ENABLED=true para habilitar.'
      };
    }

    logger.info('Iniciando ciclo de retenção e expurgo de dados...');

    const tokenCounts = await this.purgeExpiredTokens();
    const prescriptionsPurged = await this.purgeCancelledPrescriptions(30);

    const report: RetentionReport = {
      timestamp: new Date().toISOString(),
      expiredRefreshTokensPurged: tokenCounts.refresh,
      expiredPasswordResetTokensPurged: tokenCounts.passwordReset,
      expiredVerificationTokensPurged: tokenCounts.emailVerification,
      cancelledPrescriptionsPurged: prescriptionsPurged
    };

    // Registra auditoria da rotina de expurgo
    await AuditLogService.log({
      actorId: 'SYSTEM_SCHEDULER',
      actorType: Role.ADMIN,
      action: 'DATA_RETENTION_PURGE_CYCLE',
      resource: 'System',
      reason: 'SCHEDULED_DATA_PURGE_CYCLE',
      details: report
    });

    logger.info('Ciclo de retenção e expurgo de dados concluído com sucesso.');

    return {
      executed: true,
      report
    };
  }
}
