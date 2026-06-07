import { Router } from 'express';
import { PharmacyController } from '../controllers/pharmacy.controller';

const router = Router();
const pharmacyController = new PharmacyController();

router.post('/', pharmacyController.create);
router.get('/', pharmacyController.getAll);

export default router;
