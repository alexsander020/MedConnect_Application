import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { ehEmailValido, ehSenhaForte } from '@medconnect/validation';

export class UserController {
  async create(req: Request, res: Response) {
    try {
      const { name, email, password, phone, address } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
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

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          role: 'PATIENT',
          phone,
          address
        }
      });
      
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      console.error('Erro no create user:', error?.message || error);
      if (error?.code === 'P2002') {
        res.status(400).json({ error: 'E-mail já está cadastrado.' });
        return;
      }
      res.status(400).json({ error: 'Erro ao criar usuário. Verifique os dados.' });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, phone: true, address: true, createdAt: true }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
  }
}
