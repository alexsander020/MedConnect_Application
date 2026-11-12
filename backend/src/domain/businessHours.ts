/**
 * Domínio puro de horários de atendimento das farmácias.
 *
 * - No banco, horários são minutos desde 00:00 (Int) no fuso IANA da farmácia.
 * - Na API, trafegam como string "HH:MM". "24:00" só é aceito como fechamento.
 * - dayOfWeek: 0 = domingo … 6 = sábado (igual a Date.getDay()).
 * - Vários intervalos por dia são permitidos (ex.: pausa de almoço). Dia sem intervalos = fechado.
 *
 * Nenhuma função deste módulo acessa banco, relógio ou variáveis de ambiente:
 * o instante "agora" e o fuso são sempre parâmetros, o que torna o cálculo testável.
 */

export const MINUTES_PER_DAY = 1440;
export const MAX_INTERVALS_PER_DAY = 4;
export const DEFAULT_PHARMACY_TIMEZONE = 'America/Sao_Paulo';

export interface BusinessHourInterval {
  dayOfWeek: number;
  opensAt: number;
  closesAt: number;
}

export interface BusinessHourInput {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
}

export interface BusinessHourDto {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
}

export interface NextOpening {
  dayOfWeek: number;
  opensAt: string;
  isToday: boolean;
  isTomorrow: boolean;
}

export interface OpenStatus {
  isOpen: boolean;
  closesAt: string | null;
  nextOpening: NextOpening | null;
}

export type BusinessHoursErrorCode =
  | 'INVALID_TIME_FORMAT'
  | 'INVALID_DAY_OF_WEEK'
  | 'INVALID_INTERVAL'
  | 'OVERLAPPING_INTERVALS'
  | 'TOO_MANY_INTERVALS';

export class BusinessHoursValidationError extends Error {
  public readonly code: BusinessHoursErrorCode;

  constructor(code: BusinessHoursErrorCode, message: string) {
    super(message);
    this.name = 'BusinessHoursValidationError';
    this.code = code;
  }
}

const DAY_NAMES = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Converte "HH:MM" em minutos desde 00:00.
 * `allowEndOfDay` permite "24:00" (1440), válido apenas como horário de fechamento.
 */
export function parseTime(value: string, options: { allowEndOfDay?: boolean } = {}): number {
  if (typeof value === 'string') {
    if (options.allowEndOfDay && value === '24:00') {
      return MINUTES_PER_DAY;
    }
    const match = TIME_PATTERN.exec(value);
    if (match) {
      return Number(match[1]) * 60 + Number(match[2]);
    }
  }
  throw new BusinessHoursValidationError(
    'INVALID_TIME_FORMAT',
    `Horário inválido: "${String(value)}". Use o formato HH:MM (00:00 a 23:59${options.allowEndOfDay ? ', ou 24:00 no fechamento' : ''}).`
  );
}

/**
 * Converte minutos desde 00:00 em "HH:MM" (1440 → "24:00").
 */
export function formatTime(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > MINUTES_PER_DAY) {
    throw new RangeError(`Minutos fora do intervalo 0..${MINUTES_PER_DAY}: ${minutes}`);
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Indica se o identificador é um fuso horário IANA reconhecido pelo runtime (ex.: "America/Manaus").
 */
export function isValidTimezone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || timeZone.trim() === '') {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

function sortIntervals(intervals: BusinessHourInterval[]): BusinessHourInterval[] {
  return [...intervals].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.opensAt - b.opensAt);
}

/**
 * Valida uma grade semanal já em minutos: limites, fechamento > abertura,
 * no máximo 4 intervalos por dia e ausência de sobreposição no mesmo dia.
 * Intervalos encostados (ex.: 08:00–12:00 e 12:00–18:00) não são sobreposição.
 * Retorna a grade ordenada por dia e horário de abertura.
 */
export function validateWeeklySchedule(intervals: BusinessHourInterval[]): BusinessHourInterval[] {
  for (const interval of intervals) {
    if (!Number.isInteger(interval.dayOfWeek) || interval.dayOfWeek < 0 || interval.dayOfWeek > 6) {
      throw new BusinessHoursValidationError(
        'INVALID_DAY_OF_WEEK',
        `Dia da semana inválido: ${interval.dayOfWeek}. Use 0 (domingo) a 6 (sábado).`
      );
    }
    if (
      !Number.isInteger(interval.opensAt) ||
      !Number.isInteger(interval.closesAt) ||
      interval.opensAt < 0 ||
      interval.opensAt >= MINUTES_PER_DAY ||
      interval.closesAt > MINUTES_PER_DAY
    ) {
      throw new BusinessHoursValidationError(
        'INVALID_TIME_FORMAT',
        `Horário fora do intervalo permitido em ${DAY_NAMES[interval.dayOfWeek]}.`
      );
    }
    if (interval.closesAt <= interval.opensAt) {
      throw new BusinessHoursValidationError(
        'INVALID_INTERVAL',
        `Em ${DAY_NAMES[interval.dayOfWeek]}, o fechamento (${formatTime(interval.closesAt)}) deve ser depois da abertura (${formatTime(interval.opensAt)}).`
      );
    }
  }

  const sorted = sortIntervals(intervals);

  for (let day = 0; day < 7; day++) {
    const dayIntervals = sorted.filter((i) => i.dayOfWeek === day);
    if (dayIntervals.length > MAX_INTERVALS_PER_DAY) {
      throw new BusinessHoursValidationError(
        'TOO_MANY_INTERVALS',
        `Em ${DAY_NAMES[day]} há ${dayIntervals.length} intervalos; o máximo é ${MAX_INTERVALS_PER_DAY} por dia.`
      );
    }
    for (let i = 1; i < dayIntervals.length; i++) {
      const previous = dayIntervals[i - 1];
      const current = dayIntervals[i];
      if (current.opensAt < previous.closesAt) {
        throw new BusinessHoursValidationError(
          'OVERLAPPING_INTERVALS',
          `Em ${DAY_NAMES[day]}, os intervalos ${formatTime(previous.opensAt)}–${formatTime(previous.closesAt)} e ` +
            `${formatTime(current.opensAt)}–${formatTime(current.closesAt)} se sobrepõem.`
        );
      }
    }
  }

  return sorted;
}

