import { Response } from 'express';
import {
  AccountStatus,
  OrderStatus,
  Prisma,
  PrescriptionStatus,
  QuoteStatus,
  Role,
  SupportTicketStatus
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { decryptFieldSafe, maskCpf } from '../lib/fieldEncryption';
import { formatPriceCentsToDecimal } from '../lib/money';
import { buildPage, getPagination, normalizeSearch } from '../lib/pagination';
import { getClientIp, getUserAgent } from '../lib/requestContext';
import { AuditLogService } from '../services/auditLogService';
import { AccountStatusError, AccountStatusService } from '../services/accountStatusService';
import { AdminOverviewService } from '../services/adminOverviewService';
import { createAndSendNotification } from '../services/notificationService';
import {
  PHARMACY_PROFILE_SELECT,
  buildPharmacyProfile,
  getPharmacyRatings,
  ratingOf
} from '../services/pharmacyProfileService';
import { SupportTicketService } from '../services/supportTicketService';

/**
 * Gestão administrativa (Fase 6): visão geral, contas, farmácias, pedidos, receitas e suporte.
 * Todas as rotas exigem ADMIN (aplicado no router). Leituras de dados pessoais detalhados
 * (usuário, farmácia, chamado de suporte) são registradas no AuditLog.
 */

const USER_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  emailVerified: true,
  isAnonymized: true,
  cpfLastDigits: true,
  createdAt: true,
  lastLoginAt: true,
  suspendedAt: true,
  _count: { select: { prescriptions: true, reviews: true } }
} satisfies Prisma.UserSelect;

type UserListRow = Prisma.UserGetPayload<{ select: typeof USER_LIST_SELECT }>;

function toUserListItem(user: UserListRow) {
  const { cpfLastDigits, _count, ...rest } = user;
  return {
    ...rest,
    cpf: cpfLastDigits ? maskCpf(cpfLastDigits) : null,
    counts: { prescriptions: _count.prescriptions, reviews: _count.reviews }
  };
}

const PHARMACY_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  cnpj: true,
  city: true,
  state: true,
  verificationStatus: true,
  verified: true,
  status: true,
  createdAt: true,
  verifiedAt: true,
  suspendedAt: true,
  _count: { select: { quotes: true } }
} satisfies Prisma.PharmacySelect;

type PharmacyListRow = Prisma.PharmacyGetPayload<{ select: typeof PHARMACY_LIST_SELECT }>;

async function toPharmacyListItems(rows: PharmacyListRow[]) {
  const ids = rows.map((r) => r.id);
  const [ratings, ordersByPharmacy] = await Promise.all([
    getPharmacyRatings(ids),
    ids.length > 0
      ? prisma.quote.groupBy({
          by: ['pharmacyId'],
          where: { pharmacyId: { in: ids }, order: { isNot: null } },
          _count: { _all: true }
        })
      : Promise.resolve([] as Array<{ pharmacyId: string; _count: { _all: number } }>)
  ]);
  const orders = new Map(ordersByPharmacy.map((o) => [o.pharmacyId, o._count._all]));

  return rows.map((row) => {
    const { _count, ...rest } = row;
    return {
      ...rest,
      ...ratingOf(ratings, row.id),
      counts: { quotes: _count.quotes, orders: orders.get(row.id) ?? 0 }
    };
  });
}

const ORDER_LIST_SELECT = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  quote: {
    select: {
      priceCents: true,
      deliveryDays: true,
      prescriptionId: true,
      pharmacy: { select: { id: true, name: true } },
      prescription: { select: { kind: true, patient: { select: { id: true, name: true } } } }
    }
  }
} satisfies Prisma.OrderSelect;

type OrderListRow = Prisma.OrderGetPayload<{ select: typeof ORDER_LIST_SELECT }>;

function toOrderListItem(order: OrderListRow) {
  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    priceCents: order.quote.priceCents,
    price: formatPriceCentsToDecimal(order.quote.priceCents),
    deliveryDays: order.quote.deliveryDays,
    pharmacy: order.quote.pharmacy,
    patient: order.quote.prescription.patient,
    kind: order.quote.prescription.kind,
    prescriptionId: order.quote.prescriptionId
  };
}

