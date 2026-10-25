import { Router } from 'express';
import { ConsentController } from '../controllers/consent.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const controller = new ConsentController();

// Consulta pública aos termos de consentimento vigentes
router.get('/terms', controller.getTerms.bind(controller));

// Endpoints autenticados do titular
router.get('/status', authMiddleware, controller.getStatus.bind(controller));
router.post('/', authMiddleware, controller.giveConsent.bind(controller));
router.post('/revoke', authMiddleware, controller.revokeConsent.bind(controller));

export default router;
