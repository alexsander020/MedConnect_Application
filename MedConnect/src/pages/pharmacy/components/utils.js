/**
 * Utilitários da área da farmácia (sem React).
 * Dinheiro: a API devolve `priceCents` (Int) e `price` ("89.90"); preferimos sempre os centavos.
 */
import { api } from '@/services/api';
import { formatCents, formatMoney } from '@/lib/format';

/** Receitas publicadas há menos de 24h e ainda sem proposta desta farmácia ganham o selo "NOVA" */
export const RECENT_HOURS = 24;

export function shortId(id) {
  return id ? String(id).slice(0, 8).toUpperCase() : '—';
}

/**
 * LGPD (ADR 008): antes do aceite a farmácia só recebe o pseudônimo do paciente (`patient.anonymousId`);
 * nome/telefone e o arquivo da receita (via /view-url) só depois que a proposta desta farmácia é aceita.
 */
export const RELEASE_NOTICE = 'A receita completa e o contato do paciente são liberados após o aceite da sua proposta.';

/** Pseudônimo do paciente ("Paciente #ABCDE") — nunca o nome antes do aceite */
export function patientAlias(prescription) {
  return prescription?.patient?.anonymousId || 'Paciente';
}

export function isRecent(date, hours = RECENT_HOURS, now = Date.now()) {
  if (!date) return false;
  const t = new Date(date).getTime();
  return Number.isFinite(t) && now - t >= 0 && now - t < hours * 3600 * 1000;
}

/** Proposta desta farmácia para a receita (o mural e o detalhe devolvem só as cotações da própria farmácia) */
export function myQuoteOf(prescription, pharmacyId) {
  const quotes = Array.isArray(prescription?.quotes) ? prescription.quotes : [];
  if (!pharmacyId) return null;
  return quotes.find((q) => q.pharmacyId === pharmacyId || q.pharmacy?.id === pharmacyId) || null;
}

/** O arquivo da receita só abre (GET /prescriptions/:id/view-url) depois que a proposta desta farmácia é aceita */
export function canViewPrescription(prescription, quote) {
  return Boolean(prescription?.contactReleased) || quote?.status === 'ACCEPTED';
}

export function quotePriceLabel(quote) {
  if (!quote) return '—';
  if (quote.priceCents !== undefined && quote.priceCents !== null) return formatCents(quote.priceCents);
  return formatMoney(quote.price);
}

export function orderPriceLabel(order) {
  return quotePriceLabel(order?.quote);
}

export function deliveryDaysLabel(days) {
  const n = Number(days);
  if (!days || !Number.isFinite(n) || n <= 0) return 'Prazo a combinar';
  return `${n} ${n === 1 ? 'dia útil' : 'dias úteis'}`;
}

/** Soma dias úteis (seg–sex) a uma data */
export function addBusinessDays(date, days) {
  const d = new Date(date);
  let left = Math.max(0, Math.floor(Number(days) || 0));
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) left -= 1;
  }
  return d;
}

/**
 * Previsão de entrega do pedido: data de aprovação + prazo da cotação (dias úteis).
 * Retorna null quando a cotação não informa prazo.
 */
export function orderDeadline(order, now = new Date()) {
  const days = order?.quote?.deliveryDays;
  if (!order?.createdAt || !days) return null;
  const date = addBusinessDays(order.createdAt, days);
  date.setHours(23, 59, 59, 999);
  const open = order.status === 'PRODUCTION' || order.status === 'DELIVERY';
  const overdue = open && date.getTime() < now.getTime();
  const msLeft = date.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / 86400000);
  return { date, overdue, daysLeft, dueSoon: open && !overdue && daysLeft <= 1 };
}

/** Paciente do pedido (a listagem devolve nome; contato só no detalhe, com auditoria) */
export function orderPatient(order) {
  return order?.quote?.prescription?.patient || null;
}

/**
 * Converte "89,90", "1.234,56", "R$ 45" ou "45.5" em número com até 2 casas.
 * Retorna { value } ou { error }.
 */
export function parseBRL(input) {
  const raw = String(input ?? '').replace(/R\$\s?/i, '').replace(/\s/g, '').trim();
  if (!raw) return { error: 'Informe o valor da proposta.' };
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return { error: 'Use um valor em reais com até 2 casas decimais, ex.: 89,90.' };
  }
  const value = Number(normalized);
  if (!(value > 0)) return { error: 'O valor deve ser maior que zero.' };
  if (value > 100000) return { error: 'Confira o valor: o máximo aceito é R$ 100.000,00.' };
  return { value };
}

/** Mensagem do servidor (sempre em português) ou texto padrão — nunca o erro cru do navegador */
export function serverMessage(err, fallback) {
  return err?.response?.data?.error?.message || err?.response?.data?.message || fallback;
}

export function errorCode(err) {
  return err?.response?.data?.error?.code || null;
}

export function errorStatus(err) {
  return err?.response?.status || null;
}

/** URLs assinadas locais vêm relativas ("/api/prescriptions/..."): resolve contra a origem da API */
export function resolveApiUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  try {
    const base = new URL(api?.defaults?.baseURL || '/', window.location.origin);
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}
