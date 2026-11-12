import { Router } from 'express';
import { z } from 'zod';
import { AuthController } from '../controllers/auth.controller';
import { authLimiter } from '../middlewares/rate-limit.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const authController = new AuthController();

const loginSchema = {
  body: z.object({
    email: z.string().email('Formato de e-mail inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
    type: z.enum(['patient', 'pharmacy']).optional()
  })
};

const refreshSchema = {
  body: z.object({
    refreshToken: z.string().optional()
  }).optional()
};

const logoutSchema = {
  body: z.object({
    refreshToken: z.string().optional()
  }).optional()
};

const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email('Formato de e-mail inválido')
  })
};

const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, 'Token é obrigatório'),
    newPassword: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres')
  })
};

const verifyEmailSchema = {
  body: z.object({
    token: z.string().optional()
  }).optional(),
  query: z.object({
    token: z.string().optional()
  }).optional()
};

const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(1, 'Nova senha é obrigatória').max(128, 'A nova senha deve ter no máximo 128 caracteres')
  })
};

router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);
router.post('/refresh', validateRequest(refreshSchema), authController.refresh);
router.post('/logout', validateRequest(logoutSchema), authController.logout);
router.post('/forgot-password', authLimiter, validateRequest(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validateRequest(resetPasswordSchema), authController.resetPassword);
router.post('/verify-email', validateRequest(verifyEmailSchema), authController.verifyEmail);
router.get('/verify-email', validateRequest(verifyEmailSchema), authController.verifyEmail);

// Troca de senha pelo titular autenticado (qualquer papel). Limitada como as demais rotas de credencial.
router.post(
  '/change-password',
  authMiddleware,
  authLimiter,
  validateRequest(changePasswordSchema),
  authController.changePassword
);

export default router;