/**
 * Converte a grade recebida pela API ("HH:MM") em minutos e valida.
 */
export function parseWeeklySchedule(hours: BusinessHourInput[]): BusinessHourInterval[] {
  const intervals = hours.map((h) => {
    if (!Number.isInteger(h.dayOfWeek) || h.dayOfWeek < 0 || h.dayOfWeek > 6) {
      throw new BusinessHoursValidationError(
        'INVALID_DAY_OF_WEEK',
        `Dia da semana inválido: ${h.dayOfWeek}. Use 0 (domingo) a 6 (sábado).`
      );
    }
    return {
      dayOfWeek: h.dayOfWeek,
      opensAt: parseTime(h.opensAt),
      closesAt: parseTime(h.closesAt, { allowEndOfDay: true })
    };
  });
  return validateWeeklySchedule(intervals);
}

/**
 * Formata a grade para a API, ordenada por dia e horário de abertura.
 */
export function toBusinessHourDtos(intervals: BusinessHourInterval[]): BusinessHourDto[] {
  return sortIntervals(intervals).map((i) => ({
    dayOfWeek: i.dayOfWeek,
    opensAt: formatTime(i.opensAt),
    closesAt: formatTime(i.closesAt)
  }));
}

/**
 * Dia da semana (0..6) e minutos desde 00:00 do instante `now` no fuso `timeZone`.
 * Usa Intl.DateTimeFormat, que considera horário de verão e regras históricas do fuso.
 */
export function getZonedDayAndMinutes(now: Date, timeZone: string): { dayOfWeek: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const dayOfWeek = WEEKDAY_INDEX[get('weekday')];
  // Alguns runtimes antigos devolvem "24" à meia-noite mesmo com h23.
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));

  return { dayOfWeek, minutes: hour * 60 + minute };
}

/**
 * Calcula se a farmácia está aberta em `now` (no fuso dela) e, se fechada,
 * qual a próxima abertura nos próximos 7 dias.
 *
 * - Aberta: `closesAt` é o fim do bloco contínuo atual (intervalos encostados no
 *   mesmo dia são unidos: 08:00–12:00 + 12:00–18:00 fecha às 18:00).
 * - Fechada: `nextOpening` aponta o próximo intervalo; `isToday`/`isTomorrow`
 *   ajudam a interface ("abre hoje às 14:00", "abre amanhã às 09:00").
 * - Sem horários cadastrados: fechada e sem próxima abertura.
 */
export function computeOpenStatus(intervals: BusinessHourInterval[], now: Date, timeZone: string): OpenStatus {
  if (intervals.length === 0) {
    return { isOpen: false, closesAt: null, nextOpening: null };
  }

  const zone = isValidTimezone(timeZone) ? timeZone : DEFAULT_PHARMACY_TIMEZONE;
  const { dayOfWeek: today, minutes } = getZonedDayAndMinutes(now, zone);
  const sorted = sortIntervals(intervals);
  const todayIntervals = sorted.filter((i) => i.dayOfWeek === today);

  const currentIndex = todayIntervals.findIndex((i) => i.opensAt <= minutes && minutes < i.closesAt);
  if (currentIndex >= 0) {
    let closesAt = todayIntervals[currentIndex].closesAt;
    for (let i = currentIndex + 1; i < todayIntervals.length && todayIntervals[i].opensAt === closesAt; i++) {
      closesAt = todayIntervals[i].closesAt;
    }
    return { isOpen: true, closesAt: formatTime(closesAt), nextOpening: null };
  }

  const laterToday = todayIntervals.find((i) => i.opensAt > minutes);
  if (laterToday) {
    return {
      isOpen: false,
      closesAt: null,
      nextOpening: { dayOfWeek: today, opensAt: formatTime(laterToday.opensAt), isToday: true, isTomorrow: false }
    };
  }

  // Procura nos dias seguintes; offset 7 = mesmo dia da semana na semana seguinte.
  for (let offset = 1; offset <= 7; offset++) {
    const day = (today + offset) % 7;
    const first = sorted.find((i) => i.dayOfWeek === day);
    if (first) {
      return {
        isOpen: false,
        closesAt: null,
        nextOpening: { dayOfWeek: day, opensAt: formatTime(first.opensAt), isToday: false, isTomorrow: offset === 1 }
      };
    }
  }

  /* istanbul ignore next -- inalcançável: há ao menos um intervalo válido (0..6) */
  return { isOpen: false, closesAt: null, nextOpening: null };
}
