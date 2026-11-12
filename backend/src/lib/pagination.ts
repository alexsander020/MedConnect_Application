import { z } from 'zod';

/**
 * Paginação padrão das listagens novas: `{ data, total, page, limit, totalPages }`.
 * `page` padrão 1; `limit` padrão 20, máximo 100.
 */
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export const paginationQuerySchema = {
  page: z.coerce.number().int('page deve ser inteiro').min(1, 'page deve ser >= 1').optional(),
  limit: z.coerce
    .number()
    .int('limit deve ser inteiro')
    .min(1, 'limit deve ser >= 1')
    .max(MAX_PAGE_LIMIT, `limit deve ser <= ${MAX_PAGE_LIMIT}`)
    .optional()
};

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function getPagination(query: { page?: unknown; limit?: unknown }): PaginationParams {
  const page = Math.max(1, Math.floor(Number(query.page)) || 1);
  const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Math.floor(Number(query.limit)) || DEFAULT_PAGE_LIMIT));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPage<T>(data: T[], total: number, params: PaginationParams): PaginatedResult<T> {
  return {
    data,
    total,
    page: params.page,
    limit: params.limit,
    totalPages: Math.ceil(total / params.limit)
  };
}

/**
 * Normaliza o termo de busca (`search`): remove espaços e ignora vazio.
 */
export function normalizeSearch(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 120) : undefined;
}
