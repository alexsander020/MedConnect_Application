import { Router } from 'express';
import { z } from 'zod';
import { AuthController } from '../controllers/auth.controller';
import { authLimiter } from '../middlewares/rate-limit.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';

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

router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);
router.post('/refresh', validateRequest(refreshSchema), authController.refresh);
router.post('/logout', validateRequest(logoutSchema), authController.logout);
router.post('/forgot-password', authLimiter, validateRequest(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validateRequest(resetPasswordSchema), authController.resetPassword);
router.post('/verify-email', validateRequest(verifyEmailSchema), authController.verifyEmail);
router.get('/verify-email', validateRequest(verifyEmailSchema), authController.verifyEmail);

export default router;
