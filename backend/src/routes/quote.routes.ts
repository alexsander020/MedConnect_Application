import { Router } from 'express';
import { QuoteController } from '../controllers/quote.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const quoteController = new QuoteController();

// Apenas farmácias podem enviar cotações
router.post('/', authMiddleware, roleMiddleware(['PHARMACY']), quoteController.create);
router.get('/my', authMiddleware, roleMiddleware(['PHARMACY']), quoteController.getPharmacyQuotes);

export default router;
