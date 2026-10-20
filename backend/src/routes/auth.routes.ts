import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authLimiter } from '../middlewares/rate-limit.middleware';

const router = Router();
const authController = new AuthController();

router.post('/login', authLimiter, authController.login);

export default router;
