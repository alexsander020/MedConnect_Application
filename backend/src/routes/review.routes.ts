import { Router } from 'express';
import { z } from 'zod';
import { ReviewController } from '../controllers/review.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';

const router = Router();
const reviewController = new ReviewController();

const createReviewSchema = {
  body: z.object({
    orderId: z.string().min(1, 'orderId é obrigatório'),
    rating: z.number().int().min(1).max(5, 'A nota deve ser entre 1 e 5'),
    comment: z.string().optional()
  })
};

// Paciente avalia um pedido entregue
router.post('/', authMiddleware, roleMiddleware(['PATIENT']), validateRequest(createReviewSchema), reviewController.create);

// Consulta de avaliações públicas de uma farmácia
router.get('/pharmacy/:id', reviewController.getPharmacyReviews);

export default router;
