import { Router } from 'express';
import { z } from 'zod';
import { QuoteController } from '../controllers/quote.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';

const router = Router();
const quoteController = new QuoteController();

const createQuoteSchema = {
  body: z.object({
    prescriptionId: z.string().min(1, 'ID da receita é obrigatório'),
    price: z.union([z.string().min(1), z.number().positive()]),
    deliveryDays: z.union([z.number().int().nonnegative(), z.string()]).optional(),
    notes: z.string().optional()
  })
};

// Apenas farmácias podem enviar cotações
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['PHARMACY']),
  validateRequest(createQuoteSchema),
  quoteController.create
);
router.get('/my', authMiddleware, roleMiddleware(['PHARMACY']), quoteController.getPharmacyQuotes);

export default router;
