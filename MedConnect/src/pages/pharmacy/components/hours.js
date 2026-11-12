/**
 * Editor de horários — modelo do rascunho e validação espelhando o servidor
 * (backend/src/domain/businessHours.ts): "HH:MM", "24:00" só no fechamento,
 * fechamento > abertura, sem sobreposição no mesmo dia, até 4 intervalos por dia.
 * Intervalos encostados (08:00–12:00 e 12:00–18:00) NÃO são sobreposição.
 */
import { WEEKDAYS, WEEK_ORDER, groupByDay, toMinutes } from '@/lib/business-hours';
import { formatClock } from '@/lib/format';

export const MAX_INTERVALS_PER_DAY = 4;
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
export const DEFAULT_INTERVAL = { opensAt: '08:00', closesAt: '18:00' };
export const BUSINESS_DAYS = [1, 2, 3, 4, 5];

/** Fusos IANA brasileiros (America/Sao_Paulo primeiro) */
export const BRAZIL_TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Horário de Brasília (SP, RJ, MG, Sul, GO, DF)' },
  { value: 'America/Bahia', label: 'Salvador (BA)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (CE, MA, PI, RN, PB)' },
  { value: 'America/Recife', label: 'Recife (PE)' },
  { value: 'America/Maceio', label: 'Maceió (AL, SE)' },
  { value: 'America/Belem', label: 'Belém (PA, AP)' },
  { value: 'America/Santarem', label: 'Santarém (oeste do PA)' },
  { value: 'America/Araguaina', label: 'Araguaína (TO)' },
  { value: 'America/Manaus', label: 'Manaus (AM)' },
  { value: 'America/Boa_Vista', label: 'Boa Vista (RR)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (RO)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (MT)' },
  { value: 'America/Campo_Grande', label: 'Campo Grande (MS)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (AC)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (PE)' },
];

/** "UTC−3" para exibir ao lado do fuso */
export function utcOffsetLabel(timeZone, now = new Date()) {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(now)
      .find((p) => p.type === 'timeZoneName')?.value;
    if (!part) return '';
    return part.replace('GMT', 'UTC').replace('-', '−') || 'UTC';
  } catch {
    return '';
  }
}

const OPEN_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidOpening(v) {
  return OPEN_RE.test(String(v));
}

export function isValidClosing(v) {
  return v === '24:00' || OPEN_RE.test(String(v));
}

let seq = 0;
export function uid() {
  seq += 1;
  return `iv-${seq}`;
}

/** Normaliza o que foi digitado ao sair do campo: "9" → "09:00", "930" → "09:30", "18:3" → "18:30" */
export function normalizeTime(value) {
  const v = String(value ?? '').trim();
  let m = /^(\d{1,2})$/.exec(v);
  if (m) return `${m[1].padStart(2, '0')}:00`;
  m = /^(\d{1,2})[:h.](\d{1,2})$/.exec(v);
  if (m) return `${m[1].padStart(2, '0')}:${m[2].padEnd(2, '0')}`;
  m = /^(\d{1,2})(\d{2})$/.exec(v);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  return v;
}

/** Mantém só dígitos e ":" (até 5 caracteres) durante a digitação */
export function sanitizeTimeInput(value) {
  return String(value ?? '').replace(/[^\d:]/g, '').slice(0, 5);
}

/** Converte businessHours da API no rascunho editável */
export function draftFromHours(hours = [], timezone) {
  const grouped = groupByDay(hours || []);
  const days = {};
  for (const d of WEEK_ORDER) {
    const list = grouped[d] || [];
    days[d] = {
      open: list.length > 0,
      intervals: list.length
        ? list.map((h) => ({ id: uid(), opensAt: h.opensAt, closesAt: h.closesAt }))
        : [{ id: uid(), ...DEFAULT_INTERVAL }],
    };
  }
  return { timezone: timezone || DEFAULT_TIMEZONE, days };
}

/**
 * Valida um dia. Retorna um array alinhado a `intervals`:
 * [{ opensAt?: string, closesAt?: string, interval?: string } | null]
 */
