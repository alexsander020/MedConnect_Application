import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { cleanDatabase } from './helpers/dbCleanup';
import { parsePriceToCents, formatPriceCentsToDecimal } from '../src/lib/money';
import { encryptCpf, decryptCpf, hashCpf, maskCpf, getCpfLastDigits } from '../src/lib/cpfCrypto';
import { PrescriptionStatus } from '@prisma/client';

describe('TAREFA 1.4 — Dinheiro e CPF', () => {
  describe('1. Aritmética Monetária Inteira (money.ts)', () => {
    it('Converte valores em string decimal para centavos sem float', () => {
      expect(parsePriceToCents('123.45')).toBe(12345);
      expect(parsePriceToCents('123,45')).toBe(12345);
      expect(parsePriceToCents('100')).toBe(10000);
      expect(parsePriceToCents('0.99')).toBe(99);
      expect(parsePriceToCents(150.50)).toBe(15050);
    });

    it('Formata centavos para representação decimal exata', () => {
      expect(formatPriceCentsToDecimal(12345)).toBe('123.45');
      expect(formatPriceCentsToDecimal(10000)).toBe('100.00');
      expect(formatPriceCentsToDecimal(99)).toBe('0.99');
      expect(formatPriceCentsToDecimal(5)).toBe('0.05');
    });

    it('Rejeita preços inválidos ou menores/iguais a zero', () => {
      expect(() => parsePriceToCents('0')).toThrow(/maior que zero/i);
      expect(() => parsePriceToCents('-50')).toThrow();
      expect(() => parsePriceToCents('abc')).toThrow(/Formato de preço inválido/i);
    });
  });

  describe('2. Criptografia e Máscara de CPF (cpfCrypto.ts)', () => {
    const rawCpf = '111.444.777-35';
    const cleanCpf = '11144477735';

    it('Criptografa e descriptografa com AES-256-GCM preservando integridade', () => {
      const encrypted = encryptCpf(rawCpf);
      expect(encrypted).not.toContain(cleanCpf);
      expect(encrypted.split(':')).toHaveLength(3); // iv : tag : ciphertext

      const decrypted = decryptCpf(encrypted);
      expect(decrypted).toBe(cleanCpf);
    });

    it('Gera hash determinístico HMAC-SHA256 para buscas sem expor o dado', () => {
      const hash1 = hashCpf(rawCpf);
      const hash2 = hashCpf(cleanCpf);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('Gera máscara para exibição mantendo apenas os dois últimos dígitos', () => {
      const lastDigits = getCpfLastDigits(rawCpf);
      expect(lastDigits).toBe('35');
      expect(maskCpf(lastDigits)).toBe('***.***.***-35');
    });
  });

  describe('3. Integração de API: Preço na Cotação e CPF no Cadastro', () => {
    beforeEach(async () => {
      await cleanDatabase(prisma);
    });

    afterAll(async () => {
      await cleanDatabase(prisma);
    });

    it('Cadastro de paciente valida CPF, armazena criptografado/hasheado e retorna mascarado', async () => {
      const validCpf = '111.444.777-35';

      const res = await request(app)
        .post('/api/users')
        .send({
          name: 'Mariana Teste CPF',
          email: 'mariana.cpf@test.com',
          password: 'Password123!',
          phone: '11999998888',
          address: 'Rua A, 123',
          cpf: validCpf
        });

      expect(res.status).toBe(201);
      // Retorna mascarado
      expect(res.body.cpf).toBe('***.***.***-35');
      expect(res.body.cpfEncrypted).toBeUndefined();
      expect(res.body.cpfHash).toBeUndefined();

      // Verifica dados no banco de dados
      const dbUser = await prisma.user.findUnique({ where: { email: 'mariana.cpf@test.com' } });
      expect(dbUser).toBeDefined();
      expect(dbUser?.cpfLastDigits).toBe('35');
      expect(dbUser?.cpfHash).toBe(hashCpf(validCpf));
      expect(dbUser?.cpfEncrypted).toBeDefined();
      expect(decryptCpf(dbUser!.cpfEncrypted!)).toBe('11144477735');
    });

    it('Rejeita cadastro com CPF duplicado retornando 409 Conflict', async () => {
      const validCpf = '111.444.777-35';

      // Primeiro cadastro
      await request(app)
        .post('/api/users')
        .send({
          name: 'Paciente Um',
          email: 'paciente.um@test.com',
          password: 'Password123!',
          cpf: validCpf
        });

      // Segundo cadastro com o mesmo CPF
      const duplicateRes = await request(app)
        .post('/api/users')
        .send({
          name: 'Paciente Dois',
          email: 'paciente.dois@test.com',
          password: 'Password123!',
          cpf: validCpf
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.error?.code).toBe('CPF_ALREADY_EXISTS');
    });

    it('Cotação com preço decimal aceita e devolve formato monetário e persiste priceCents', async () => {
      // Cria farmácia e paciente
      const pharmacy = await prisma.pharmacy.create({
        data: {
          name: 'Farmácia Preço',
          email: 'farmacia.preco@test.com',
          password: 'Password123!',
          cnpj: '77777777000107',
          verified: true
        }
      });

      const user = await prisma.user.create({
        data: {
          name: 'User Preço',
          email: 'user.preco@test.com',
          password: 'Password123!',
          role: 'PATIENT'
        }
      });

      const presc = await prisma.prescription.create({
        data: {
          patientId: user.id,
          fileUrl: 'https://test.com/p.pdf',
          status: PrescriptionStatus.PENDING
        }
      });

      const pharmToken = jwt.sign(
        { id: pharmacy.id, email: pharmacy.email, role: 'PHARMACY' },
        env.JWT_SECRET
      );

      const quoteRes = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${pharmToken}`)
        .send({
          prescriptionId: presc.id,
          price: '89.90',
          deliveryDays: 1
        });

      expect(quoteRes.status).toBe(201);
      expect(quoteRes.body.price).toBe('89.90');
      expect(quoteRes.body.priceCents).toBe(8990);

      // Confere persistência no banco
      const dbQuote = await prisma.quote.findUnique({ where: { id: quoteRes.body.id } });
      expect(dbQuote?.priceCents).toBe(8990);
    });
  });
});
