import {
  BusinessHoursValidationError,
  BusinessHourInterval,
  computeOpenStatus,
  formatTime,
  getZonedDayAndMinutes,
  isValidTimezone,
  parseTime,
  parseWeeklySchedule,
  toBusinessHourDtos,
  validateWeeklySchedule
} from '../src/domain/businessHours';
import { generateProtocol, PROTOCOL_ALPHABET, SupportTicketService } from '../src/services/supportTicketService';
import { buildDailySeries, toDateKey } from '../src/services/adminOverviewService';

const SP = 'America/Sao_Paulo';

// Grade de referência: seg–sex 09:00–12:00 e 13:00–18:30 (pausa de almoço), sábado 09:00–13:00, domingo fechado
const WEEKDAY_SCHEDULE = [1, 2, 3, 4, 5].flatMap((day) => [
  { dayOfWeek: day, opensAt: '09:00', closesAt: '12:00' },
  { dayOfWeek: day, opensAt: '13:00', closesAt: '18:30' }
]);
const SCHEDULE_INPUT = [...WEEKDAY_SCHEDULE, { dayOfWeek: 6, opensAt: '09:00', closesAt: '13:00' }];
const SCHEDULE: BusinessHourInterval[] = parseWeeklySchedule(SCHEDULE_INPUT);

// São Paulo = UTC-3 (sem horário de verão desde 2019). 2026-11-10 é terça; 2026-11-14 é sábado.
const at = (isoUtc: string) => new Date(isoUtc);

function expectValidationError(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(BusinessHoursValidationError);
    expect((error as BusinessHoursValidationError).code).toBe(code);
    expect((error as Error).message.length).toBeGreaterThan(10);
    return;
  }
  throw new Error(`Esperava BusinessHoursValidationError(${code})`);
}

