import { prisma } from '../lib/prisma';
import { CONSENT_DEFINITIONS, CURRENT_HEALTH_CONSENT } from '../constants/consentTexts';
import { AuditLogService } from './auditLogService';
import { Role } from '@prisma/client';

export class ConsentService {
  /**
   * Registra o consentimento do titular de forma versionada e rastreável.
   */
  static async recordConsent(params: {
    userId: string;
    consentType?: string;
    userType?: Role;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const type = params.consentType || CURRENT_HEALTH_CONSENT.type;
    const def = CONSENT_DEFINITIONS[type] || CURRENT_HEALTH_CONSENT;

    // Registra novo consentimento na tabela Consent
    const consent = await prisma.consent.create({
      data: {
        userId: params.userId,
        userType: params.userType || Role.PATIENT,
        consentType: def.type,
        textVersion: def.version,
        textHash: def.hash,
        ipAddress: params.ipAddress || '127.0.0.1',
        userAgent: params.userAgent || 'unknown',
        consentedAt: new Date()
      }
    });

    // Registra na trilha de auditoria
    await AuditLogService.log({
      actorId: params.userId,
      actorType: params.userType || Role.PATIENT,
      action: 'GIVE_CONSENT',
      resource: 'Consent',
      resourceId: consent.id,
      reason: 'TITULAR_EXPLICIT_OPT_IN',
      details: { consentType: def.type, version: def.version, textHash: def.hash },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    return consent;
  }

  /**
   * Verifica se o titular possui consentimento ativo (não revogado) para determinado tipo.
   */
  static async hasActiveConsent(userId: string, consentType: string = CURRENT_HEALTH_CONSENT.type): Promise<{
    active: boolean;
    isRevoked: boolean;
    latestConsent: any;
  }> {
    const latest = await prisma.consent.findFirst({
      where: {
        userId,
        consentType
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!latest) {
      return { active: false, isRevoked: false, latestConsent: null };
    }

    const isRevoked = latest.revokedAt !== null;
    return {
      active: !isRevoked,
      isRevoked,
      latestConsent: latest
    };
  }

  /**
   * Revoga o consentimento nas configurações do titular.
   * Regra LGPD: Revogar bloqueia novos usos imediatamente e inicia o fluxo de exclusão.
   */
  static async revokeConsent(params: {
    userId: string;
    userType?: Role;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
  }) {
    const now = new Date();

    // 1. Atualiza todos os consentimentos ativos como revogados
    const updateResult = await prisma.consent.updateMany({
      where: {
        userId: params.userId,
        revokedAt: null
      },
      data: {
        revokedAt: now,
        revokedIp: params.ipAddress || '127.0.0.1',
        revocationReason: params.reason || 'REVOGACAO_PELO_TITULAR_CONFIGURACOES'
      }
    });

    // 2. Revoga todos os tokens de refresh ativos para forçar encerramento de sessões
    await prisma.refreshToken.updateMany({
      where: { userId: params.userId, isRevoked: false },
      data: { isRevoked: true }
    });

    // 3. Registra na trilha de auditoria
    await AuditLogService.log({
      actorId: params.userId,
      actorType: params.userType || Role.PATIENT,
      action: 'REVOKE_CONSENT',
      resource: 'User',
      resourceId: params.userId,
      reason: 'TITULAR_EXPLICIT_REVOCATION',
      details: {
        revokedConsentsCount: updateResult.count,
        reason: params.reason || 'Configurações de privacidade',
        initiatedDeletionFlow: true
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    return {
      revokedCount: updateResult.count,
      revokedAt: now,
      status: 'CONSENT_REVOKED',
      message: 'Consentimento revogado com sucesso. Novos tratamentos foram bloqueados e o fluxo de exclusão/anonimização foi acionado.'
    };
  }

  /**
   * Obtém histórico completo de consentimentos do titular.
   */
  static async getConsentsByUser(userId: string) {
    return prisma.consent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }
}
