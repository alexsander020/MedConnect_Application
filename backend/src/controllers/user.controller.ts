import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { ehEmailValido, ehSenhaForte, ehCPFValido } from '@medconnect/validation';
import { encryptCpf, hashCpf, getCpfLastDigits, maskCpf } from '../lib/cpfCrypto';
import { encryptField, decryptFieldSafe, getCurrentKeyId } from '../lib/fieldEncryption';
import { ConsentService } from '../services/consentService';
import { sendVerificationEmail } from '../services/emailVerificationService';
import { AuthRequest } from '../middlewares/auth.middleware';

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
      const currentKeyId = getCurrentKeyId();

      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          role: 'PATIENT',
          phone: phone ? encryptField(phone, currentKeyId) : null,
          address: address ? encryptField(address, currentKeyId) : null,
          keyId: currentKeyId,
          cpfEncrypted: encryptCpf(cpf),
          cpfHash: hashCpf(cpf),
          cpfLastDigits: getCpfLastDigits(cpf),
          emailVerified: false
        }
      });

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

      // Se o usuário não recusou expressamente, registra consentimento de saúde versionado
      const explicitOptOut = req.body.healthConsent === false || req.body.consent === false;
      if (!explicitOptOut) {
        await ConsentService.recordConsent({
          userId: user.id,
          userType: 'PATIENT',
          consentType: 'HEALTH_DATA_PROCESSING',
          ipAddress: clientIp,
          userAgent: req.headers['user-agent']
        });
      }

      // Aceite versionado dos Termos de Uso e da Política de Privacidade
      if (req.body.termsAccepted !== false) {
        await ConsentService.recordConsent({
          userId: user.id,
          userType: 'PATIENT',
          consentType: 'TERMS_AND_PRIVACY',
          ipAddress: clientIp,
          userAgent: req.headers['user-agent']
        });
      }

      const { password: _, cpfEncrypted: __, cpfHash: ___, ...userWithoutSecrets } = user;
      await sendVerificationEmail(user.email, user.name);

      res.status(201).json({
        ...userWithoutSecrets,
        phone: decryptFieldSafe(user.phone),
        address: decryptFieldSafe(user.address),
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

      const formatted = users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: decryptFieldSafe(u.phone),
        address: decryptFieldSafe(u.address),
        cpf: u.cpfLastDigits ? maskCpf(u.cpfLastDigits) : null,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt
      }));

      res.json(formatted);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar usuários' } });
    }
  }

  /**
   * Perfil do próprio titular (paciente ou admin). CPF sempre mascarado.
   */
  async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const profile = await buildOwnProfile(req.user!.id);
      if (!profile) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Usuário não encontrado' } });
        return;
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao carregar perfil' } });
    }
  }

  /**
   * Atualização parcial do próprio perfil: nome, telefone e endereço (estes dois cifrados em repouso).
   * E-mail, CPF e papel não são editáveis por esta rota.
   */
  async updateMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const existing = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true } });
      if (!existing) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Usuário não encontrado' } });
        return;
      }

      const { name, phone, address } = req.body as { name?: string; phone?: string | null; address?: string | null };
      const currentKeyId = getCurrentKeyId();
      const data: Record<string, unknown> = {};

      if (name !== undefined) data.name = name;
      if (phone !== undefined) data.phone = phone ? encryptField(phone, currentKeyId) : null;
      if (address !== undefined) data.address = address ? encryptField(address, currentKeyId) : null;
      if (data.phone || data.address) data.keyId = currentKeyId;

      if (Object.keys(data).length > 0) {
        await prisma.user.update({ where: { id: existing.id }, data });
      }

      res.json(await buildOwnProfile(existing.id));
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar perfil' } });
    }
  }
}

/**
 * Monta o formato de GET/PATCH /users/me.
 */
async function buildOwnProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      cpfLastDigits: true,
      status: true,
      emailVerified: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { prescriptions: true, reviews: true } }
    }
  });
  if (!user) return null;

  const orders = await prisma.order.count({ where: { quote: { prescription: { patientId: userId } } } });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: decryptFieldSafe(user.phone) ?? null,
    address: decryptFieldSafe(user.address) ?? null,
    cpf: user.cpfLastDigits ? maskCpf(user.cpfLastDigits) : null,
    status: user.status,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    counts: {
      prescriptions: user._count.prescriptions,
      orders,
      reviews: user._count.reviews
    }
  };
}
