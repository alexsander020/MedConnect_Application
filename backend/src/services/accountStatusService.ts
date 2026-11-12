import { AccountStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuditLogService } from './auditLogService';
import { createAndSendNotification } from './notificationService';

/**
 * Suspensão e reativação de contas (pacientes/admins e farmácias) pelo ADMIN.
 *
 * Regras:
 * - Suspender exige motivo (validado na rota), grava suspendedAt/suspensionReason e
 *   revoga TODOS os refresh tokens do titular: a sessão morre na próxima renovação.
 *   O access token JWT já emitido continua válido até expirar (≤ 15 min) — ver ADR 023.
 * - Reativar limpa suspendedAt/suspensionReason (o histórico fica no AuditLog).
 * - O banco garante status = SUSPENDED ⇔ suspendedAt IS NOT NULL (CHECK).
 */

export class AccountStatusError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'AccountStatusError';
  }
}

export interface StatusChangeActor {
  id: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface StatusChangeInput {
  targetId: string;
  status: AccountStatus;
  reason?: string;
  actor: StatusChangeActor;
}

function statusData(status: AccountStatus, reason?: string) {
  return status === AccountStatus.SUSPENDED
    ? { status, suspendedAt: new Date(), suspensionReason: reason ?? null }
    : { status, suspendedAt: null, suspensionReason: null };
}

export class AccountStatusService {
  static async changeUserStatus(input: StatusChangeInput): Promise<void> {
    const target = await prisma.user.findUnique({ where: { id: input.targetId }, select: { id: true, role: true } });
    if (!target) {
      throw new AccountStatusError(404, 'NOT_FOUND', 'Usuário não encontrado');
    }

    if (input.status === AccountStatus.SUSPENDED) {
      if (target.id === input.actor.id) {
        throw new AccountStatusError(400, 'CANNOT_SUSPEND_SELF', 'Você não pode suspender a sua própria conta.');
      }
      if (target.role === Role.ADMIN) {
        throw new AccountStatusError(403, 'CANNOT_SUSPEND_ADMIN', 'Não é permitido suspender outro administrador.');
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: target.id }, data: statusData(input.status, input.reason) });
      if (input.status === AccountStatus.SUSPENDED) {
        await tx.refreshToken.updateMany({ where: { userId: target.id, isRevoked: false }, data: { isRevoked: true } });
      }
    });

    const suspended = input.status === AccountStatus.SUSPENDED;
    await AuditLogService.log({
      actorId: input.actor.id,
      actorType: Role.ADMIN,
      actorEmail: input.actor.email,
      action: suspended ? 'ADMIN_SUSPEND_USER' : 'ADMIN_REACTIVATE_USER',
      resource: 'User',
      resourceId: target.id,
      reason: input.reason || (suspended ? 'ADMIN_ACCOUNT_SUSPENSION' : 'ADMIN_ACCOUNT_REACTIVATION'),
      details: { newStatus: input.status, targetRole: target.role },
      ipAddress: input.actor.ipAddress,
      userAgent: input.actor.userAgent
    });
  }

  static async changePharmacyStatus(input: StatusChangeInput): Promise<void> {
    const target = await prisma.pharmacy.findUnique({ where: { id: input.targetId }, select: { id: true } });
    if (!target) {
      throw new AccountStatusError(404, 'NOT_FOUND', 'Farmácia não encontrada');
    }

    await prisma.$transaction(async (tx) => {
      await tx.pharmacy.update({ where: { id: target.id }, data: statusData(input.status, input.reason) });
      if (input.status === AccountStatus.SUSPENDED) {
        await tx.refreshToken.updateMany({ where: { pharmacyId: target.id, isRevoked: false }, data: { isRevoked: true } });
      }
    });

    const suspended = input.status === AccountStatus.SUSPENDED;
    await AuditLogService.log({
      actorId: input.actor.id,
      actorType: Role.ADMIN,
      actorEmail: input.actor.email,
      action: suspended ? 'ADMIN_SUSPEND_PHARMACY' : 'ADMIN_REACTIVATE_PHARMACY',
      resource: 'Pharmacy',
      resourceId: target.id,
      reason: input.reason || (suspended ? 'ADMIN_ACCOUNT_SUSPENSION' : 'ADMIN_ACCOUNT_REACTIVATION'),
      details: { newStatus: input.status },
      ipAddress: input.actor.ipAddress,
      userAgent: input.actor.userAgent
    });

    await createAndSendNotification({
      pharmacyId: target.id,
      type: 'ACCOUNT_STATUS_UPDATE',
      title: suspended ? 'Sua conta foi suspensa' : 'Sua conta foi reativada',
      message: suspended
        ? `O acesso da sua farmácia à MedConnect foi suspenso. Motivo: ${input.reason}. Fale com o suporte para mais informações.`
        : 'O acesso da sua farmácia à MedConnect foi reativado. Você já pode entrar novamente.'
    });
  }
}
