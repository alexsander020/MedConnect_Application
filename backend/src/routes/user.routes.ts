import { Router } from 'express';
import { z } from 'zod';
import { UserController } from '../controllers/user.controller';
import { LgpdController } from '../controllers/lgpd.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';

const router = Router();
const userController = new UserController();
const lgpdController = new LgpdController();

const createUserSchema = {
  body: z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('Formato de e-mail inválido'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
    cpf: z.string().min(11, 'CPF deve ter no mínimo 11 dígitos'),
    phone: z.string().optional(),
    address: z.string().optional(),
    healthConsent: z.boolean().optional(),
    consent: z.boolean().optional()
  })
};

// Direitos do Titular (Art. 18 LGPD)
router.get('/me/export', authMiddleware, lgpdController.exportMyData.bind(lgpdController));
router.post('/me/anonymize', authMiddleware, lgpdController.anonymizeMyAccount.bind(lgpdController));
router.delete('/me', authMiddleware, lgpdController.anonymizeMyAccount.bind(lgpdController));

router.post('/', validateRequest(createUserSchema), userController.create);
router.get('/', authMiddleware, roleMiddleware(['ADMIN']), userController.getAll);

export default router;

