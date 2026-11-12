/**
 * Horário de funcionamento — espelho do cálculo do servidor (backend/src/domain/businessHours.ts).
 * A API já devolve `openStatus`, mas recalculamos no cliente para a pílula "Aberta até…"
 * ficar viva (atualiza a cada minuto sem nova requisição).
 *
 * hours: [{ dayOfWeek: 0..6 (0 = domingo), opensAt: "09:00", closesAt: "18:30" }]
 */
import { formatClock } from './format';

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
/** Ordem de exibição: segunda → domingo */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
}

export function toHHMM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Dia da semana e minutos desde 00:00 no fuso informado */
export function zonedNow(timezone = 'America/Sao_Paulo', now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const get = (t) => parts.find((p) => p.type === t)?.value;
    return {
      dayOfWeek: WEEKDAY_INDEX[get('weekday')] ?? now.getDay(),
      minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
    };
  } catch {
    return { dayOfWeek: now.getDay(), minutes: now.getHours() * 60 + now.getMinutes() };
  }
}

export function computeOpenStatus(hours = [], timezone = 'America/Sao_Paulo', now = new Date()) {
  if (!hours || hours.length === 0) return { isOpen: false, closesAt: null, nextOpening: null };
  const { dayOfWeek, minutes } = zonedNow(timezone, now);
  const byDay = (d) =>
    hours
      .filter((h) => h.dayOfWeek === d)
      .map((h) => ({ open: toMinutes(h.opensAt), close: toMinutes(h.closesAt), opensAt: h.opensAt, closesAt: h.closesAt }))
      .sort((a, b) => a.open - b.open);

  const today = byDay(dayOfWeek);
  const current = today.find((i) => minutes >= i.open && minutes < i.close);
  if (current) return { isOpen: true, closesAt: current.closesAt, nextOpening: null };

  const laterToday = today.find((i) => i.open > minutes);
  if (laterToday) {
    return { isOpen: false, closesAt: null, nextOpening: { dayOfWeek, opensAt: laterToday.opensAt, isToday: true, isTomorrow: false } };
  }
  for (let offset = 1; offset <= 7; offset += 1) {
    const d = (dayOfWeek + offset) % 7;
    const first = byDay(d)[0];
    if (first) {
      return { isOpen: false, closesAt: null, nextOpening: { dayOfWeek: d, opensAt: first.opensAt, isToday: false, isTomorrow: offset === 1 } };
    }
  }
  return { isOpen: false, closesAt: null, nextOpening: null };
}

/** Texto curto da pílula de status */
export function describeOpenStatus(status) {
  if (!status) return { tone: 'unknown', label: 'Horário não informado' };
  if (status.isOpen) return { tone: 'open', label: `Aberta até ${formatClock(status.closesAt)}` };
  const next = status.nextOpening;
  if (!next) return { tone: 'unknown', label: 'Horário não informado' };
  const when = next.isToday
    ? `hoje às ${formatClock(next.opensAt)}`
    : next.isTomorrow
      ? `amanhã às ${formatClock(next.opensAt)}`
      : `${WEEKDAYS[next.dayOfWeek].toLowerCase()} às ${formatClock(next.opensAt)}`;
  return { tone: 'closed', label: `Fechada — abre ${when}` };
}

/** Agrupa intervalos por dia para tabelas de horário */
export function groupByDay(hours = []) {
  const map = Object.fromEntries(WEEK_ORDER.map((d) => [d, []]));
  hours.forEach((h) => map[h.dayOfWeek]?.push(h));
  Object.values(map).forEach((list) => list.sort((a, b) => toMinutes(a.opensAt) - toMinutes(b.opensAt)));
  return map;
}
