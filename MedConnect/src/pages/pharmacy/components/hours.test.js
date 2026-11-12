import { draftFromHours, draftToPayload, normalizeTime, suggestNextInterval, validateDay, copyDayTo } from './hours';

const day = (...intervals) => ({ open: true, intervals: intervals.map(([opensAt, closesAt], i) => ({ id: `t${i}`, opensAt, closesAt })) });

describe('hours (espelho de backend/src/domain/businessHours.ts)', () => {
  it('aceita intervalos encostados e 24:00 como fechamento', () => {
    expect(validateDay(day(['08:00', '12:00'], ['12:00', '24:00'])).every((e) => !e)).toBe(true);
  });

  it('marca só o intervalo que invade, sem culpar os válidos', () => {
    const errs = validateDay(day(['08:00', '12:00'], ['13:00', '18:30'], ['11:00', '23:30']));
    expect(errs[0]).toBeNull();
    expect(errs[1]).toBeNull();
    expect(errs[2].interval).toMatch(/se sobrepõe ao das 08:00–12:00/);
  });

  it('detecta sobreposição mesmo fora de ordem e contra um intervalo longo anterior', () => {
    const errs = validateDay(day(['11:00', '12:00'], ['08:00', '18:00'], ['14:00', '15:00']));
    expect(errs[0].interval).toMatch(/se sobrepõe ao das 08:00–18:00/);
    expect(errs[2].interval).toMatch(/se sobrepõe ao das 08:00–18:00/);
    expect(errs[1]).toBeNull();
  });

  it('rejeita 24:00 na abertura, formato inválido e fechamento <= abertura', () => {
    const errs = validateDay(day(['24:00', '24:00'], ['9h', '10:00'], ['10:00', '10:00']));
    expect(errs[0].opensAt).toMatch(/24:00 só vale como fechamento/);
    expect(errs[1].opensAt).toMatch(/HH:MM/);
    expect(errs[2].interval).toMatch(/depois da abertura/);
  });

  it('dia fechado não valida nem entra no payload', () => {
    const draft = draftFromHours([{ dayOfWeek: 1, opensAt: '09:00', closesAt: '18:00' }], 'America/Manaus');
    expect(validateDay(draft.days[0])).toEqual([]);
    expect(draftToPayload(draft)).toEqual({ timezone: 'America/Manaus', hours: [{ dayOfWeek: 1, opensAt: '09:00', closesAt: '18:00' }] });
  });

  it('copia um dia para os dias úteis e ordena o payload por dia e abertura', () => {
    const draft = draftFromHours([{ dayOfWeek: 1, opensAt: '14:00', closesAt: '18:00' }, { dayOfWeek: 1, opensAt: '08:00', closesAt: '12:00' }]);
    const hours = draftToPayload(copyDayTo(draft, 1)).hours;
    expect(hours).toHaveLength(10);
    expect(hours.slice(0, 2)).toEqual([
      { dayOfWeek: 1, opensAt: '08:00', closesAt: '12:00' },
      { dayOfWeek: 1, opensAt: '14:00', closesAt: '18:00' },
    ]);
    expect(new Set(hours.map((h) => h.dayOfWeek))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('normaliza o que foi digitado e sugere o próximo intervalo', () => {
    expect(normalizeTime('9')).toBe('09:00');
    expect(normalizeTime('930')).toBe('09:30');
    expect(normalizeTime('18:3')).toBe('18:30');
    expect(normalizeTime('2400')).toBe('24:00');
    expect(suggestNextInterval([{ opensAt: '08:00', closesAt: '12:00' }])).toEqual({ opensAt: '13:00', closesAt: '17:00' });
    expect(suggestNextInterval([{ opensAt: '18:00', closesAt: '23:30' }])).toEqual({ opensAt: '23:30', closesAt: '24:00' });
    expect(suggestNextInterval([{ opensAt: '10:00', closesAt: '24:00' }])).toEqual({ opensAt: '06:00', closesAt: '10:00' });
  });
});
