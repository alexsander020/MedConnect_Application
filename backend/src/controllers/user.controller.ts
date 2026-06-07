import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

export class UserController {
  async create(req: Request, res: Response) {
    try {
      const { name, email, password, role, phone, address } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          phone,
          address
        }
      });
      
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Erro no create user:', error);
      res.status(400).json({ error: 'Erro ao criar usuário', details: error });
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
