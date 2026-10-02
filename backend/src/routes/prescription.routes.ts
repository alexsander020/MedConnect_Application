import { Router } from 'express';
import { PrescriptionController } from '../controllers/prescription.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../services/upload';

const router = Router();
const prescriptionController = new PrescriptionController();

// Apenas pacientes logados podem enviar receitas
router.post('/', authMiddleware, roleMiddleware(['PATIENT']), upload.single('file'), prescriptionController.create);
router.get('/my', authMiddleware, roleMiddleware(['PATIENT']), prescriptionController.getMyPrescriptions);

// Farmácias podem consultar receitas aguardando cotação
router.get('/pharmacy', authMiddleware, roleMiddleware(['PHARMACY']), prescriptionController.getAvailableForPharmacy);

export default router;
