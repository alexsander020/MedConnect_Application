import { Router } from 'express';
import { z } from 'zod';
import { PharmacyController } from '../controllers/pharmacy.controller';
import { validateRequest } from '../middlewares/validateRequest.middleware';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const pharmacyController = new PharmacyController();

const createPharmacySchema = {
  body: z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('Formato de e-mail inválido'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
    cnpj: z.string().min(14, 'CNPJ deve ter no mínimo 14 caracteres'),
    phone: z.string().optional(),
    address: z.string().optional(),
    deliveryArea: z.string().optional(),
    sanitaryLicense: z.string().optional(),
    operatingAuth: z.string().optional(),
    technicalResponsibleName: z.string().optional(),
    technicalResponsibleCrf: z.string().optional(),
    technicalResponsibleUf: z.string().optional(),
    documentUrl: z.string().optional()
  })
};

router.post('/', validateRequest(createPharmacySchema), pharmacyController.create);
router.get('/', pharmacyController.getAll);

// Métricas e estatísticas operacionais da farmácia autenticada
router.get('/stats', authMiddleware, roleMiddleware(['PHARMACY']), pharmacyController.getStats);

export default router;
