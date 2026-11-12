import { Router } from 'express';
import { AnimalController } from '../controllers/animal.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const animalController = new AnimalController();

// Todas as rotas de animais exigem papel PATIENT (tutor)
router.post('/', authMiddleware, roleMiddleware(['PATIENT']), animalController.create);
router.get('/', authMiddleware, roleMiddleware(['PATIENT']), animalController.list);
router.get('/:id', authMiddleware, roleMiddleware(['PATIENT']), animalController.getById);
router.patch('/:id', authMiddleware, roleMiddleware(['PATIENT']), animalController.update);
router.delete('/:id', authMiddleware, roleMiddleware(['PATIENT']), animalController.delete);

export default router;