export function validateDay(day) {
  if (!day?.open) return [];
  const errors = day.intervals.map((iv) => {
    const e = {};
    if (!isValidOpening(iv.opensAt)) {
      e.opensAt = iv.opensAt === '24:00' ? '24:00 só vale como fechamento.' : 'Use HH:MM (00:00 a 23:59).';
    }
    if (!isValidClosing(iv.closesAt)) e.closesAt = 'Use HH:MM (até 24:00).';
    if (!e.opensAt && !e.closesAt && toMinutes(iv.closesAt) <= toMinutes(iv.opensAt)) {
      e.interval = 'O fechamento precisa ser depois da abertura.';
    }
    return Object.keys(e).length ? e : null;
  });

  // Sobreposição: só entre intervalos individualmente válidos, ordenados pela abertura
  const valid = day.intervals
    .map((iv, index) => ({ ...iv, index }))
    .filter((iv) => !errors[iv.index])
    .sort((a, b) => toMinutes(a.opensAt) - toMinutes(b.opensAt));
  let reach = valid[0];
  for (let i = 1; i < valid.length; i += 1) {
    const cur = valid[i];
    if (toMinutes(cur.opensAt) < toMinutes(reach.closesAt)) {
      // Só o intervalo que invade é marcado; ele não amplia a janela de comparação
      errors[cur.index] = { interval: `Este intervalo se sobrepõe ao das ${reach.opensAt}–${reach.closesAt}.` };
    } else {
      reach = cur;
    }
  }
  if (day.intervals.length > MAX_INTERVALS_PER_DAY) {
    errors[MAX_INTERVALS_PER_DAY] = { interval: `No máximo ${MAX_INTERVALS_PER_DAY} intervalos por dia.` };
  }
  return errors;
}

/** Valida a semana inteira: { byDay: { [d]: errors[] }, messages: string[], count } */
export function validateDraft(draft) {
  const byDay = {};
  const messages = [];
  for (const d of WEEK_ORDER) {
    const errs = validateDay(draft.days[d]);
    byDay[d] = errs;
    errs.forEach((e) => {
      if (e) messages.push(`${WEEKDAYS[d]}: ${e.interval || e.opensAt || e.closesAt}`);
    });
  }
  return { byDay, messages, count: messages.length };
}

/** Intervalos abertos do rascunho no formato da API (válidos ou não), ordenados por dia e abertura */
export function draftToHours(draft, { onlyValid = false } = {}) {
  const out = [];
  for (let d = 0; d < 7; d += 1) {
    const day = draft.days[d];
    if (!day?.open) continue;
    const errs = onlyValid ? validateDay(day) : [];
    day.intervals.forEach((iv, i) => {
      if (onlyValid && errs[i]) return;
      out.push({ dayOfWeek: d, opensAt: iv.opensAt, closesAt: iv.closesAt });
    });
  }
  return out.sort((a, b) => a.dayOfWeek - b.dayOfWeek || toMinutes(a.opensAt) - toMinutes(b.opensAt));
}

/** Corpo do PUT /pharmacy/me/hours */
export function draftToPayload(draft) {
  return { timezone: draft.timezone, hours: draftToHours(draft) };
}

/** Assinatura estável para detectar alterações não salvas */
export function draftSignature(draft) {
  return JSON.stringify(draftToPayload(draft));
}

/** Sugestão de novo intervalo: começa 1h depois do último fechamento (ex.: pausa de almoço) */
export function suggestNextInterval(intervals) {
  const sorted = [...intervals]
    .filter((iv) => isValidOpening(iv.opensAt) && isValidClosing(iv.closesAt))
    .sort((a, b) => toMinutes(a.closesAt) - toMinutes(b.closesAt));
  const last = sorted[sorted.length - 1];
  if (!last) return { ...DEFAULT_INTERVAL };
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const close = toMinutes(last.closesAt);
  // 1h de pausa quando couber; senão, encostado no último fechamento (nunca sobreposto)
  const start = close + 60 <= 23 * 60 ? close + 60 : close;
  if (start < 24 * 60) return { opensAt: fmt(start), closesAt: fmt(Math.min(start + 4 * 60, 24 * 60)) };
  // Dia já vai até 24:00: sugere antes da primeira abertura
  const firstOpen = Math.min(...sorted.map((iv) => toMinutes(iv.opensAt)));
  if (firstOpen > 0) return { opensAt: fmt(Math.max(0, firstOpen - 4 * 60)), closesAt: fmt(firstOpen) };
  return { ...DEFAULT_INTERVAL };
}

/** Copia a configuração de um dia para os dias úteis (seg–sex) */
export function copyDayTo(draft, fromDay, targets = BUSINESS_DAYS) {
  const source = draft.days[fromDay];
  const days = { ...draft.days };
  for (const d of targets) {
    if (d === fromDay) continue;
    days[d] = {
      open: source.open,
      intervals: source.intervals.map((iv) => ({ id: uid(), opensAt: iv.opensAt, closesAt: iv.closesAt })),
    };
  }
  return { ...draft, days };
}

/** "9h às 12h · 14h às 18h30" (lista vazia → "Fechada") */
export function intervalsLabel(list) {
  if (!list || list.length === 0) return 'Fechada';
  return list.map((h) => `${formatClock(h.opensAt)} às ${formatClock(h.closesAt)}`).join(' · ');
}