describe('FASE 6 — Domínio de horários de atendimento (src/domain/businessHours.ts)', () => {
  describe('parseTime / formatTime', () => {
    it('converte "HH:MM" em minutos desde 00:00', () => {
      expect(parseTime('00:00')).toBe(0);
      expect(parseTime('09:05')).toBe(545);
      expect(parseTime('18:30')).toBe(1110);
      expect(parseTime('23:59')).toBe(1439);
    });

    it('aceita "24:00" somente quando permitido (fechamento)', () => {
      expect(parseTime('24:00', { allowEndOfDay: true })).toBe(1440);
      expectValidationError(() => parseTime('24:00'), 'INVALID_TIME_FORMAT');
    });

    it.each(['9:00', '25:00', '12:60', '24:01', '', '12h30', ' 09:00', '09:00:00'])(
      'rejeita formato inválido %p',
      (value) => {
        expectValidationError(() => parseTime(value, { allowEndOfDay: true }), 'INVALID_TIME_FORMAT');
      }
    );

    it('rejeita valores que não são string', () => {
      expectValidationError(() => parseTime(900 as unknown as string), 'INVALID_TIME_FORMAT');
      expectValidationError(() => parseTime(null as unknown as string), 'INVALID_TIME_FORMAT');
    });

    it('formata minutos em "HH:MM" (1440 → "24:00")', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(545)).toBe('09:05');
      expect(formatTime(1439)).toBe('23:59');
      expect(formatTime(1440)).toBe('24:00');
    });

    it('formatTime rejeita minutos fora de 0..1440 ou não inteiros', () => {
      expect(() => formatTime(-1)).toThrow(RangeError);
      expect(() => formatTime(1441)).toThrow(RangeError);
      expect(() => formatTime(10.5)).toThrow(RangeError);
    });

    it('ida e volta preserva o valor', () => {
      for (const value of ['00:00', '07:45', '12:00', '23:59']) {
        expect(formatTime(parseTime(value))).toBe(value);
      }
    });
  });

  describe('isValidTimezone', () => {
    it('aceita identificadores IANA e rejeita inválidos', () => {
      expect(isValidTimezone('America/Sao_Paulo')).toBe(true);
      expect(isValidTimezone('America/Manaus')).toBe(true);
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('Mars/Phobos')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
      expect(isValidTimezone('   ')).toBe(false);
      expect(isValidTimezone(123)).toBe(false);
      expect(isValidTimezone(undefined)).toBe(false);
    });
  });

  describe('validateWeeklySchedule / parseWeeklySchedule', () => {
    it('aceita grade com pausa de almoço e sábado meio período, devolvendo ordenada', () => {
      const shuffled = [...SCHEDULE_INPUT].reverse();
      const result = parseWeeklySchedule(shuffled);
      expect(result).toHaveLength(11);
      expect(result[0]).toEqual({ dayOfWeek: 1, opensAt: 540, closesAt: 720 });
      expect(result[1]).toEqual({ dayOfWeek: 1, opensAt: 780, closesAt: 1110 });
      expect(result[result.length - 1]).toEqual({ dayOfWeek: 6, opensAt: 540, closesAt: 780 });
    });

    it('aceita grade vazia (farmácia sem horários = sempre fechada)', () => {
      expect(parseWeeklySchedule([])).toEqual([]);
    });

    it('aceita intervalos encostados (fim de um = início do outro) e fechamento 24:00', () => {
      const result = parseWeeklySchedule([
        { dayOfWeek: 2, opensAt: '08:00', closesAt: '12:00' },
        { dayOfWeek: 2, opensAt: '12:00', closesAt: '24:00' }
      ]);
      expect(result.map((i) => i.closesAt)).toEqual([720, 1440]);
    });

    it('mesmos horários em dias diferentes não são sobreposição', () => {
      expect(
        parseWeeklySchedule([
          { dayOfWeek: 1, opensAt: '09:00', closesAt: '18:00' },
          { dayOfWeek: 2, opensAt: '09:00', closesAt: '18:00' }
        ])
      ).toHaveLength(2);
    });

    it('rejeita fechamento antes ou igual à abertura', () => {
      expectValidationError(
        () => parseWeeklySchedule([{ dayOfWeek: 1, opensAt: '18:00', closesAt: '09:00' }]),
        'INVALID_INTERVAL'
      );
      expectValidationError(
        () => parseWeeklySchedule([{ dayOfWeek: 1, opensAt: '09:00', closesAt: '09:00' }]),
        'INVALID_INTERVAL'
      );
    });

    it('rejeita sobreposição no mesmo dia', () => {
      expectValidationError(
        () =>
          parseWeeklySchedule([
            { dayOfWeek: 3, opensAt: '09:00', closesAt: '13:00' },
            { dayOfWeek: 3, opensAt: '12:00', closesAt: '18:00' }
          ]),
        'OVERLAPPING_INTERVALS'
      );
    });

    it('rejeita intervalo duplicado (mesma abertura no mesmo dia)', () => {
      expectValidationError(
        () =>
          parseWeeklySchedule([
            { dayOfWeek: 4, opensAt: '09:00', closesAt: '10:00' },
            { dayOfWeek: 4, opensAt: '09:00', closesAt: '11:00' }
          ]),
        'OVERLAPPING_INTERVALS'
      );
    });

    it('rejeita intervalo contido em outro', () => {
      expectValidationError(
        () =>
          parseWeeklySchedule([
            { dayOfWeek: 5, opensAt: '08:00', closesAt: '20:00' },
            { dayOfWeek: 5, opensAt: '10:00', closesAt: '11:00' }
          ]),
        'OVERLAPPING_INTERVALS'
      );
    });

    it('rejeita mais de 4 intervalos no mesmo dia', () => {
      const five = ['06:00', '08:00', '10:00', '12:00', '14:00'].map((opensAt) => ({
        dayOfWeek: 1,
        opensAt,
        closesAt: formatTime(parseTime(opensAt) + 60)
      }));
      expectValidationError(() => parseWeeklySchedule(five), 'TOO_MANY_INTERVALS');
      expect(parseWeeklySchedule(five.slice(0, 4))).toHaveLength(4);
    });

    it.each([7, -1, 1.5, Number.NaN])('rejeita dayOfWeek inválido %p', (dayOfWeek) => {
      expectValidationError(
        () => parseWeeklySchedule([{ dayOfWeek, opensAt: '09:00', closesAt: '10:00' }]),
        'INVALID_DAY_OF_WEEK'
      );
    });

    it('rejeita "24:00" como abertura', () => {
      expectValidationError(
        () => parseWeeklySchedule([{ dayOfWeek: 1, opensAt: '24:00', closesAt: '24:00' }]),
        'INVALID_TIME_FORMAT'
      );
    });

    it('validateWeeklySchedule valida limites numéricos diretamente', () => {
      expectValidationError(() => validateWeeklySchedule([{ dayOfWeek: 9, opensAt: 0, closesAt: 60 }]), 'INVALID_DAY_OF_WEEK');
      expectValidationError(() => validateWeeklySchedule([{ dayOfWeek: 1, opensAt: 1440, closesAt: 1440 }]), 'INVALID_TIME_FORMAT');
      expectValidationError(() => validateWeeklySchedule([{ dayOfWeek: 1, opensAt: 0, closesAt: 1441 }]), 'INVALID_TIME_FORMAT');
      expectValidationError(() => validateWeeklySchedule([{ dayOfWeek: 1, opensAt: -5, closesAt: 60 }]), 'INVALID_TIME_FORMAT');
      expectValidationError(() => validateWeeklySchedule([{ dayOfWeek: 1, opensAt: 10.5, closesAt: 60 }]), 'INVALID_TIME_FORMAT');
    });

    it('toBusinessHourDtos formata e ordena por dia e abertura', () => {
      const dtos = toBusinessHourDtos([
        { dayOfWeek: 6, opensAt: 540, closesAt: 780 },
        { dayOfWeek: 1, opensAt: 780, closesAt: 1110 },
        { dayOfWeek: 1, opensAt: 540, closesAt: 720 }
      ]);
      expect(dtos).toEqual([
        { dayOfWeek: 1, opensAt: '09:00', closesAt: '12:00' },
        { dayOfWeek: 1, opensAt: '13:00', closesAt: '18:30' },
        { dayOfWeek: 6, opensAt: '09:00', closesAt: '13:00' }
      ]);
    });
  });

  describe('getZonedDayAndMinutes', () => {
    it('obtém dia da semana e minutos no fuso informado', () => {
      // 2026-11-10T13:00Z = terça 10:00 em São Paulo
      expect(getZonedDayAndMinutes(at('2026-11-10T13:00:00Z'), SP)).toEqual({ dayOfWeek: 2, minutes: 600 });
      // Mesmo instante em Tóquio (UTC+9) = terça 22:00
      expect(getZonedDayAndMinutes(at('2026-11-10T13:00:00Z'), 'Asia/Tokyo')).toEqual({ dayOfWeek: 2, minutes: 1320 });
    });

    it('meia-noite local é 0 minutos (nunca 1440)', () => {
      // 2026-11-10T03:00Z = terça 00:00 em São Paulo
      expect(getZonedDayAndMinutes(at('2026-11-10T03:00:00Z'), SP)).toEqual({ dayOfWeek: 2, minutes: 0 });
    });

    it('vira o dia conforme o fuso (UTC ainda terça, São Paulo segunda)', () => {
      // 2026-11-10T01:00Z = segunda 22:00 em São Paulo
      expect(getZonedDayAndMinutes(at('2026-11-10T01:00:00Z'), SP)).toEqual({ dayOfWeek: 1, minutes: 1320 });
    });
  });

  describe('computeOpenStatus', () => {
    it('aberta: informa o fechamento do intervalo atual', () => {
      // terça 10:00 SP
      expect(computeOpenStatus(SCHEDULE, at('2026-11-10T13:00:00Z'), SP)).toEqual({
        isOpen: true,
        closesAt: '12:00',
        nextOpening: null
      });
    });

    it('aberta no segundo turno: fecha às 18:30', () => {
      // terça 15:00 SP
      expect(computeOpenStatus(SCHEDULE, at('2026-11-10T18:00:00Z'), SP)).toEqual({
        isOpen: true,
        closesAt: '18:30',
        nextOpening: null
      });
    });

    it('fechada na pausa de almoço: próxima abertura é hoje', () => {
      // terça 12:30 SP
      expect(computeOpenStatus(SCHEDULE, at('2026-11-10T15:30:00Z'), SP)).toEqual({
        isOpen: false,
        closesAt: null,
        nextOpening: { dayOfWeek: 2, opensAt: '13:00', isToday: true, isTomorrow: false }
      });
    });

    it('fechada antes de abrir: próxima abertura é hoje cedo', () => {
      // terça 07:00 SP
      expect(computeOpenStatus(SCHEDULE, at('2026-11-10T10:00:00Z'), SP).nextOpening).toEqual({
        dayOfWeek: 2,
        opensAt: '09:00',
        isToday: true,
        isTomorrow: false
      });
    });

    it('depois do fechamento: próxima abertura é amanhã', () => {
      // terça 19:00 SP
      expect(computeOpenStatus(SCHEDULE, at('2026-11-10T22:00:00Z'), SP)).toEqual({
        isOpen: false,
        closesAt: null,
        nextOpening: { dayOfWeek: 3, opensAt: '09:00', isToday: false, isTomorrow: true }
      });
    });

    it('sábado após 13:00 pula o domingo fechado e aponta segunda', () => {
      // sábado 14:00 SP
      expect(computeOpenStatus(SCHEDULE, at('2026-11-14T17:00:00Z'), SP)).toEqual({
        isOpen: false,
        closesAt: null,
        nextOpening: { dayOfWeek: 1, opensAt: '09:00', isToday: false, isTomorrow: false }
      });
    });

    it('domingo: próxima abertura é segunda (amanhã)', () => {
      // domingo 10:00 SP (2026-11-15)
      expect(computeOpenStatus(SCHEDULE, at('2026-11-15T13:00:00Z'), SP).nextOpening).toEqual({
        dayOfWeek: 1,
        opensAt: '09:00',
        isToday: false,
        isTomorrow: true
      });
    });

    it('sem horários cadastrados: fechada e sem próxima abertura', () => {
      expect(computeOpenStatus([], at('2026-11-10T13:00:00Z'), SP)).toEqual({
        isOpen: false,
        closesAt: null,
        nextOpening: null
      });
    });

    it('limites: aberta exatamente na abertura, fechada exatamente no fechamento', () => {
      // terça 09:00 SP → aberta
      expect(computeOpenStatus(SCHEDULE, at('2026-11-10T12:00:00Z'), SP).isOpen).toBe(true);
      // terça 12:00 SP → fechada (almoço)
      expect(computeOpenStatus(SCHEDULE, at('2026-11-10T15:00:00Z'), SP).isOpen).toBe(false);
    });

    it('fechamento 24:00: aberta até o fim do dia', () => {
      const lateNight = parseWeeklySchedule([{ dayOfWeek: 2, opensAt: '18:00', closesAt: '24:00' }]);
      // terça 23:30 SP = quarta 02:30Z
      expect(computeOpenStatus(lateNight, at('2026-11-11T02:30:00Z'), SP)).toEqual({
        isOpen: true,
        closesAt: '24:00',
        nextOpening: null
      });
    });

    it('intervalos encostados são unidos no horário de fechamento', () => {
      const continuous = parseWeeklySchedule([
        { dayOfWeek: 2, opensAt: '08:00', closesAt: '12:00' },
        { dayOfWeek: 2, opensAt: '12:00', closesAt: '18:00' }
      ]);
      // terça 10:00 SP
      expect(computeOpenStatus(continuous, at('2026-11-10T13:00:00Z'), SP).closesAt).toBe('18:00');
    });

    it('farmácia que abre um único dia: próxima abertura é o mesmo dia na semana seguinte', () => {
      const mondayOnly = parseWeeklySchedule([{ dayOfWeek: 1, opensAt: '09:00', closesAt: '12:00' }]);
      // segunda 13:00 SP (2026-11-09)
      expect(computeOpenStatus(mondayOnly, at('2026-11-09T16:00:00Z'), SP).nextOpening).toEqual({
        dayOfWeek: 1,
        opensAt: '09:00',
        isToday: false,
        isTomorrow: false
      });
    });

    it('diferença de fuso: o mesmo instante tem status diferentes em São Paulo e Manaus', () => {
      const instant = at('2026-11-10T12:30:00Z'); // SP 09:30 (aberta) / Manaus 08:30 (fechada)
      expect(computeOpenStatus(SCHEDULE, instant, SP).isOpen).toBe(true);
      expect(computeOpenStatus(SCHEDULE, instant, 'America/Manaus')).toEqual({
        isOpen: false,
        closesAt: null,
        nextOpening: { dayOfWeek: 2, opensAt: '09:00', isToday: true, isTomorrow: false }
      });
    });

    it('fuso inválido cai no padrão America/Sao_Paulo', () => {
      expect(computeOpenStatus(SCHEDULE, at('2026-11-10T13:00:00Z'), 'Invalido/Fuso')).toEqual(
        computeOpenStatus(SCHEDULE, at('2026-11-10T13:00:00Z'), SP)
      );
    });
  });
});

