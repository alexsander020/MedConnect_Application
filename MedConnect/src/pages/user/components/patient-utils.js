/**
 * Utilitários da área do paciente (receitas, cotações e pedidos).
 * Dinheiro: a API manda `priceCents` (Int) e, em algumas rotas, `price` decimal em string.
 */
import { formatCents } from '@/lib/format';
import { api } from '@/services/api';

export const asArray = (value) => (Array.isArray(value) ? value : []);

/** "#3F2A9C1D" — código curto para exibir pedidos e receitas */
export const shortId = (id = '') => `#${String(id).slice(0, 8).toUpperCase()}`;

/** Valor em centavos de uma cotação (prefere priceCents; aceita `price` decimal) */
export function priceCentsOf(quote) {
  if (!quote) return null;
  if (quote.priceCents !== undefined && quote.priceCents !== null) return Number(quote.priceCents);
  if (quote.price !== undefined && quote.price !== null && quote.price !== '') {
    const n = Number(quote.price);
    return Number.isNaN(n) ? null : Math.round(n * 100);
  }
  return null;
}

export function formatQuotePrice(quote) {
  const cents = priceCentsOf(quote);
  return cents === null ? '—' : formatCents(cents);
}

/** "3 dias úteis" / "Prazo a combinar" */
export function deliveryLabel(days) {
  if (days === undefined || days === null || days === '') return 'Prazo a combinar';
  const n = Number(days);
  if (Number.isNaN(n)) return 'Prazo a combinar';
  if (n === 0) return 'No mesmo dia';
  return `${n} ${n === 1 ? 'dia útil' : 'dias úteis'}`;
}

export const isOrderActive = (order) => !!order && order.status !== 'DELIVERED' && order.status !== 'CANCELLED';
export const isOrderDone = (order) => !!order && (order.status === 'DELIVERED' || order.status === 'CANCELLED');

/** Pedido entregue e ainda sem avaliação conhecida */
export const canReview = (order) => order?.status === 'DELIVERED' && !order.review;

/** Cotações pendentes (aguardando escolha do paciente) de receitas ainda abertas */
export function openQuotesOf(prescription) {
  if (!prescription || prescription.status === 'ACCEPTED' || prescription.status === 'CANCELLED') return [];
  return asArray(prescription.quotes).filter((q) => q.status === 'PENDING');
}

export function countOpenQuotes(prescriptions) {
  return asArray(prescriptions).reduce((acc, p) => acc + openQuotesOf(p).length, 0);
}

/** Receitas enviadas que ainda não receberam nenhuma cotação */
export function awaitingQuotes(prescriptions) {
  return asArray(prescriptions).filter((p) => p.status === 'PENDING' && openQuotesOf(p).length === 0);
}

/**
 * Mensagem de erro amigável: usa somente o texto que a API devolve em português
 * (nunca a mensagem técnica do axios, que vem em inglês).
 */
export function friendlyError(err, fallback = 'Algo deu errado. Tente novamente.') {
  const apiMessage = err?.response?.data?.error?.message;
  return typeof apiMessage === 'string' && apiMessage.trim() ? apiMessage : fallback;
}

export const errorCode = (err) => err?.response?.data?.error?.code || null;
export const errorStatus = (err) => err?.response?.status || null;

/**
 * A URL assinada local vem relativa ("/api/prescriptions/:id/view?...").
 * Resolve contra a origem da API (que pode ser diferente da origem do site).
 */
export function resolveApiUrl(url) {
  if (!url || /^https?:\/\//i.test(url)) return url;
  try {
    const base = new URL(api?.defaults?.baseURL || '/', window.location.origin);
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

/** Data local AAAA-MM-DD (para nomes de arquivo) */
export function localDateStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Máscara de telefone brasileiro: (11) 98765-4321 / (11) 3456-7890 */
export function maskPhone(value = '') {
  const d = String(value).replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
