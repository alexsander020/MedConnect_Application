import { Router } from 'express';
import { z } from 'zod';
import { SupportController } from '../controllers/support.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.middleware';
import { supportTicketLimiter } from '../middlewares/rate-limit.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';

const router = Router();
const supportController = new SupportController();

const createTicketSchema = {
  body: z.object({
    name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(120, 'Nome deve ter no máximo 120 caracteres').optional(),
    email: z.string().trim().toLowerCase().email('Formato de e-mail inválido').max(254).optional(),
    category: z
      .enum(['GENERAL', 'ORDER', 'PRESCRIPTION', 'PHARMACY_ONBOARDING', 'PRIVACY', 'TECHNICAL'], {
        error: 'Categoria inválida'
      })
      .optional(),
    subject: z.string().trim().min(3, 'Assunto deve ter no mínimo 3 caracteres').max(160, 'Assunto deve ter no máximo 160 caracteres'),
    message: z.string().trim().min(10, 'Mensagem deve ter no mínimo 10 caracteres').max(5000, 'Mensagem deve ter no máximo 5000 caracteres')
  })
};

// Abertura de chamado: pública, com Bearer opcional e rate limit próprio por IP
router.post(
  '/tickets',
  supportTicketLimiter,
  optionalAuthMiddleware,
  validateRequest(createTicketSchema),
  supportController.createTicket
);

// Chamados do titular autenticado (qualquer papel)
router.get('/tickets/my', authMiddleware, supportController.getMyTickets);

export default router;
