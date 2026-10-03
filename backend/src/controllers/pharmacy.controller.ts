import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { ehEmailValido, ehSenhaForte, ehCNPJValido } from '@medconnect/validation';

export class PharmacyController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, cnpj, phone, address, deliveryArea } = req.body;

      if (!name || !email || !password || !cnpj) {
        res.status(400).json({ error: 'Nome, e-mail, senha e CNPJ são obrigatórios' });
        return;
      }

      if (!ehEmailValido(email)) {
        res.status(400).json({ error: 'Formato de e-mail inválido' });
        return;
      }

      if (!ehSenhaForte(password)) {
        res.status(400).json({
          error: 'Senha fraca. A senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, número e caractere especial.'
        });
        return;
      }

      if (!ehCNPJValido(cnpj)) {
        res.status(400).json({ error: 'CNPJ inválido. Verifique os 14 dígitos informados.' });
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
          deliveryArea
        }
      });
      
      const { password: _, ...pharmacyWithoutPassword } = pharmacy;
      res.status(201).json(pharmacyWithoutPassword);
    } catch (error: any) {
      console.error('Erro ao criar farmácia:', error?.message || error);
      // Erro de campo único (email ou CNPJ já cadastrado)
      if (error?.code === 'P2002') {
        const field = error?.meta?.target?.includes('email') ? 'E-mail' : 'CNPJ';
        res.status(400).json({ error: `${field} já está cadastrado.` });
        return;
      }
      res.status(400).json({ error: 'Erro ao criar farmácia. Verifique os dados.' });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const pharmacies = await prisma.pharmacy.findMany({
        select: { id: true, name: true, email: true, cnpj: true, phone: true, address: true, deliveryArea: true, createdAt: true }
      });
      res.json(pharmacies);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar farmácias' });
    }
  }
}
