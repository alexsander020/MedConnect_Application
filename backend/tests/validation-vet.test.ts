import {
  validarCrmv,
  validarPesoGramas,
  UFS_BRASIL,
  ESPECIES_ANIMAIS
} from '@medconnect/validation';

describe('TAREFA 2.2 — Validação Compartilhada Veterinária (@medconnect/validation)', () => {
  describe('Constantes regulatórias', () => {
    it('deve conter as 27 UFs do Brasil', () => {
      expect(UFS_BRASIL).toHaveLength(27);
      expect(UFS_BRASIL).toContain('SP');
      expect(UFS_BRASIL).toContain('RJ');
      expect(UFS_BRASIL).toContain('DF');
    });

    it('deve conter a lista fechada de espécies animais', () => {
      expect(ESPECIES_ANIMAIS).toEqual([
        'DOG',
        'CAT',
        'BIRD',
        'REPTILE',
        'SMALL_MAMMAL',
        'EQUINE',
        'OTHER'
      ]);
    });
  });

  describe('validarCrmv (formato)', () => {
    it('deve aceitar formatos de CRMV válidos com UF', () => {
      expect(validarCrmv('12345', 'SP')).toBe(true);
      expect(validarCrmv('12345-SP')).toBe(true);
      expect(validarCrmv('CRMV-SP 12345')).toBe(true);
      expect(validarCrmv('CRMV/MG 9876543')).toBe(true);
      expect(validarCrmv('1', 'RJ')).toBe(true);
      expect(validarCrmv(54321, 'RS')).toBe(true);
    });

    it('deve rejeitar CRMV com UF inválida ou inexistente', () => {
      expect(validarCrmv('12345', 'XX')).toBe(false);
      expect(validarCrmv('12345-ZZ')).toBe(false);
      expect(validarCrmv('12345', '')).toBe(false);
      expect(validarCrmv('12345', null)).toBe(false);
    });

    it('deve rejeitar CRMV sem número ou com mais de 7 dígitos', () => {
      expect(validarCrmv('', 'SP')).toBe(false);
      expect(validarCrmv('SP-CRMV', 'SP')).toBe(false);
      expect(validarCrmv('12345678', 'SP')).toBe(false); // 8 dígitos
      expect(validarCrmv(null, 'SP')).toBe(false);
      expect(validarCrmv(undefined, 'SP')).toBe(false);
    });
  });

  describe('validarPesoGramas', () => {
    it('deve aceitar pesos plausíveis para diferentes espécies (em gramas)', () => {
      expect(validarPesoGramas(50)).toBe(true); // Ave pequena (50g)
      expect(validarPesoGramas(4200)).toBe(true); // Gato (4.2 kg)
      expect(validarPesoGramas(35000)).toBe(true); // Cão grande (35 kg)
      expect(validarPesoGramas(600000)).toBe(true); // Equino (600 kg)
      expect(validarPesoGramas('15000')).toBe(true); // String numérica inteira
    });

    it('deve rejeitar pesos abaixo do mínimo ou acima do máximo configurado', () => {
      expect(validarPesoGramas(0)).toBe(false);
      expect(validarPesoGramas(-100)).toBe(false);
      expect(validarPesoGramas(5)).toBe(false); // < 10g
      expect(validarPesoGramas(2000000)).toBe(false); // > 1.500.000g (1.5 toneladas)
    });

    it('deve rejeitar pesos não inteiros ou inválidos', () => {
      expect(validarPesoGramas(12.5)).toBe(false); // Exige inteiro em gramas (padrão D5)
      expect(validarPesoGramas('dez quilos')).toBe(false);
      expect(validarPesoGramas(null)).toBe(false);
      expect(validarPesoGramas(undefined)).toBe(false);
    });
  });
});
