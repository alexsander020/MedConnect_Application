import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  BusinessHourInterval,
  OpenStatus,
  computeOpenStatus,
  toBusinessHourDtos,
  BusinessHourDto
} from '../domain/businessHours';

/**
 * Montagem dos formatos de resposta da farmácia (perfil próprio, listagem pública e visão do admin).
 * Centraliza o que pode e o que não pode sair em cada contexto (minimização de dados).
 */

export const BUSINESS_HOURS_SELECT = {
  select: { dayOfWeek: true, opensAt: true, closesAt: true },
  orderBy: [{ dayOfWeek: 'asc' as const }, { opensAt: 'asc' as const }]
};

export const PHARMACY_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  cnpj: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  deliveryArea: true,
  description: true,
  services: true,
  timezone: true,
  verificationStatus: true,
  verified: true,
  rejectionReason: true,
  status: true,
  termsAcceptedAt: true,
  termsVersion: true,
  sanitaryLicense: true,
  operatingAuth: true,
  technicalResponsibleName: true,
  technicalResponsibleCrf: true,
  technicalResponsibleUf: true,
  createdAt: true,
  businessHours: BUSINESS_HOURS_SELECT
} satisfies Prisma.PharmacySelect;

export type PharmacyProfileRow = Prisma.PharmacyGetPayload<{ select: typeof PHARMACY_PROFILE_SELECT }>;

export interface PharmacyRating {
  averageRating: number;
  reviewsCount: number;
}

export function buildSchedule(
  businessHours: BusinessHourInterval[],
  timezone: string,
  now: Date = new Date()
): { businessHours: BusinessHourDto[]; openStatus: OpenStatus } {
  return {
    businessHours: toBusinessHourDtos(businessHours),
    openStatus: computeOpenStatus(businessHours, now, timezone)
  };
}

/**
 * Perfil completo da farmácia autenticada (GET/PATCH /pharmacy/me).
 */
export function buildPharmacyProfile(pharmacy: PharmacyProfileRow, now: Date = new Date()) {
  const { businessHours, ...rest } = pharmacy;
  return {
    ...rest,
    services: rest.services ?? [],
    ...buildSchedule(businessHours, pharmacy.timezone, now)
  };
}

/**
 * Média (1 casa decimal) e quantidade de avaliações por farmácia.
 * Farmácia sem avaliações: averageRating = 0 e reviewsCount = 0.
 */
export async function getPharmacyRatings(pharmacyIds: string[]): Promise<Map<string, PharmacyRating>> {
  const ratings = new Map<string, PharmacyRating>();
  if (pharmacyIds.length === 0) return ratings;

  const grouped = await prisma.review.groupBy({
    by: ['pharmacyId'],
    where: { pharmacyId: { in: pharmacyIds } },
    _avg: { rating: true },
    _count: { _all: true }
  });

  for (const row of grouped) {
    ratings.set(row.pharmacyId, {
      averageRating: Number((row._avg.rating ?? 0).toFixed(1)),
      reviewsCount: row._count._all
    });
  }
  return ratings;
}

export function ratingOf(ratings: Map<string, PharmacyRating>, pharmacyId: string): PharmacyRating {
  return ratings.get(pharmacyId) ?? { averageRating: 0, reviewsCount: 0 };
}
