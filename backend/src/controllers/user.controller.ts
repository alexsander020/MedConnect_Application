import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { ehEmailValido, ehSenhaForte, ehCPFValido } from '@medconnect/validation';
import { encryptCpf, hashCpf, getCpfLastDigits, maskCpf } from '../lib/cpfCrypto';

export class UserController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, phone, address, cpf } = req.body;

      if (!name || !email || !password || !cpf) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Nome, e-mail, senha e CPF são obrigatórios'
          }
        });
        return;
      }

      if (!ehEmailValido(email)) {
        res.status(400).json({
          error: {
            code: 'INVALID_EMAIL',
            message: 'Formato de e-mail inválido'
          }
        });
        return;
      }

      if (!ehCPFValido(cpf)) {
        res.status(400).json({
          error: {
            code: 'INVALID_CPF',
            message: 'CPF inválido. Verifique os 11 dígitos informados.'
          }
        });
        return;
      }

      if (!ehSenhaForte(password)) {
        res.status(400).json({
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Senha fraca. A senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, número e caractere especial.'
          }
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const cleanEmail = email.trim().toLowerCase();

      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          role: 'PATIENT',
          phone,
          address,
          cpfEncrypted: encryptCpf(cpf),
          cpfHash: hashCpf(cpf),
          cpfLastDigits: getCpfLastDigits(cpf),
          emailVerified: false
        }
      });

      const { password: _, cpfEncrypted: __, cpfHash: ___, ...userWithoutSecrets } = user;
      res.status(201).json({
        ...userWithoutSecrets,
        cpf: maskCpf(user.cpfLastDigits!)
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const target = String(error?.meta?.target || '');
        if (target.includes('cpfHash')) {
          res.status(409).json({
            error: {
              code: 'CPF_ALREADY_EXISTS',
              message: 'CPF já cadastrado na plataforma.'
            }
          });
          return;
        }
        res.status(409).json({
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'E-mail já cadastrado na plataforma.'
          }
        });
        return;
      }
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Erro ao criar usuário. Verifique os dados fornecidos.'
        }
      });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          address: true,
          cpfLastDigits: true,
          emailVerified: true,
          createdAt: true
        }
      });

      const formatted = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        address: u.address,
        cpf: u.cpfLastDigits ? maskCpf(u.cpfLastDigits) : null,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt
      }));

      res.json(formatted);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar usuários' } });
    }
  }
}
