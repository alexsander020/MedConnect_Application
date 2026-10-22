import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { ehEmailValido, ehSenhaForte, ehCNPJValido } from '@medconnect/validation';

export class PharmacyController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, cnpj, phone, address, deliveryArea } = req.body;

      if (!name || !email || !password || !cnpj) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Nome, e-mail, senha e CNPJ são obrigatórios'
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

      if (!ehSenhaForte(password)) {
        res.status(400).json({
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Senha fraca. A senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, número e caractere especial.'
          }
        });
        return;
      }

      if (!ehCNPJValido(cnpj)) {
        res.status(400).json({
          error: {
            code: 'INVALID_CNPJ',
            message: 'CNPJ inválido. Verifique os 14 dígitos informados.'
          }
        });
        return;
      }

      const cleanCNPJ = String(cnpj).replace(/[^\d]+/g, '');
      const hashedPassword = await bcrypt.hash(password, 10);

      const pharmacy = await prisma.pharmacy.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          cnpj: cleanCNPJ,
          phone,
          address,
          deliveryArea,
          verified: false,
          emailVerified: false
        }
      });

      const { password: _, ...pharmacyWithoutPassword } = pharmacy;
      res.status(201).json(pharmacyWithoutPassword);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const isEmail = error?.meta?.target?.includes('email');
        res.status(409).json({
          error: {
            code: isEmail ? 'EMAIL_ALREADY_EXISTS' : 'CNPJ_ALREADY_EXISTS',
            message: isEmail ? 'E-mail já está cadastrado.' : 'CNPJ já está cadastrado.'
          }
        });
        return;
      }
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Erro ao criar farmácia. Verifique os dados.'
        }
      });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const pharmacies = await prisma.pharmacy.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          cnpj: true,
          phone: true,
          address: true,
          deliveryArea: true,
          verified: true,
          createdAt: true
        }
      });
      res.json(pharmacies);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar farmácias' } });
    }
  }
}
