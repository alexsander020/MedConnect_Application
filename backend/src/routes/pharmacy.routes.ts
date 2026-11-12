import { Router } from 'express';
import { z } from 'zod';
import { PharmacyController } from '../controllers/pharmacy.controller';
import { validateRequest } from '../middlewares/validateRequest.middleware';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../services/upload';

const router = Router();
const pharmacyController = new PharmacyController();

// UF: 2 letras, normalizada para maiúsculas (o banco tem CHECK '^[A-Z]{2}$')
const ufSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, 'UF deve ter 2 letras (ex.: SP)')
  .transform((value) => value.toUpperCase());

// Campo opcional de texto: string vazia ou null limpa o valor
const optionalClearableText = (max: number, label: string) =>
  z
    .union([z.string().trim().max(max, `${label} deve ter no máximo ${max} caracteres`), z.null()])
    .optional()
    .transform((value) => (value === '' ? null : value));

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
    documentUrl: z.string().optional(),
    city: z.string().trim().max(120, 'Cidade deve ter no máximo 120 caracteres').optional()
      .transform((value) => (value ? value : undefined)),
    state: ufSchema.optional(),
    termsAccepted: z.boolean().optional()
  })
};

const updateMeSchema = {
  body: z.object({
    phone: optionalClearableText(30, 'Telefone'),
    address: optionalClearableText(300, 'Endereço'),
    city: optionalClearableText(120, 'Cidade'),
    state: z.union([ufSchema, z.null(), z.literal('')]).optional()
      .transform((value) => (value === '' ? null : value)),
    deliveryArea: optionalClearableText(300, 'Área de entrega'),
    description: optionalClearableText(600, 'Descrição'),
    services: z
      .array(
        z.string().trim().min(1, 'Serviço não pode ser vazio').max(40, 'Cada serviço deve ter no máximo 40 caracteres')
      )
      .max(12, 'Informe no máximo 12 serviços')
      .optional()
      .transform((value) => (value ? Array.from(new Set(value)) : value))
  })
};

const replaceHoursSchema = {
  body: z.object({
    timezone: z.string().trim().min(1, 'Fuso horário não pode ser vazio').max(64).optional(),
    hours: z
      .array(
        z.object({
          dayOfWeek: z.number().int('dayOfWeek deve ser inteiro').min(0, 'dayOfWeek deve ser de 0 a 6').max(6, 'dayOfWeek deve ser de 0 a 6'),
          opensAt: z.string(),
          closesAt: z.string()
        })
      )
      .max(28, 'No máximo 28 intervalos por semana (4 por dia)')
  })
};

const publicListingSchema = {
  query: z.object({
    search: z.string().trim().max(120).optional(),
    city: z.string().trim().max(120).optional(),
    openNow: z
      .enum(['true', 'false', '1', '0'])
      .optional()
      .transform((value) => value === 'true' || value === '1')
  })
};

// Rotas literais ANTES de qualquer rota parametrizada (/api/pharmacies e /api/pharmacy montam este mesmo router)
// Perfil próprio da farmácia autenticada
router.get('/me', authMiddleware, roleMiddleware(['PHARMACY']), pharmacyController.getMe);
router.patch('/me', authMiddleware, roleMiddleware(['PHARMACY']), validateRequest(updateMeSchema), pharmacyController.updateMe);
router.put('/me/hours', authMiddleware, roleMiddleware(['PHARMACY']), validateRequest(replaceHoursSchema), pharmacyController.replaceBusinessHours);

// Vitrine pública (sem autenticação): somente farmácias verificadas e ativas, sem dados de contato
router.get('/public', validateRequest(publicListingSchema), pharmacyController.listPublic);

router.post('/', validateRequest(createPharmacySchema), pharmacyController.create);
router.get('/', pharmacyController.getAll);

// Métricas e estatísticas operacionais da farmácia autenticada
router.get('/stats', authMiddleware, roleMiddleware(['PHARMACY']), pharmacyController.getStats);

// Capacidades regulatórias da farmácia (Humana / Veterinária)
router.get(
  '/capabilities',
  authMiddleware,
  roleMiddleware(['PHARMACY']),
  pharmacyController.getMyCapabilities.bind(pharmacyController)
);

router.post(
  '/capabilities/veterinary',
  authMiddleware,
  roleMiddleware(['PHARMACY']),
  upload.any(),
  pharmacyController.requestVeterinaryCapability.bind(pharmacyController)
);

export default router;
