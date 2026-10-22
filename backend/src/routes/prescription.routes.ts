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
router.get('/available', authMiddleware, roleMiddleware(['PHARMACY']), prescriptionController.getAvailableForPharmacy);

// Consulta de detalhes de uma receita
router.get('/:id', authMiddleware, prescriptionController.getById);

// Listagem de cotações de uma receita (exclusivo para o paciente titular da receita ou ADMIN)
router.get('/:id/quotes', authMiddleware, roleMiddleware(['PATIENT', 'ADMIN']), prescriptionController.getQuotes);

// Geração de URL assinada de visualização (5 min) com auditoria compulsória
router.get('/:id/view-url', authMiddleware, prescriptionController.getSignedViewUrl);

// Rota de visualização assinada local (desenvolvimento / fallback)
router.get('/:id/view', prescriptionController.serveLocalView);

export default router;
