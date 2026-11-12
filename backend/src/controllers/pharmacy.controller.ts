import { vetObservabilityService } from '../services/vetObservabilityService';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import {
  ehEmailValido,
  ehSenhaForte,
  ehCNPJValido,
  validarCrmv,
  validarCrf,
  validarRegistroMapa
} from '@medconnect/validation';
import { AuthRequest } from '../middlewares/auth.middleware';
import { cnpjLookup } from '../services/cnpj';
import { formatPriceCentsToDecimal } from '../lib/money';
import {
  AccountStatus,
  CapabilityStatus,
  CapabilityType,
  OrderStatus,
  PharmacyVerificationStatus,
  Prisma,
  QuoteStatus,
  Role
} from '@prisma/client';
import { sendVerificationEmail } from '../services/emailVerificationService';
import {
  BusinessHoursValidationError,
  isValidTimezone,
  parseWeeklySchedule
} from '../domain/businessHours';
import {
  BUSINESS_HOURS_SELECT,
  PHARMACY_PROFILE_SELECT,
  buildPharmacyProfile,
  buildSchedule,
  getPharmacyRatings,
  ratingOf
} from '../services/pharmacyProfileService';
import { getFeatureFlags } from '../config/featureFlags';
import { processAndSavePrescriptionFile } from '../services/upload';
import { AuditLogService } from '../services/auditLogService';

// Versão vigente do Termo de Adesão de farmácias (docs/lgpd/termo-de-adesao-farmacias.md)
export const PHARMACY_TERMS_VERSION = 'v1.0.0';
// Teto defensivo da listagem pública (rota sem autenticação)
const PUBLIC_LISTING_MAX = 200;

