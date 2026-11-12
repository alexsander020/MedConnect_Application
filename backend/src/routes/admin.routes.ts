import { Router } from 'express';
import { z } from 'zod';
import { AdminController } from '../controllers/admin.controller';
import { AdminManagementController } from '../controllers/adminManagement.controller';
import { paginationQuerySchema } from '../lib/pagination';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';

const router = Router();
const adminController = new AdminController();
const managementController = new AdminManagementController();

const verifyPharmacySchema = {
  params: z.object({
    id: z.string().min(1, 'ID da farmácia é obrigatório')
  }),
  body: z.object({
    approved: z.boolean(),
    rejectionReason: z.string().optional()
  })
};

const idParamsSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório')
});

const searchSchema = z.string().trim().max(120, 'Busca deve ter no máximo 120 caracteres').optional();

const accountStatusEnum = z.enum(['ACTIVE', 'SUSPENDED'], { error: 'Status deve ser ACTIVE ou SUSPENDED' });

// Suspensão exige motivo (5 a 500 caracteres); reativação aceita motivo opcional
const accountStatusBodySchema = z
  .object({
    status: accountStatusEnum,
    reason: z
      .string()
      .trim()
      .min(5, 'Motivo deve ter no mínimo 5 caracteres')
      .max(500, 'Motivo deve ter no máximo 500 caracteres')
      .optional()
  })
  .superRefine((body, ctx) => {
    if (body.status === 'SUSPENDED' && !body.reason) {
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Motivo é obrigatório para suspender (5 a 500 caracteres)'
      });
    }
  });

const listUsersSchema = {
  query: z.object({
    ...paginationQuerySchema,
    search: searchSchema,
    role: z.enum(['PATIENT', 'ADMIN'], { error: 'role deve ser PATIENT ou ADMIN' }).optional(),
    status: accountStatusEnum.optional()
  })
};

const listPharmaciesSchema = {
  query: z.object({
    ...paginationQuerySchema,
    search: searchSchema,
    verificationStatus: z
      .enum(['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'], {
        error: 'verificationStatus deve ser PENDING_VERIFICATION, VERIFIED ou REJECTED'
      })
      .optional(),
    status: accountStatusEnum.optional()
  })
};

const listOrdersSchema = {
  query: z.object({
    ...paginationQuerySchema,
    search: searchSchema,
    status: z
      .enum(['PRODUCTION', 'DELIVERY', 'DELIVERED', 'CANCELLED'], {
        error: 'Status deve ser PRODUCTION, DELIVERY, DELIVERED ou CANCELLED'
      })
      .optional()
  })
};

const listPrescriptionsSchema = {
  query: z.object({
    ...paginationQuerySchema,
    status: z
      .enum(['PENDING', 'QUOTED', 'ACCEPTED', 'CANCELLED'], {
        error: 'Status deve ser PENDING, QUOTED, ACCEPTED ou CANCELLED'
      })
      .optional()
  })
};

const supportTicketStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], {
  error: 'Status deve ser OPEN, IN_PROGRESS, RESOLVED ou CLOSED'
});

const listSupportTicketsSchema = {
  query: z.object({
    ...paginationQuerySchema,
    search: searchSchema,
    status: supportTicketStatusEnum.optional(),
    category: z
      .enum(['GENERAL', 'ORDER', 'PRESCRIPTION', 'PHARMACY_ONBOARDING', 'PRIVACY', 'TECHNICAL'], {
        error: 'Categoria inválida'
      })
      .optional()
  })
};

const updateSupportTicketSchema = {
  params: idParamsSchema,
  body: z
    .object({
      status: supportTicketStatusEnum.optional(),
      resolution: z
        .union([z.string().trim().max(5000, 'Resolução deve ter no máximo 5000 caracteres'), z.null()])
        .optional()
        .transform((value) => (value === '' ? null : value))
    })
    .refine((body) => body.status !== undefined || body.resolution !== undefined, {
      message: 'Informe status e/ou resolution'
    })
};

// Todas as rotas administrativas exigem papel ADMIN
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
router.get('/pharmacies/pending', adminController.getPendingPharmacies);

// Métricas de validação do piloto (Fase 5 - Analytics agregados sem dados pessoais)
router.get('/pilot-metrics', adminController.getPilotMetrics.bind(adminController));

// Aprovação ou rejeição de credenciamento sanitário da farmácia
router.patch('/pharmacies/:id/verify', validateRequest(verifyPharmacySchema), adminController.verifyPharmacy);

// ─── Gestão administrativa (Fase 6) ───────────────────────────────────────
// Visão geral agregada (somente contagens)
router.get('/overview', managementController.getOverview);

// Contas de pacientes e administradores
router.get('/users', validateRequest(listUsersSchema), managementController.listUsers);
router.get('/users/:id', validateRequest({ params: idParamsSchema }), managementController.getUser);
router.patch(
  '/users/:id/status',
  validateRequest({ params: idParamsSchema, body: accountStatusBodySchema }),
  managementController.updateUserStatus
);

// Farmácias (as rotas literais /pharmacies/pending acima vêm antes de /pharmacies/:id)
router.get('/pharmacies', validateRequest(listPharmaciesSchema), managementController.listPharmacies);
router.get('/pharmacies/:id', validateRequest({ params: idParamsSchema }), managementController.getPharmacy);
router.patch(
  '/pharmacies/:id/status',
  validateRequest({ params: idParamsSchema, body: accountStatusBodySchema }),
  managementController.updatePharmacyStatus
);

// Pedidos e receitas (receitas: somente metadados, nunca o arquivo)
router.get('/orders', validateRequest(listOrdersSchema), managementController.listOrders);
router.get('/orders/:id', validateRequest({ params: idParamsSchema }), managementController.getOrder);
router.get('/prescriptions', validateRequest(listPrescriptionsSchema), managementController.listPrescriptions);

// Chamados de suporte
router.get('/support-tickets', validateRequest(listSupportTicketsSchema), managementController.listSupportTickets);
router.get('/support-tickets/:id', validateRequest({ params: idParamsSchema }), managementController.getSupportTicket);
router.patch('/support-tickets/:id', validateRequest(updateSupportTicketSchema), managementController.updateSupportTicket);

export default router;
