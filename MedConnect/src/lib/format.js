/**
 * Formatação pt-BR compartilhada (dinheiro, datas, horários, documentos).
 * Dinheiro trafega em centavos (Int) na API — nunca faça conta com float aqui.
 */

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const intFmt = new Intl.NumberFormat('pt-BR');

export function formatCents(cents) {
  if (cents === null || cents === undefined || Number.isNaN(Number(cents))) return '—';
  return brl.format(Number(cents) / 100);
}

/** Aceita "123.45", 123.45 ou { priceCents } e devolve "R$ 123,45" */
export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object' && value.priceCents !== undefined) return formatCents(value.priceCents);
  const n = Number(value);
  return Number.isNaN(n) ? '—' : brl.format(n);
}

export function formatNumber(n) {
  return n === null || n === undefined ? '—' : intFmt.format(Number(n));
}

export function formatDate(value, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', opts);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

/** "há 5 minutos", "ontem", "há 3 dias" */
export function formatRelative(value, now = new Date()) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  const diffSec = Math.round((d.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return 'agora há pouco';
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), 'day');
  return formatDate(d);
}

/** "09:00" → "9h", "18:30" → "18h30", "24:00" → "meia-noite" */
export function formatClock(hhmm) {
  if (!hhmm) return '';
  const [h, m] = String(hhmm).split(':').map(Number);
  if (h === 24 || (h === 0 && m === 0)) return 'meia-noite';
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export function formatCnpj(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length !== 14) return v || '—';
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function formatPhone(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return v || '—';
}

export function initials(name = '') {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '·';
}

/** Primeiro nome — usado em saudações */
export function firstName(name = '') {
  return String(name).trim().split(/\s+/)[0] || '';
}

/** Extrai a mensagem de erro no formato { error: { code, message } } da API */
export function apiErrorMessage(err, fallback = 'Algo deu errado. Tente novamente.') {
  return err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || fallback;
}

export function apiErrorCode(err) {
  return err?.response?.data?.error?.code || null;
}