export class PharmacyController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        email,
        password,
        cnpj,
        phone,
        address,
        deliveryArea,
        sanitaryLicense,
        operatingAuth,
        technicalResponsibleName,
        technicalResponsibleCrf,
        technicalResponsibleUf,
        documentUrl,
        city,
        state,
        termsAccepted
      } = req.body;

      if (!name || !email || !password || !cnpj) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Nome, e-mail, senha e CNPJ são obrigatórios'
          }
        });
        return;
      }

      if (!ehEmailValido(email)) {
        res.status(400).json({
          error: {
            code: 'INVALID_EMAIL',
            message: 'Formato de e-mail inválido'
          }
        });
        return;
      }

      if (!ehSenhaForte(password)) {
        res.status(400).json({
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Senha fraca. A senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, número e caractere especial.'
          }
        });
        return;
      }

      if (!ehCNPJValido(cnpj)) {
        res.status(400).json({
          error: {
            code: 'INVALID_CNPJ',
            message: 'CNPJ inválido. Verifique os 14 dígitos informados.'
          }
        });
        return;
      }

      const cleanCNPJ = String(cnpj).replace(/[^\d]+/g, '');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Consulta de situação cadastral do CNPJ via CnpjLookup
      let cnpjEvidenceData: string | null = null;
      try {
        const lookupResult = await cnpjLookup.lookup(cleanCNPJ);
        cnpjEvidenceData = JSON.stringify(lookupResult);
      } catch (e) {
        // Não impede o cadastro se a consulta externa oscilar
      }

      const pharmacy = await prisma.pharmacy.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          cnpj: cleanCNPJ,
          phone,
          address,
          deliveryArea,
          verified: false,
          verificationStatus: PharmacyVerificationStatus.PENDING_VERIFICATION,
          sanitaryLicense,
          operatingAuth,
          technicalResponsibleName,
          technicalResponsibleCrf,
          technicalResponsibleUf,
          documentUrl,
          cnpjData: cnpjEvidenceData,
          emailVerified: false,
          city,
          state,
          termsAcceptedAt: termsAccepted === true ? new Date() : null,
          termsVersion: termsAccepted === true ? PHARMACY_TERMS_VERSION : null
        }
      });

      const { password: _, ...pharmacyWithoutPassword } = pharmacy;
      await sendVerificationEmail(pharmacy.email, pharmacy.name);

      res.status(201).json(pharmacyWithoutPassword);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const isEmail = error?.meta?.target?.includes('email');
        res.status(409).json({
          error: {
            code: isEmail ? 'EMAIL_ALREADY_EXISTS' : 'CNPJ_ALREADY_EXISTS',
            message: isEmail ? 'E-mail já está cadastrado.' : 'CNPJ já está cadastrado.'
          }
        });
        return;
      }
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Erro ao criar farmácia. Verifique os dados.'
        }
      });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const pharmacies = await prisma.pharmacy.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          cnpj: true,
          phone: true,
          address: true,
          deliveryArea: true,
          verified: true,
          verificationStatus: true,
          createdAt: true
        }
      });
      res.json(pharmacies);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar farmácias' } });
    }
  }

  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      if (req.user.role !== 'PHARMACY') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Apenas farmácias têm acesso a métricas' } });
        return;
      }

      const pharmacyId = req.user.id;

      const [
        pharmacy,
        capabilities,
        totalQuotes,
        pendingQuotes,
        acceptedQuotes,
        productionOrders,
        deliveryOrders,
        deliveredOrders,
        reviews
      ] = await Promise.all([
        prisma.pharmacy.findUnique({ where: { id: pharmacyId } }),
        prisma.pharmacyCapability.findMany({ where: { pharmacyId }, orderBy: { createdAt: 'asc' } }),
        prisma.quote.count({ where: { pharmacyId } }),
        prisma.quote.count({ where: { pharmacyId, status: QuoteStatus.PENDING } }),
        prisma.quote.count({ where: { pharmacyId, status: QuoteStatus.ACCEPTED } }),
        prisma.order.count({ where: { quote: { pharmacyId }, status: OrderStatus.PRODUCTION } }),
        prisma.order.count({ where: { quote: { pharmacyId }, status: OrderStatus.DELIVERY } }),
        prisma.order.findMany({
          where: { quote: { pharmacyId }, status: OrderStatus.DELIVERED },
          include: { quote: true }
        }),
        prisma.review.findMany({
          where: { pharmacyId }
        })
      ]);

      const totalRevenueCents = deliveredOrders.reduce((sum, o) => sum + o.quote.priceCents, 0);
      const averageRating =
        reviews.length > 0
          ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1))
          : 5.0;

      const totalOrders = productionOrders + deliveryOrders + deliveredOrders.length;
      const inProgressOrders = productionOrders + deliveryOrders;

      res.json({
        verificationStatus: pharmacy?.verificationStatus || 'PENDING_VERIFICATION',
        verified: pharmacy?.verified || false,
        rejectionReason: pharmacy?.rejectionReason || null,
        capabilities,
        totalQuotes,
        pendingQuotes,
        acceptedQuotes,
        totalOrders,
        inProgressOrders,
        productionOrders,
        deliveryOrders,
        deliveredOrders: deliveredOrders.length,
        totalRevenueCents,
        totalRevenue: formatPriceCentsToDecimal(totalRevenueCents),
        averageRating,
        reviewsCount: reviews.length
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao calcular métricas da farmácia' } });
    }
  }

  /**
   * Perfil completo da farmácia autenticada, com grade de horários e status de abertura.
   */
  async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const pharmacy = await prisma.pharmacy.findUnique({
        where: { id: req.user!.id },
        select: PHARMACY_PROFILE_SELECT
      });
      if (!pharmacy) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Farmácia não encontrada' } });
        return;
      }
      res.json(buildPharmacyProfile(pharmacy));
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao carregar perfil da farmácia' } });
    }
  }

  /**
   * Atualização parcial do perfil operacional. Nome, CNPJ e e-mail NÃO são editáveis aqui
   * (são dados de credenciamento e exigem nova verificação).
   */
  async updateMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const existing = await prisma.pharmacy.findUnique({ where: { id: req.user!.id }, select: { id: true } });
      if (!existing) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Farmácia não encontrada' } });
        return;
      }

      const allowed = ['phone', 'address', 'city', 'state', 'deliveryArea', 'description', 'services'] as const;
      const data: Prisma.PharmacyUpdateInput = {};
      for (const field of allowed) {
        if (req.body[field] !== undefined) {
          (data as any)[field] = req.body[field];
        }
      }

      const updated = await prisma.pharmacy.update({
        where: { id: existing.id },
        data,
        select: PHARMACY_PROFILE_SELECT
      });
      res.json(buildPharmacyProfile(updated));
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar perfil da farmácia' } });
    }
  }

  /**
   * Substitui toda a grade semanal de horários (e opcionalmente o fuso) numa transação.
   */
  async replaceBusinessHours(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { timezone, hours } = req.body as {
        timezone?: string;
        hours: Array<{ dayOfWeek: number; opensAt: string; closesAt: string }>;
      };

      if (timezone !== undefined && !isValidTimezone(timezone)) {
        res.status(400).json({
          error: { code: 'INVALID_TIMEZONE', message: `Fuso horário inválido: "${timezone}". Use um identificador IANA (ex.: America/Sao_Paulo).` }
        });
        return;
      }

      let intervals;
      try {
        intervals = parseWeeklySchedule(hours);
      } catch (error) {
        if (error instanceof BusinessHoursValidationError) {
          res.status(400).json({ error: { code: error.code, message: error.message } });
          return;
        }
        throw error;
      }

      const pharmacyId = req.user!.id;
      const existing = await prisma.pharmacy.findUnique({ where: { id: pharmacyId }, select: { id: true } });
      if (!existing) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Farmácia não encontrada' } });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        await tx.pharmacyBusinessHour.deleteMany({ where: { pharmacyId } });
        if (intervals.length > 0) {
          await tx.pharmacyBusinessHour.createMany({
            data: intervals.map((i) => ({ pharmacyId, dayOfWeek: i.dayOfWeek, opensAt: i.opensAt, closesAt: i.closesAt }))
          });
        }
        return tx.pharmacy.update({
          where: { id: pharmacyId },
          data: timezone !== undefined ? { timezone } : {},
          select: { timezone: true, businessHours: BUSINESS_HOURS_SELECT }
        });
      });

      res.json({
        timezone: result.timezone,
        ...buildSchedule(result.businessHours, result.timezone)
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao salvar horários de atendimento' } });
    }
  }

  /**
   * Vitrine pública: somente farmácias VERIFIED e ACTIVE, sem dados de contato
   * (e-mail, CNPJ, telefone e endereço nunca saem desta rota).
   */
  async listPublic(req: Request, res: Response): Promise<void> {
    try {
      const { search, city, openNow } = req.query as { search?: string; city?: string; openNow?: boolean };

      const where: Prisma.PharmacyWhereInput = {
        verificationStatus: PharmacyVerificationStatus.VERIFIED,
        status: AccountStatus.ACTIVE
      };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { deliveryArea: { contains: search, mode: 'insensitive' } }
        ];
      }
      if (city) {
        where.city = { contains: city, mode: 'insensitive' };
      }

      const pharmacies = await prisma.pharmacy.findMany({
        where,
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          deliveryArea: true,
          description: true,
          services: true,
          timezone: true,
          businessHours: BUSINESS_HOURS_SELECT
        },
        orderBy: { name: 'asc' },
        take: PUBLIC_LISTING_MAX
      });

      const ratings = await getPharmacyRatings(pharmacies.map((p) => p.id));
      const now = new Date();

      const items = pharmacies.map((p) => {
        const { businessHours, ...rest } = p;
        return {
          ...rest,
          services: rest.services ?? [],
          ...ratingOf(ratings, p.id),
          ...buildSchedule(businessHours, p.timezone, now)
        };
      });

      const data = openNow ? items.filter((i) => i.openStatus.isOpen) : items;

      res.json({
        data,
        meta: {
          total: data.length,
          openNow: data.filter((i) => i.openStatus.isOpen).length
        }
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar farmácias' } });
    }
  }

  /**
   * Lista as capacidades (HUMAN_COMPOUNDING / VETERINARY_COMPOUNDING) da farmácia autenticada.
   */
  async getMyCapabilities(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      if (req.user.role !== 'PHARMACY') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Apenas farmácias podem consultar suas capacidades regulatórias'
          }
        });
        return;
      }

      const capabilities = await prisma.pharmacyCapability.findMany({
        where: { pharmacyId: req.user.id },
        orderBy: { createdAt: 'asc' }
      });

      res.json(
        capabilities.map((cap) => ({
          ...cap,
          evidenceCount: cap.evidenceFileKeys.length
        }))
      );
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao consultar capacidades da farmácia' } });
    }
  }

  /**
   * 3.1 Solicitação de capacidade VETERINARY_COMPOUNDING pela farmácia autenticada.
   * Exige VET_ENABLED=true, valida formatos de MAPA, CRMV/UF e CRF/UF, faz upload privado
   * de evidências (sem URL pública), inicia em PENDING_VERIFICATION e preserva capacidade humana.
   */
  async requestVeterinaryCapability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { VET_ENABLED } = getFeatureFlags();
      if (!VET_ENABLED) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Funcionalidade veterinária não habilitada'
          }
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      if (req.user.role !== 'PHARMACY') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Apenas farmácias podem solicitar a capacidade de manipulação veterinária'
          }
        });
        return;
      }

      const pharmacy = await prisma.pharmacy.findUnique({ where: { id: req.user.id } });
      if (!pharmacy) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Farmácia não encontrada' } });
        return;
      }

      const {
        mapaRegistrationNumber,
        crmvCompanyRegistration,
        crmvCompanyUf,
        technicalResponsibleName,
        technicalResponsibleCrf,
        technicalResponsibleCrfUf
      } = req.body || {};

      // 1. Validação de formato do Registro MAPA (sem integração externa)
      if (!mapaRegistrationNumber || !validarRegistroMapa(mapaRegistrationNumber)) {
        res.status(400).json({
          error: {
            code: 'INVALID_MAPA_REGISTRATION',
            message: 'Número de registro no MAPA é obrigatório e deve ter formato válido (ex.: SP-12345-6).'
          }
        });
        return;
      }

      // 2. Validação de formato do CRMV da empresa e UF
      if (!crmvCompanyRegistration || !crmvCompanyUf || !validarCrmv(crmvCompanyRegistration, crmvCompanyUf)) {
        res.status(400).json({
          error: {
            code: 'INVALID_COMPANY_CRMV',
            message: 'Registro da empresa no CRMV e UF válida são obrigatórios.'
          }
        });
        return;
      }

      // 3. Validação do Responsável Técnico e CRF/UF
      if (!technicalResponsibleName || typeof technicalResponsibleName !== 'string' || !technicalResponsibleName.trim()) {
        res.status(400).json({
          error: {
            code: 'MISSING_TECHNICAL_RESPONSIBLE',
            message: 'Nome do responsável técnico é obrigatório.'
          }
        });
        return;
      }

      if (
        !technicalResponsibleCrf ||
        !technicalResponsibleCrfUf ||
        !validarCrf(technicalResponsibleCrf, technicalResponsibleCrfUf)
      ) {
        res.status(400).json({
          error: {
            code: 'INVALID_TECHNICAL_RESPONSIBLE_CRF',
            message: 'CRF e UF do responsável técnico são obrigatórios e devem ter formato válido.'
          }
        });
        return;
      }

      // 4. Coleta e validação dos documentos de evidência em upload privado
      const uploadedFiles: Express.Multer.File[] = [];
      if (Array.isArray(req.files)) {
        uploadedFiles.push(...req.files);
      } else if (req.files && typeof req.files === 'object') {
        for (const key of Object.keys(req.files)) {
          const arr = (req.files as Record<string, Express.Multer.File[]>)[key];
          if (Array.isArray(arr)) {
            uploadedFiles.push(...arr);
          }
        }
      }
      if (req.file) {
        uploadedFiles.push(req.file);
      }

      if (uploadedFiles.length === 0) {
        res.status(400).json({
          error: {
            code: 'MISSING_EVIDENCE_FILES',
            message: 'É obrigatório anexar pelo menos um documento de evidência em upload privado (PDF, JPEG ou PNG).'
          }
        });
        return;
      }

      const evidenceFileKeys: string[] = [];
      for (const file of uploadedFiles) {
        const stored = await processAndSavePrescriptionFile(file);
        evidenceFileKeys.push(stored.fileIdentifier);
      }

      // 5. Preserva a capacidade humana existente se a farmácia já era verificada no fluxo legado
      if (pharmacy.verificationStatus === PharmacyVerificationStatus.VERIFIED && pharmacy.verified) {
        await prisma.pharmacyCapability.upsert({
          where: {
            pharmacyId_type: {
              pharmacyId: pharmacy.id,
              type: CapabilityType.HUMAN_COMPOUNDING
            }
          },
          update: {},
          create: {
            pharmacyId: pharmacy.id,
            type: CapabilityType.HUMAN_COMPOUNDING,
            status: CapabilityStatus.VERIFIED,
            technicalResponsibleName: pharmacy.technicalResponsibleName,
            technicalResponsibleCrf: pharmacy.technicalResponsibleCrf,
            technicalResponsibleCrfUf: pharmacy.technicalResponsibleUf,
            verifiedByAdminId: pharmacy.verifiedById,
            verifiedAt: pharmacy.verifiedAt || new Date()
          }
        });
      }

      // 6. Cria/atualiza a capacidade VETERINARY_COMPOUNDING iniciando SEMPRE em PENDING_VERIFICATION
      const capability = await prisma.pharmacyCapability.upsert({
        where: {
          pharmacyId_type: {
            pharmacyId: pharmacy.id,
            type: CapabilityType.VETERINARY_COMPOUNDING
          }
        },
        update: {
          status: CapabilityStatus.PENDING_VERIFICATION,
          mapaRegistrationNumber: String(mapaRegistrationNumber).trim(),
          crmvCompanyRegistration: String(crmvCompanyRegistration).trim(),
          crmvCompanyUf: String(crmvCompanyUf).trim().toUpperCase(),
          technicalResponsibleName: String(technicalResponsibleName).trim(),
          technicalResponsibleCrf: String(technicalResponsibleCrf).trim(),
          technicalResponsibleCrfUf: String(technicalResponsibleCrfUf).trim().toUpperCase(),
          evidenceFileKeys,
          verifiedByAdminId: null,
          verifiedAt: null,
          rejectionReason: null
        },
        create: {
          pharmacyId: pharmacy.id,
          type: CapabilityType.VETERINARY_COMPOUNDING,
          status: CapabilityStatus.PENDING_VERIFICATION,
          mapaRegistrationNumber: String(mapaRegistrationNumber).trim(),
          crmvCompanyRegistration: String(crmvCompanyRegistration).trim(),
          crmvCompanyUf: String(crmvCompanyUf).trim().toUpperCase(),
          technicalResponsibleName: String(technicalResponsibleName).trim(),
          technicalResponsibleCrf: String(technicalResponsibleCrf).trim(),
          technicalResponsibleCrfUf: String(technicalResponsibleCrfUf).trim().toUpperCase(),
          evidenceFileKeys
        }
      });

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      await AuditLogService.log({
        actorId: pharmacy.id,
        actorType: Role.PHARMACY,
        actorEmail: pharmacy.email,
        action: 'REQUEST_VETERINARY_CAPABILITY',
        resource: 'PharmacyCapability',
        resourceId: capability.id,
        reason: 'PHARMACY_CAPABILITY_REQUEST',
        details: {
          type: CapabilityType.VETERINARY_COMPOUNDING,
          status: CapabilityStatus.PENDING_VERIFICATION,
          mapaRegistrationNumber: capability.mapaRegistrationNumber,
          crmvCompanyUf: capability.crmvCompanyUf,
          evidenceCount: evidenceFileKeys.length
        },
        ipAddress: clientIp,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({
        ...capability,
        evidenceCount: capability.evidenceFileKeys.length
      });
    } catch (error: any) {
      if (error?.status) {
        res.status(error.status).json({
          error: {
            code: error.code || 'BAD_REQUEST',
            message: error.message
          }
        });
        return;
      }
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro ao registrar solicitação de capacidade veterinária'
        }
      });
    }
  }
}
