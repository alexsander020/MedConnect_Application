import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const userController = new UserController();

router.post('/', userController.create);
router.get('/', authMiddleware, roleMiddleware(['ADMIN']), userController.getAll);

export default router;
