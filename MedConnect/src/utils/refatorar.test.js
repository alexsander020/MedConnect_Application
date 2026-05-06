import { processar, formatar } from './refatorar.js';

describe('Refatoração', () => {
  describe('processar', () => {
    test('VIP com valor > 500 e resultado final <= 1000', () => {
      // 1000 * 0.8 = 800
      expect(processar(1000, 'VIP')).toBe(800);
    });

    test('VIP com valor > 500 e resultado final > 1000', () => {
      // 2000 * 0.8 = 1600. 1600 > 1000 -> 1600 - 50 = 1550
      expect(processar(2000, 'VIP')).toBe(1550);
    });

    test('VIP com valor <= 500', () => {
      // 400 * 0.9 = 360
      expect(processar(400, 'VIP')).toBe(360);
    });

    test('Não-VIP com valor > 500 e resultado final <= 1000', () => {
      // 1000 * 0.95 = 950
      expect(processar(1000, 'NORMAL')).toBe(950);
    });

    test('Não-VIP com valor > 500 e resultado final > 1000', () => {
      // 2000 * 0.95 = 1900. 1900 > 1000 -> 1900 - 50 = 1850
      expect(processar(2000, 'NORMAL')).toBe(1850);
    });

    test('Não-VIP com valor <= 500', () => {
      // 400 * 1 = 400
      expect(processar(400, 'NORMAL')).toBe(400);
    });
  });

  describe('formatar', () => {
    test('deve formatar valor inteiro', () => {
      expect(formatar(1550)).toBe('R$1550.00');
    });

    test('deve formatar valor com casas decimais', () => {
      expect(formatar(1550.5)).toBe('R$1550.50');
    });
  });
});
