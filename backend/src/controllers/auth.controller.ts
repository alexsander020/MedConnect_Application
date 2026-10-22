import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ehSenhaForte } from '@medconnect/validation';
import {
  generateAccessToken,
  generateRefreshTokenData,
  hashToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie
} from '../lib/authTokens';
import { emailSender } from '../services/email';

// Hash fictício pré-computado para comparação em tempo constante contra enumeração de contas
const DUMMY_HASH = bcrypt.hashSync('dummy_password_constant_time_defense_secret', 10);

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, type } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'E-mail e senha são obrigatórios' } });
        return;
      }

      const normalizedEmail = String(email).trim().toLowerCase();

      let account: any = null;
      let role = '';
      let isPharmacy = false;

      if (type === 'pharmacy') {
        account = await prisma.pharmacy.findUnique({ where: { email: normalizedEmail } });
        role = 'PHARMACY';
        isPharmacy = true;
      } else {
        account = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        role = account?.role || 'PATIENT';
      }

      // Prevenção contra enumeração de contas por tempo de resposta:
      // Se a conta não existir, executa comparação com hash fictício para manter tempo idêntico
      const passwordToCompare = account ? account.password : DUMMY_HASH;
      const validPassword = await bcrypt.compare(password, passwordToCompare);

      if (!account || !validPassword) {
        res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' } });
        return;
      }

      // Gera tokens (Access Token 15m + Refresh Token rotativo)
      const accessToken = generateAccessToken({ id: account.id, email: account.email, role });
      const refreshData = generateRefreshTokenData();

      await prisma.refreshToken.create({
        data: {
          userId: !isPharmacy ? account.id : null,
          pharmacyId: isPharmacy ? account.id : null,
          tokenHash: refreshData.tokenHash,
          familyId: refreshData.familyId,
          expiresAt: refreshData.expiresAt
        }
      });

      setRefreshTokenCookie(res, refreshData.rawToken);

      res.json({
        token: accessToken,
        accessToken,
        user: {
          id: account.id,
          name: account.name,
          email: account.email,
          role
        }
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro durante o login' } });
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!rawToken) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Refresh token não fornecido' } });
        return;
      }

      const tokenHash = hashToken(rawToken);

      const existingToken = await prisma.refreshToken.findUnique({
        where: { tokenHash }
      });

      if (!existingToken) {
        clearRefreshTokenCookie(res);
        res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token inválido' } });
        return;
      }

      // DETECÇÃO DE REUSO DE TOKEN:
      // Se o token já estiver revogado, significa que houve tentativa de reuso malicioso!
      // Revoga imediatamente toda a família de tokens associada
      if (existingToken.isRevoked) {
        await prisma.refreshToken.updateMany({
          where: { familyId: existingToken.familyId },
          data: { isRevoked: true }
        });
        clearRefreshTokenCookie(res);
        res.status(401).json({
          error: {
            code: 'TOKEN_REUSE_DETECTED',
            message: 'Tentativa de reuso de sessão detectada. Todas as sessões foram invalidadas por segurança.'
          }
        });
        return;
      }

      // Verifica expiração
      if (existingToken.expiresAt < new Date()) {
        await prisma.refreshToken.update({
          where: { id: existingToken.id },
          data: { isRevoked: true }
        });
        clearRefreshTokenCookie(res);
        res.status(401).json({ error: { code: 'REFRESH_TOKEN_EXPIRED', message: 'Sessão expirada' } });
        return;
      }

      // Recupera os dados da conta (User ou Pharmacy)
      let account: any = null;
      let role = '';

      if (existingToken.userId) {
        account = await prisma.user.findUnique({ where: { id: existingToken.userId } });
        role = account?.role || 'PATIENT';
      } else if (existingToken.pharmacyId) {
        account = await prisma.pharmacy.findUnique({ where: { id: existingToken.pharmacyId } });
        role = 'PHARMACY';
      }

      if (!account) {
        clearRefreshTokenCookie(res);
        res.status(401).json({ error: { code: 'ACCOUNT_NOT_FOUND', message: 'Conta vinculada não encontrada' } });
        return;
      }

      // ROTAÇÃO ATÔMICA DO REFRESH TOKEN:
      // 1. Marca o token atual como revogado
      // 2. Cria o novo token com o mesmo familyId
      const newRefreshData = generateRefreshTokenData(existingToken.familyId);

      await prisma.$transaction([
        prisma.refreshToken.update({
          where: { id: existingToken.id },
          data: { isRevoked: true }
        }),
        prisma.refreshToken.create({
          data: {
            userId: existingToken.userId,
            pharmacyId: existingToken.pharmacyId,
            tokenHash: newRefreshData.tokenHash,
            familyId: existingToken.familyId,
            expiresAt: newRefreshData.expiresAt
          }
        })
      ]);

      const newAccessToken = generateAccessToken({ id: account.id, email: account.email, role });
      setRefreshTokenCookie(res, newRefreshData.rawToken);

      res.json({
        token: newAccessToken,
        accessToken: newAccessToken,
        user: {
          id: account.id,
          name: account.name,
          email: account.email,
          role
        }
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao renovar token de acesso' } });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (rawToken) {
        const tokenHash = hashToken(rawToken);
        const token = await prisma.refreshToken.findUnique({ where: { tokenHash } });
        if (token) {
          // Invalida toda a família do token
          await prisma.refreshToken.updateMany({
            where: { familyId: token.familyId },
            data: { isRevoked: true }
          });
        }
      }

      clearRefreshTokenCookie(res);
      res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao realizar logout' } });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'E-mail é obrigatório' } });
        return;
      }

      const normalizedEmail = String(email).trim().toLowerCase();

      // Busca sem revelar a existência do usuário
      const [user, pharmacy] = await Promise.all([
        prisma.user.findUnique({ where: { email: normalizedEmail } }),
        prisma.pharmacy.findUnique({ where: { email: normalizedEmail } })
      ]);

      const targetAccount = user || pharmacy;

      if (targetAccount) {
        const rawResetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(rawResetToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora de validade

        await prisma.passwordResetToken.create({
          data: {
            email: normalizedEmail,
            tokenHash,
            expiresAt
          }
        });

        // Dispara e-mail via EmailSender
        await emailSender.sendEmail({
          to: normalizedEmail,
          subject: 'Recuperação de Senha - MedConnect',
          text: `Olá ${targetAccount.name},\n\nPara redefinir sua senha, utilize o token: ${rawResetToken}\nEste token expira em 1 hora.\n\nSe você não solicitou, ignore este e-mail.`
        });
      } else {
        // Simulação de tempo para evitar enumeração de contas
        await bcrypt.compare('dummy', DUMMY_HASH);
      }

      // Resposta IDÊNTICA para e-mail existente e inexistente
      res.json({
        message: 'Se o e-mail informado estiver cadastrado, as instruções para redefinição de senha foram enviadas.'
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao processar recuperação de senha' } });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Token e nova senha são obrigatórios'
          }
        });
        return;
      }

      if (!ehSenhaForte(newPassword)) {
        res.status(400).json({
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Senha fraca. A senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, número e caractere especial.'
          }
        });
        return;
      }

      const tokenHash = hashToken(token);

      const resetTokenRecord = await prisma.passwordResetToken.findUnique({
        where: { tokenHash }
      });

      if (!resetTokenRecord || resetTokenRecord.used || resetTokenRecord.expiresAt < new Date()) {
        res.status(400).json({
          error: {
            code: 'INVALID_OR_EXPIRED_TOKEN',
            message: 'Token de recuperação inválido ou expirado'
          }
        });
        return;
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Atualiza senha e marca token como usado
      await prisma.$transaction(async (tx) => {
        await tx.passwordResetToken.update({
          where: { id: resetTokenRecord.id },
          data: { used: true }
        });

        const user = await tx.user.findUnique({ where: { email: resetTokenRecord.email } });
        if (user) {
          await tx.user.update({
            where: { id: user.id },
            data: { password: newPasswordHash }
          });
          // Revoga sessões antigas
          await tx.refreshToken.updateMany({
            where: { userId: user.id },
            data: { isRevoked: true }
          });
          return;
        }

        const pharmacy = await tx.pharmacy.findUnique({ where: { email: resetTokenRecord.email } });
        if (pharmacy) {
          await tx.pharmacy.update({
            where: { id: pharmacy.id },
            data: { password: newPasswordHash }
          });
          // Revoga sessões antigas
          await tx.refreshToken.updateMany({
            where: { pharmacyId: pharmacy.id },
            data: { isRevoked: true }
          });
        }
      });

      res.json({ message: 'Senha redefinida com sucesso. Faça login com sua nova credencial.' });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao redefinir senha' } });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const token = (req.body?.token || req.query?.token) as string;

      if (!token) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Token de verificação é obrigatório' } });
        return;
      }

      const tokenHash = hashToken(token);

      const verificationRecord = await prisma.emailVerificationToken.findUnique({
        where: { tokenHash }
      });

      if (!verificationRecord || verificationRecord.used || verificationRecord.expiresAt < new Date()) {
        res.status(400).json({
          error: {
            code: 'INVALID_OR_EXPIRED_TOKEN',
            message: 'Token de verificação inválido ou expirado'
          }
        });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.emailVerificationToken.update({
          where: { id: verificationRecord.id },
          data: { used: true }
        });

        const user = await tx.user.findUnique({ where: { email: verificationRecord.email } });
        if (user) {
          await tx.user.update({
            where: { id: user.id },
            data: { emailVerified: true }
          });
          return;
        }

        const pharmacy = await tx.pharmacy.findUnique({ where: { email: verificationRecord.email } });
        if (pharmacy) {
          await tx.pharmacy.update({
            where: { id: pharmacy.id },
            data: { emailVerified: true }
          });
        }
      });

      res.json({ message: 'E-mail verificado com sucesso.' });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao verificar e-mail' } });
    }
  }
}
