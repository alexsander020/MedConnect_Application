import 'dotenv/config';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'medconnect_super_secret_key';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, type } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
        return;
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      
      let userOrPharmacy: any = null;
      let role = '';

      if (type === 'pharmacy') {
        userOrPharmacy = await prisma.pharmacy.findUnique({ where: { email: normalizedEmail } });
        role = 'PHARMACY';
      } else {
        userOrPharmacy = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        role = userOrPharmacy?.role || 'PATIENT';
      }

      if (!userOrPharmacy) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }

      const validPassword = await bcrypt.compare(password, userOrPharmacy.password);
      if (!validPassword) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }

      const token = jwt.sign(
        { id: userOrPharmacy.id, email: userOrPharmacy.email, role },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      res.json({
        token,
        user: {
          id: userOrPharmacy.id,
          name: userOrPharmacy.name,
          email: userOrPharmacy.email,
          role
        }
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ error: 'Erro no login' });
    }
  }
}
