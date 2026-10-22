import { Router } from 'express';
import { z } from 'zod';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';

const router = Router();
const adminController = new AdminController();

const verifyPharmacySchema = {
  params: z.object({
    id: z.string().min(1, 'ID da farmácia é obrigatório')
  }),
  body: z.object({
    approved: z.boolean(),
    rejectionReason: z.string().optional()
  })
};

// Todas as rotas administrativas exigem papel ADMIN
router.use(authMiddleware, roleMiddleware(['ADMIN']));

// Listagem de farmácias com verificação pendente
router.get('/pharmacies/pending', adminController.getPendingPharmacies);

// Aprovação ou rejeição de credenciamento sanitário da farmácia
router.patch('/pharmacies/:id/verify', validateRequest(verifyPharmacySchema), adminController.verifyPharmacy);

export default router;
