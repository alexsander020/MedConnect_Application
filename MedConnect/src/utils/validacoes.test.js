import { ehEmailValido, ehCPFValido, ehSenhaForte } from './validacoes.js';

describe('Validações', () => {
  describe('ehEmailValido', () => {
    test('deve retornar true para email válido', () => {
      expect(ehEmailValido('teste@exemplo.com')).toBe(true);
    });

    test('deve retornar false para email sem @', () => {
      expect(ehEmailValido('testeexemplo.com')).toBe(false);
    });

    test('deve retornar false para email sem domínio', () => {
      expect(ehEmailValido('teste@')).toBe(false);
    });

    test('deve retornar false para email com caracteres inválidos', () => {
      expect(ehEmailValido('teste @exemplo.com')).toBe(false);
    });

    test('deve retornar false para email vazio', () => {
      expect(ehEmailValido('')).toBe(false);
    });
  });

  describe('ehCPFValido', () => {
    test('deve retornar true para CPF válido formatado', () => {
      // CPF gerado válido para teste
      expect(ehCPFValido('111.444.777-35')).toBe(true);
    });

    test('deve retornar true para CPF válido apenas números', () => {
      expect(ehCPFValido('11144477735')).toBe(true);
    });

    test('deve retornar false para CPF com todos os números iguais', () => {
      expect(ehCPFValido('111.111.111-11')).toBe(false);
    });

    test('deve retornar false para CPF incompleto', () => {
      expect(ehCPFValido('123.456.789')).toBe(false);
    });

    test('deve retornar false para CPF inválido (dígitos incorretos)', () => {
      expect(ehCPFValido('529.982.240-26')).toBe(false);
    });
  });

  describe('ehSenhaForte', () => {
    test('deve retornar true para senha que atende todos os requisitos', () => {
      expect(ehSenhaForte('SenhaForte1@')).toBe(true);
    });

    test('deve retornar false para senha com menos de 8 caracteres', () => {
      expect(ehSenhaForte('Senh1@')).toBe(false);
    });

    test('deve retornar false para senha sem letra maiúscula', () => {
      expect(ehSenhaForte('senhaforte1@')).toBe(false);
    });

    test('deve retornar false para senha sem número', () => {
      expect(ehSenhaForte('SenhaForte@')).toBe(false);
    });

    test('deve retornar false para senha sem caractere especial', () => {
      expect(ehSenhaForte('SenhaForte123')).toBe(false);
    });
  });
});
