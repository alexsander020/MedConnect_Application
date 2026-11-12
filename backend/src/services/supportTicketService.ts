import crypto from 'crypto';
import { Prisma, Role, SupportTicket, SupportTicketCategory, SupportTicketStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Chamados de suporte (atendimento ao paciente, farmácia ou visitante).
 * A mensagem é texto livre e pode conter dados de saúde: a listagem do admin só expõe
 * uma prévia, e a leitura completa é auditada no controller (ADMIN_VIEW_SUPPORT_TICKET).
 */

// Base32 sem caracteres ambíguos (sem 0/O e 1/I).
export const PROTOCOL_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const PROTOCOL_TIMEZONE = 'America/Sao_Paulo';
export const PREVIEW_LENGTH = 140;
const MAX_PROTOCOL_ATTEMPTS = 5;

/**
 * Data local (fuso da operação) no formato AAAAMMDD.
 */
function protocolDate(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PROTOCOL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}${get('month')}${get('day')}`;
}

/**
 * Gera protocolo legível "MC-AAAAMMDD-XXXXX" (XXXXX aleatório criptograficamente seguro).
 */
export function generateProtocol(now: Date = new Date()): string {
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += PROTOCOL_ALPHABET[crypto.randomInt(PROTOCOL_ALPHABET.length)];
  }
  return `MC-${protocolDate(now)}-${suffix}`;
}

export interface CreateSupportTicketInput {
  requesterType: Role | null;
  userId?: string | null;
  pharmacyId?: string | null;
  name: string;
  email: string;
  category?: SupportTicketCategory;
  subject: string;
  message: string;
}

export class SupportTicketService {
  /**
   * Cria o chamado; em caso (raríssimo) de colisão de protocolo, gera outro.
   */
  static async create(input: CreateSupportTicketInput): Promise<SupportTicket> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await prisma.supportTicket.create({
          data: {
            protocol: generateProtocol(),
            requesterType: input.requesterType,
            userId: input.userId ?? null,
            pharmacyId: input.pharmacyId ?? null,
            name: input.name,
            email: input.email,
            category: input.category ?? SupportTicketCategory.GENERAL,
            subject: input.subject,
            message: input.message
          }
        });
      } catch (error) {
        const isProtocolCollision =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          String(error.meta?.target ?? '').includes('protocol');
        if (!isProtocolCollision || attempt >= MAX_PROTOCOL_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  static toPreview(message: string): string {
    return message.length > PREVIEW_LENGTH ? `${message.slice(0, PREVIEW_LENGTH - 1)}…` : message;
  }

  /** Formato exibido ao próprio solicitante (GET /support/tickets/my). */
  static toRequesterView(ticket: SupportTicket) {
    return {
      id: ticket.id,
      protocol: ticket.protocol,
      category: ticket.category,
      subject: ticket.subject,
      status: ticket.status,
      resolution: ticket.resolution,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt
    };
  }

  /** Item da listagem administrativa: sem a mensagem completa (apenas prévia). */
  static toAdminListItem(ticket: SupportTicket) {
    return {
      id: ticket.id,
      protocol: ticket.protocol,
      requesterType: ticket.requesterType,
      name: ticket.name,
      email: ticket.email,
      category: ticket.category,
      subject: ticket.subject,
      preview: SupportTicketService.toPreview(ticket.message),
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt
    };
  }

  /** Detalhe administrativo completo. */
  static toAdminDetail(ticket: SupportTicket) {
    return {
      ...SupportTicketService.toAdminListItem(ticket),
      userId: ticket.userId,
      pharmacyId: ticket.pharmacyId,
      message: ticket.message,
      resolution: ticket.resolution,
      handledById: ticket.handledById
    };
  }

  static isFinalStatus(status: SupportTicketStatus): boolean {
    return status === SupportTicketStatus.RESOLVED || status === SupportTicketStatus.CLOSED;
  }

  static statusLabel(status: SupportTicketStatus): string {
    const labels: Record<SupportTicketStatus, string> = {
      OPEN: 'Aberto',
      IN_PROGRESS: 'Em andamento',
      RESOLVED: 'Resolvido',
      CLOSED: 'Encerrado'
    };
    return labels[status];
  }
}
