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

// Rota de visualização de arquivo de evidência via URL assinada (autenticada via HMAC token + expires)
router.get(
  '/capabilities/:id/evidences/:index/view',
  adminController.serveCapabilityEvidence.bind(adminController)
);

// Todas as demais rotas administrativas exigem papel ADMIN
router.use(authMiddleware, roleMiddleware(['ADMIN']));

// Trilha de Auditoria (LGPD Art. 11/Art. 46) - Imutável e consultável por ADMIN
router.use('/audit-logs', (req, res, next) => {
  if (['PUT', 'PATCH', 'DELETE', 'POST'].includes(req.method)) {
    res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'A trilha de auditoria é imutável: registros não podem ser alterados ou apagados.'
      }
    });
    return;
  }
  next();
});
router.get('/audit-logs', adminController.getAuditLogs.bind(adminController));

// Listagem de farmácias com verificação pendente
router.get('/pharmacies/pending', adminController.getPendingPharmacies.bind(adminController));

// Consulta de situação cadastral do CNPJ (reutilizando CnpjLookup da Fase 2.2)
router.get('/pharmacies/:id/cnpj-lookup', adminController.lookupPharmacyCnpj.bind(adminController));

// Métricas de validação do piloto (Fase 5 - Analytics agregados sem dados pessoais)
router.get('/pilot-metrics', adminController.getPilotMetrics.bind(adminController));

// Aprovação ou rejeição de credenciamento sanitário da farmácia
router.patch(
  '/pharmacies/:id/verify',
  validateRequest(verifyPharmacySchema),
  adminController.verifyPharmacy.bind(adminController)
);

// Gestão de Capacidades Regulatórias (ETAPA V3)
router.get('/capabilities', adminController.listCapabilities.bind(adminController));
router.get(
  '/capabilities/:id/evidences/:index/view-url',
  adminController.getCapabilityEvidenceSignedUrl.bind(adminController)
);
router.patch('/capabilities/:id/approve', adminController.approveCapability.bind(adminController));
router.patch('/capabilities/:id/reject', adminController.rejectCapability.bind(adminController));
router.patch('/capabilities/:id/suspend', adminController.suspendCapability.bind(adminController));

// Visibilidade de pedidos existentes para o ADMIN (incluindo pedidos de capacidades suspensas)
router.get('/orders', adminController.listOrders.bind(adminController));

export default router;
