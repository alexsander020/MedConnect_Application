import { Router } from 'express';
import { LgpdController } from '../controllers/lgpd.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const controller = new LgpdController();

// Endpoints autenticados para Direitos do Titular (Art. 18 LGPD)
router.get('/export', authMiddleware, controller.exportMyData.bind(controller));
router.post('/anonymize', authMiddleware, controller.anonymizeMyAccount.bind(controller));
router.delete('/account', authMiddleware, controller.anonymizeMyAccount.bind(controller));

export default router;
