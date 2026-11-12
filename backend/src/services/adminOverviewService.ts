import {
  AccountStatus,
  OrderStatus,
  PharmacyVerificationStatus,
  PrescriptionStatus,
  QuoteStatus,
  Role,
  SupportTicketStatus
} from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Painel administrativo agregado (GET /admin/overview).
 * Só contagens e somas: nenhum dado pessoal sai daqui.
 * A série diária usa o fuso da operação (America/Sao_Paulo) para definir o "dia".
 */

export const OVERVIEW_TIMEZONE = 'America/Sao_Paulo';
export const SERIES_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DailySeriesPoint {
  date: string;
  prescriptions: number;
  orders: number;
}

/**
 * Data no formato AAAA-MM-DD no fuso informado.
 */
export function toDateKey(date: Date, timeZone: string = OVERVIEW_TIMEZONE): string {
  // en-CA formata como AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

/**
 * Últimos `days` dias (inclusive hoje), em ordem cronológica, incluindo dias zerados.
 */
export function buildDailySeries(
  prescriptionDates: Date[],
  orderDates: Date[],
  now: Date = new Date(),
  days: number = SERIES_DAYS,
  timeZone: string = OVERVIEW_TIMEZONE
): DailySeriesPoint[] {
  const todayKey = toDateKey(now, timeZone);
  const [year, month, day] = todayKey.split('-').map(Number);
  const todayUtc = Date.UTC(year, month - 1, day);

  const series: DailySeriesPoint[] = [];
  const index = new Map<string, DailySeriesPoint>();
  for (let offset = days - 1; offset >= 0; offset--) {
    const key = new Date(todayUtc - offset * DAY_MS).toISOString().slice(0, 10);
    const point = { date: key, prescriptions: 0, orders: 0 };
    series.push(point);
    index.set(key, point);
  }

  for (const d of prescriptionDates) {
    const point = index.get(toDateKey(d, timeZone));
    if (point) point.prescriptions++;
  }
  for (const d of orderDates) {
    const point = index.get(toDateKey(d, timeZone));
    if (point) point.orders++;
  }
  return series;
}

function countBy<T extends string>(rows: Array<{ _count: { _all: number } } & Record<string, unknown>>, field: string, value: T): number {
  return rows.find((r) => r[field] === value)?._count._all ?? 0;
}

export class AdminOverviewService {
  static async getOverview(now: Date = new Date()) {
    // Janela com folga de 1 dia para cobrir a diferença entre UTC e o fuso da operação.
    const seriesWindowStart = new Date(now.getTime() - (SERIES_DAYS + 1) * DAY_MS);
    const last30d = new Date(now.getTime() - 30 * DAY_MS);

    const [
      usersByRole,
      suspendedUsers,
      newPatientsLast30d,
      pharmaciesByVerification,
      suspendedPharmacies,
      totalPharmacies,
      prescriptionsByStatus,
      quotesByStatus,
      ordersByStatus,
      gmv,
      ticketsByStatus,
      activeConsents,
      revokedConsents,
      recentPrescriptions,
      recentOrders
    ] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.user.count({ where: { status: AccountStatus.SUSPENDED } }),
      prisma.user.count({ where: { role: Role.PATIENT, createdAt: { gte: last30d } } }),
      prisma.pharmacy.groupBy({ by: ['verificationStatus'], _count: { _all: true } }),
      prisma.pharmacy.count({ where: { status: AccountStatus.SUSPENDED } }),
      prisma.pharmacy.count(),
      prisma.prescription.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.quote.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.quote.aggregate({ _sum: { priceCents: true }, where: { order: { status: OrderStatus.DELIVERED } } }),
      prisma.supportTicket.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.consent.count({ where: { revokedAt: null } }),
      prisma.consent.count({ where: { revokedAt: { not: null } } }),
      prisma.prescription.findMany({ where: { createdAt: { gte: seriesWindowStart } }, select: { createdAt: true } }),
      prisma.order.findMany({ where: { createdAt: { gte: seriesWindowStart } }, select: { createdAt: true } })
    ]);

    const total = (rows: Array<{ _count: { _all: number } }>) => rows.reduce((sum, r) => sum + r._count._all, 0);

    return {
      users: {
        patients: countBy(usersByRole, 'role', Role.PATIENT),
        admins: countBy(usersByRole, 'role', Role.ADMIN),
        suspended: suspendedUsers,
        newLast30d: newPatientsLast30d
      },
      pharmacies: {
        total: totalPharmacies,
        verified: countBy(pharmaciesByVerification, 'verificationStatus', PharmacyVerificationStatus.VERIFIED),
        pending: countBy(pharmaciesByVerification, 'verificationStatus', PharmacyVerificationStatus.PENDING_VERIFICATION),
        rejected: countBy(pharmaciesByVerification, 'verificationStatus', PharmacyVerificationStatus.REJECTED),
        suspended: suspendedPharmacies
      },
      prescriptions: {
        total: total(prescriptionsByStatus),
        pending: countBy(prescriptionsByStatus, 'status', PrescriptionStatus.PENDING),
        quoted: countBy(prescriptionsByStatus, 'status', PrescriptionStatus.QUOTED),
        accepted: countBy(prescriptionsByStatus, 'status', PrescriptionStatus.ACCEPTED),
        cancelled: countBy(prescriptionsByStatus, 'status', PrescriptionStatus.CANCELLED)
      },
      quotes: {
        total: total(quotesByStatus),
        pending: countBy(quotesByStatus, 'status', QuoteStatus.PENDING),
        accepted: countBy(quotesByStatus, 'status', QuoteStatus.ACCEPTED),
        rejected: countBy(quotesByStatus, 'status', QuoteStatus.REJECTED),
        expired: countBy(quotesByStatus, 'status', QuoteStatus.EXPIRED)
      },
      orders: {
        total: total(ordersByStatus),
        production: countBy(ordersByStatus, 'status', OrderStatus.PRODUCTION),
        delivery: countBy(ordersByStatus, 'status', OrderStatus.DELIVERY),
        delivered: countBy(ordersByStatus, 'status', OrderStatus.DELIVERED),
        cancelled: countBy(ordersByStatus, 'status', OrderStatus.CANCELLED),
        gmvDeliveredCents: gmv._sum.priceCents ?? 0
      },
      support: {
        open: countBy(ticketsByStatus, 'status', SupportTicketStatus.OPEN),
        inProgress: countBy(ticketsByStatus, 'status', SupportTicketStatus.IN_PROGRESS)
      },
      consents: {
        active: activeConsents,
        revoked: revokedConsents
      },
      series: buildDailySeries(
        recentPrescriptions.map((p) => p.createdAt),
        recentOrders.map((o) => o.createdAt),
        now
      )
    };
  }
}