describe('FASE 6 — Funções puras de suporte e visão geral', () => {
  it('generateProtocol segue o formato MC-AAAAMMDD-XXXXX com alfabeto sem ambíguos', () => {
    const protocol = generateProtocol(new Date('2026-11-12T15:00:00Z'));
    expect(protocol).toMatch(/^MC-20261112-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/);
    expect(PROTOCOL_ALPHABET).not.toMatch(/[01IO]/);
    expect(PROTOCOL_ALPHABET).toHaveLength(32);
  });

  it('generateProtocol usa a data de São Paulo (02:00Z ainda é o dia anterior)', () => {
    expect(generateProtocol(new Date('2026-11-12T02:00:00Z'))).toMatch(/^MC-20261111-/);
  });

  it('toPreview limita a 140 caracteres', () => {
    expect(SupportTicketService.toPreview('curta')).toBe('curta');
    const long = 'x'.repeat(300);
    const preview = SupportTicketService.toPreview(long);
    expect(preview).toHaveLength(140);
    expect(preview.endsWith('…')).toBe(true);
    expect(SupportTicketService.toPreview('y'.repeat(140))).toHaveLength(140);
  });

  it('statusLabel e isFinalStatus', () => {
    expect(SupportTicketService.statusLabel('IN_PROGRESS')).toBe('Em andamento');
    expect(SupportTicketService.isFinalStatus('RESOLVED')).toBe(true);
    expect(SupportTicketService.isFinalStatus('CLOSED')).toBe(true);
    expect(SupportTicketService.isFinalStatus('OPEN')).toBe(false);
  });

  it('buildDailySeries devolve 14 dias em ordem, incluindo dias zerados', () => {
    const now = new Date('2026-11-12T15:00:00Z');
    const series = buildDailySeries(
      [new Date('2026-11-12T13:00:00Z'), new Date('2026-11-12T14:00:00Z'), new Date('2026-11-01T12:00:00Z')],
      [new Date('2026-11-10T12:00:00Z'), new Date('2026-10-01T12:00:00Z')],
      now
    );
    expect(series).toHaveLength(14);
    expect(series[0].date).toBe('2026-10-30');
    expect(series[13]).toEqual({ date: '2026-11-12', prescriptions: 2, orders: 0 });
    expect(series.find((p) => p.date === '2026-11-01')).toEqual({ date: '2026-11-01', prescriptions: 1, orders: 0 });
    expect(series.find((p) => p.date === '2026-11-10')?.orders).toBe(1);
    // Fora da janela é ignorado
    expect(series.reduce((sum, p) => sum + p.orders, 0)).toBe(1);
  });

  it('buildDailySeries usa o dia de São Paulo (01:00Z conta no dia anterior)', () => {
    const series = buildDailySeries([new Date('2026-11-12T01:00:00Z')], [], new Date('2026-11-12T15:00:00Z'));
    expect(series.find((p) => p.date === '2026-11-11')?.prescriptions).toBe(1);
    expect(toDateKey(new Date('2026-11-12T01:00:00Z'))).toBe('2026-11-11');
  });
});
