import { Router } from 'express';
import { z } from 'zod';
import { UserController } from '../controllers/user.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';

const router = Router();
const userController = new UserController();

const createUserSchema = {
  body: z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('Formato de e-mail inválido'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
    cpf: z.string().min(11, 'CPF deve ter no mínimo 11 dígitos'),
    phone: z.string().optional(),
    address: z.string().optional()
  })
};

router.post('/', validateRequest(createUserSchema), userController.create);
router.get('/', authMiddleware, roleMiddleware(['ADMIN']), userController.getAll);

export default router;