function parseCnpjData(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sendStatusError(res: Response, error: unknown): boolean {
  if (error instanceof AccountStatusError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return true;
  }
  return false;
}

function notFound(res: Response, message: string): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message } });
}

export class AdminManagementController {
  async getOverview(req: AuthRequest, res: Response): Promise<void> {
    try {
      res.json(await AdminOverviewService.getOverview());
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao montar visão geral' } });
    }
  }

  // ─── Usuários (pacientes e administradores) ──────────────────────────────

  async listUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const pagination = getPagination(req.query);
      const search = normalizeSearch(req.query.search);
      const where: Prisma.UserWhereInput = {};
      if (req.query.role) where.role = req.query.role as Role;
      if (req.query.status) where.status = req.query.status as AccountStatus;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          select: USER_LIST_SELECT,
          orderBy: { createdAt: 'desc' },
          skip: pagination.skip,
          take: pagination.limit
        })
      ]);

      res.json(buildPage(users.map(toUserListItem), total, pagination));
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar usuários' } });
    }
  }

  async getUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          ...USER_LIST_SELECT,
          phone: true,
          address: true,
          suspensionReason: true,
          consents: {
            select: { consentType: true, textVersion: true, consentedAt: true, revokedAt: true },
            orderBy: { consentedAt: 'desc' }
          }
        }
      });
      if (!user) {
        notFound(res, 'Usuário não encontrado');
        return;
      }

      await AuditLogService.log({
        actorId: req.user!.id,
        actorType: Role.ADMIN,
        actorEmail: req.user!.email,
        action: 'ADMIN_VIEW_USER',
        resource: 'User',
        resourceId: user.id,
        reason: 'ADMIN_ACCOUNT_MANAGEMENT',
        details: { fields: ['phone', 'address', 'consents'] },
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req)
      });

      const { phone, address, suspensionReason, consents, ...listRow } = user;
      res.json({
        ...toUserListItem(listRow),
        phone: decryptFieldSafe(phone) ?? null,
        address: decryptFieldSafe(address) ?? null,
        suspensionReason,
        consents
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao carregar usuário' } });
    }
  }

  async updateUserStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      await AccountStatusService.changeUserStatus({
        targetId: id,
        status: req.body.status,
        reason: req.body.reason,
        actor: { id: req.user!.id, email: req.user!.email, ipAddress: getClientIp(req), userAgent: getUserAgent(req) }
      });
      const user = await prisma.user.findUniqueOrThrow({ where: { id }, select: USER_LIST_SELECT });
      res.json(toUserListItem(user));
    } catch (error) {
      if (sendStatusError(res, error)) return;
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao alterar status do usuário' } });
    }
  }

  // ─── Farmácias ───────────────────────────────────────────────────────────

  async listPharmacies(req: AuthRequest, res: Response): Promise<void> {
    try {
      const pagination = getPagination(req.query);
      const search = normalizeSearch(req.query.search);
      const where: Prisma.PharmacyWhereInput = {};
      if (req.query.verificationStatus) {
        where.verificationStatus = req.query.verificationStatus as Prisma.PharmacyWhereInput['verificationStatus'];
      }
      if (req.query.status) where.status = req.query.status as AccountStatus;
      if (search) {
        const digits = search.replace(/\D/g, '');
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          ...(digits ? [{ cnpj: { contains: digits } }] : [])
        ];
      }

      const [total, rows] = await Promise.all([
        prisma.pharmacy.count({ where }),
        prisma.pharmacy.findMany({
          where,
          select: PHARMACY_LIST_SELECT,
          orderBy: { createdAt: 'desc' },
          skip: pagination.skip,
          take: pagination.limit
        })
      ]);

      res.json(buildPage(await toPharmacyListItems(rows), total, pagination));
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar farmácias' } });
    }
  }

  async getPharmacy(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const pharmacy = await prisma.pharmacy.findUnique({
        where: { id },
        select: {
          ...PHARMACY_PROFILE_SELECT,
          documentUrl: true,
          cnpjData: true,
          verifiedById: true,
          verifiedAt: true,
          suspensionReason: true
        }
      });
      if (!pharmacy) {
        notFound(res, 'Farmácia não encontrada');
        return;
      }

      const [quotes, acceptedQuotes, orders, deliveredOrders, gmv, ratings] = await Promise.all([
        prisma.quote.count({ where: { pharmacyId: id } }),
        prisma.quote.count({ where: { pharmacyId: id, status: QuoteStatus.ACCEPTED } }),
        prisma.order.count({ where: { quote: { pharmacyId: id } } }),
        prisma.order.count({ where: { quote: { pharmacyId: id }, status: OrderStatus.DELIVERED } }),
        prisma.quote.aggregate({
          _sum: { priceCents: true },
          where: { pharmacyId: id, order: { status: OrderStatus.DELIVERED } }
        }),
        getPharmacyRatings([id])
      ]);

      await AuditLogService.log({
        actorId: req.user!.id,
        actorType: Role.ADMIN,
        actorEmail: req.user!.email,
        action: 'ADMIN_VIEW_PHARMACY',
        resource: 'Pharmacy',
        resourceId: id,
        reason: 'ADMIN_ACCOUNT_MANAGEMENT',
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req)
      });

      const { documentUrl, cnpjData, verifiedById, verifiedAt, suspensionReason, ...profileRow } = pharmacy;
      res.json({
        ...buildPharmacyProfile(profileRow),
        documentUrl,
        cnpjData: parseCnpjData(cnpjData),
        verifiedById,
        verifiedAt,
        suspensionReason,
        stats: {
          quotes,
          acceptedQuotes,
          orders,
          deliveredOrders,
          gmvDeliveredCents: gmv._sum.priceCents ?? 0,
          ...ratingOf(ratings, id)
        }
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao carregar farmácia' } });
    }
  }

  async updatePharmacyStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      await AccountStatusService.changePharmacyStatus({
        targetId: id,
        status: req.body.status,
        reason: req.body.reason,
        actor: { id: req.user!.id, email: req.user!.email, ipAddress: getClientIp(req), userAgent: getUserAgent(req) }
      });
      const row = await prisma.pharmacy.findUniqueOrThrow({ where: { id }, select: PHARMACY_LIST_SELECT });
      const [item] = await toPharmacyListItems([row]);
      res.json(item);
    } catch (error) {
      if (sendStatusError(res, error)) return;
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao alterar status da farmácia' } });
    }
  }

  // ─── Pedidos ─────────────────────────────────────────────────────────────

  async listOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
      const pagination = getPagination(req.query);
      const search = normalizeSearch(req.query.search);
      const where: Prisma.OrderWhereInput = {};
      if (req.query.status) where.status = req.query.status as OrderStatus;
      if (search) {
        where.OR = [
          { id: { contains: search, mode: 'insensitive' } },
          { quote: { pharmacy: { name: { contains: search, mode: 'insensitive' } } } },
          { quote: { prescription: { patient: { name: { contains: search, mode: 'insensitive' } } } } }
        ];
      }

      const [total, orders] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.findMany({
          where,
          select: ORDER_LIST_SELECT,
          orderBy: { createdAt: 'desc' },
          skip: pagination.skip,
          take: pagination.limit
        })
      ]);

      res.json(buildPage(orders.map(toOrderListItem), total, pagination));
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar pedidos' } });
    }
  }

  async getOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: req.params.id as string },
        select: {
          ...ORDER_LIST_SELECT,
          history: {
            select: { fromStatus: true, toStatus: true, changedByType: true, createdAt: true },
            orderBy: { createdAt: 'asc' }
          },
          review: { select: { rating: true, comment: true, createdAt: true } }
        }
      });
      if (!order) {
        notFound(res, 'Pedido não encontrado');
        return;
      }

      const { history, review, ...listRow } = order;
      res.json({ ...toOrderListItem(listRow), history, review: review ?? null });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao carregar pedido' } });
    }
  }

  // ─── Receitas (somente metadados: o arquivo/fileUrl nunca sai daqui) ────

  async listPrescriptions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const pagination = getPagination(req.query);
      const where: Prisma.PrescriptionWhereInput = {};
      if (req.query.status) where.status = req.query.status as PrescriptionStatus;

      const [total, prescriptions] = await Promise.all([
        prisma.prescription.count({ where }),
        prisma.prescription.findMany({
          where,
          select: {
            id: true,
            status: true,
            createdAt: true,
            patient: { select: { id: true, name: true } },
            _count: { select: { quotes: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: pagination.skip,
          take: pagination.limit
        })
      ]);

      const data = prescriptions.map((p) => ({
        id: p.id,
        status: p.status,
        createdAt: p.createdAt,
        quotesCount: p._count.quotes,
        patient: p.patient
      }));
      res.json(buildPage(data, total, pagination));
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar receitas' } });
    }
  }

  // ─── Suporte ─────────────────────────────────────────────────────────────

  async listSupportTickets(req: AuthRequest, res: Response): Promise<void> {
    try {
      const pagination = getPagination(req.query);
      const search = normalizeSearch(req.query.search);
      const where: Prisma.SupportTicketWhereInput = {};
      if (req.query.status) where.status = req.query.status as SupportTicketStatus;
      if (req.query.category) where.category = req.query.category as Prisma.SupportTicketWhereInput['category'];
      if (search) {
        where.OR = [
          { protocol: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [total, tickets] = await Promise.all([
        prisma.supportTicket.count({ where }),
        prisma.supportTicket.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: pagination.skip,
          take: pagination.limit
        })
      ]);

      res.json(buildPage(tickets.map((t) => SupportTicketService.toAdminListItem(t)), total, pagination));
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar chamados' } });
    }
  }

  async getSupportTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
      const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id as string } });
      if (!ticket) {
        notFound(res, 'Chamado não encontrado');
        return;
      }

      // A mensagem pode conter dados de saúde: toda leitura completa é auditada
      await AuditLogService.log({
        actorId: req.user!.id,
        actorType: Role.ADMIN,
        actorEmail: req.user!.email,
        action: 'ADMIN_VIEW_SUPPORT_TICKET',
        resource: 'SupportTicket',
        resourceId: ticket.id,
        reason: 'ADMIN_SUPPORT_HANDLING',
        details: { protocol: ticket.protocol },
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req)
      });

      res.json(SupportTicketService.toAdminDetail(ticket));
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao carregar chamado' } });
    }
  }

  async updateSupportTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const existing = await prisma.supportTicket.findUnique({ where: { id } });
      if (!existing) {
        notFound(res, 'Chamado não encontrado');
        return;
      }

      const { status, resolution } = req.body as { status?: SupportTicketStatus; resolution?: string | null };
      const data: Prisma.SupportTicketUpdateInput = { handledById: req.user!.id };
      if (resolution !== undefined) data.resolution = resolution;
      if (status !== undefined) {
        data.status = status;
        data.resolvedAt = SupportTicketService.isFinalStatus(status) ? existing.resolvedAt ?? new Date() : null;
      }

      const ticket = await prisma.supportTicket.update({ where: { id }, data });

      await AuditLogService.log({
        actorId: req.user!.id,
        actorType: Role.ADMIN,
        actorEmail: req.user!.email,
        action: 'ADMIN_UPDATE_SUPPORT_TICKET',
        resource: 'SupportTicket',
        resourceId: ticket.id,
        reason: 'ADMIN_SUPPORT_HANDLING',
        details: { protocol: ticket.protocol, fromStatus: existing.status, toStatus: ticket.status },
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req)
      });

      // Notifica o titular, se o chamado estiver vinculado a uma conta (sem repetir o conteúdo)
      if (ticket.userId || ticket.pharmacyId) {
        await createAndSendNotification({
          userId: ticket.userId ?? undefined,
          pharmacyId: ticket.userId ? undefined : ticket.pharmacyId ?? undefined,
          type: 'SUPPORT_TICKET_UPDATE',
          title: `Chamado ${ticket.protocol} atualizado`,
          message: `Seu chamado de protocolo ${ticket.protocol} está agora com status: ${SupportTicketService.statusLabel(ticket.status)}. Acompanhe a resposta na área de suporte.`
        });
      }

      res.json(SupportTicketService.toAdminDetail(ticket));
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar chamado' } });
    }
  }
}
