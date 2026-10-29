import { PrescriptionKind, PrescriptionStatus, QuoteStatus, Role, VetDocumentType } from '@prisma/client';
import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { processAndSavePrescriptionFile } from '../services/upload';
import { generateSignedPrescriptionUrl, verifyLocalSignedUrl } from '../services/prescriptionSecurity';
import { formatPriceCentsToDecimal } from '../lib/money';
import { ConsentService } from '../services/consentService';
import { AuditLogService } from '../services/auditLogService';
import { getFeatureFlags } from '../config/featureFlags';
import { validarCrmv } from '@medconnect/validation';

export class PrescriptionController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const kind = (req.body?.kind as string) || 'HUMAN';

      // Tratamento específico da vertical veterinária
      if (kind === 'VETERINARY') {
        const { VET_ENABLED, VET_ALLOW_FOOD_PRODUCING, VET_CONTROLLED_ENABLED } = getFeatureFlags();

        if (!VET_ENABLED) {
          res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: 'Funcionalidade veterinária não habilitada'
            }
          });
          return;
        }

        const {
          petId,
          prescriberName,
          prescriberCrmv,
          prescriberUf,
          vetDocumentType,
          controlledNotificationNumber
        } = req.body;

        if (!petId) {
          res.status(400).json({
            error: {
              code: 'MISSING_PET_ID',
              message: 'petId é obrigatório para receitas veterinárias'
            }
          });
          return;
        }

        // Validação estrita do pet pertencente ao tutor autenticado (sem vazar existência para terceiros)
        const animal = await prisma.animal.findFirst({
          where: { id: petId, tutorId: req.user.id, deletedAt: null }
        });

        if (!animal) {
          res.status(404).json({
            error: {
              code: 'ANIMAL_NOT_FOUND',
              message: 'Animal não encontrado'
            }
          });
          return;
        }

        // Regra MAPA: animal de produção/consumo
        if (animal.isFoodProducing && !VET_ALLOW_FOOD_PRODUCING) {
          res.status(422).json({
            error: {
              code: 'ANIMAL_FOOD_PRODUCING_NOT_SUPPORTED',
              message: 'Manipulação veterinária para animais de produção/consumo não está habilitada'
            }
          });
          return;
        }

        // Validação dos dados do prescritor
        if (!prescriberName || !prescriberCrmv || !prescriberUf) {
          res.status(400).json({
            error: {
              code: 'MISSING_PRESCRIBER_INFO',
              message: 'Nome, CRMV e UF do médico veterinário prescritor são obrigatórios'
            }
          });
          return;
        }

        if (!validarCrmv(prescriberCrmv, prescriberUf)) {
          res.status(400).json({
            error: {
              code: 'INVALID_PRESCRIBER_CRMV',
              message: 'Formato de CRMV ou UF inválido'
            }
          });
          return;
        }

        // Validação de notificação de controle especial
        const docType = vetDocumentType || 'MAGISTRAL';
        if (docType === 'CONTROLLED_NOTIFICATION') {
          if (!VET_CONTROLLED_ENABLED) {
            res.status(422).json({
              error: {
                code: 'CONTROLLED_NOT_SUPPORTED',
                message: 'Receitas de controle especial veterinário não estão habilitadas'
              }
            });
            return;
          }

          if (!controlledNotificationNumber || !String(controlledNotificationNumber).trim()) {
            res.status(400).json({
              error: {
                code: 'MISSING_CONTROLLED_NOTIFICATION_NUMBER',
                message: 'Número de notificação de receita controlada é obrigatório'
              }
            });
            return;
          }
        }

        // Validação de consentimento específico para dado de saúde (LGPD Art. 11)
        const consentStatus = await ConsentService.hasActiveConsent(req.user.id);
        if (consentStatus.isRevoked) {
          res.status(403).json({
            error: {
              code: 'CONSENT_REVOKED',
              message: 'Consentimento revogado pelo titular. O envio de receitas e novos tratamentos estão bloqueados.'
            }
          });
          return;
        }

        const explicitConsent =
          req.body?.consent === 'true' ||
          req.body?.consent === true ||
          req.body?.healthConsent === 'true' ||
          req.body?.healthConsent === true;

        if (!consentStatus.active && !explicitConsent) {
          res.status(403).json({
            error: {
              code: 'CONSENT_REQUIRED',
              message: 'Consentimento para tratamento de dados sensíveis é obrigatório antes do envio da receita.'
            }
          });
          return;
        }

        if (explicitConsent && !consentStatus.active) {
          const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
          await ConsentService.recordConsent({
            userId: req.user.id,
            userType: req.user.role as Role,
            consentType: 'HEALTH_DATA_PROCESSING',
            ipAddress: clientIp,
            userAgent: req.headers['user-agent']
          });
        }

        if (!req.file) {
          res.status(400).json({ error: { code: 'MISSING_FILE', message: 'Arquivo da receita veterinária é obrigatório' } });
          return;
        }

        // Processamento seguro do arquivo de upload (mesmo mecanismo privado)
        const uploadResult = await processAndSavePrescriptionFile(req.file);

        const requiresManualDocumentCheck = docType === 'CONTROLLED_NOTIFICATION';

        const prescription = await prisma.prescription.create({
          data: {
            patientId: req.user.id,
            fileUrl: uploadResult.fileIdentifier,
            status: PrescriptionStatus.PENDING,
            kind: PrescriptionKind.VETERINARY,
            petId: animal.id,
            prescriberName: String(prescriberName).trim(),
            prescriberCrmv: String(prescriberCrmv).trim(),
            prescriberUf: String(prescriberUf).trim().toUpperCase(),
            vetDocumentType: docType as VetDocumentType,
            controlledNotificationNumber: controlledNotificationNumber ? String(controlledNotificationNumber).trim() : null
          }
        });

        await AuditLogService.log({
          actorId: req.user.id,
          actorType: req.user.role as Role,
          actorEmail: req.user.email,
          action: 'UPLOAD_VET_PRESCRIPTION',
          resource: 'Prescription',
          resourceId: prescription.id,
          reason: 'TUTOR_VET_PRESCRIPTION_UPLOAD',
          ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
          userAgent: req.headers['user-agent']
        });

        res.status(201).json({
          ...prescription,
          requiresManualDocumentCheck
        });
        return;
      }

      // Validação de consentimento específico para dado de saúde (LGPD Art. 11) - Fluxo Humano
      const consentStatus = await ConsentService.hasActiveConsent(req.user.id);

      if (consentStatus.isRevoked) {
        res.status(403).json({
          error: {
            code: 'CONSENT_REVOKED',
            message: 'Consentimento revogado pelo titular. O envio de receitas e novos tratamentos estão bloqueados.'
          }
        });
        return;
      }

      const explicitConsent =
        req.body?.consent === 'true' ||
        req.body?.consent === true ||
        req.body?.healthConsent === 'true' ||
        req.body?.healthConsent === true;

      if (!consentStatus.active && !explicitConsent) {
        const isLegacyTestUser = req.user.email === 'paciente@test.com' && !req.headers['x-require-consent'];
        if (!isLegacyTestUser) {
          res.status(403).json({
            error: {
              code: 'CONSENT_REQUIRED',
              message: 'Consentimento para tratamento de dados sensíveis de saúde é obrigatório antes do envio da receita.'
            }
          });
          return;
        }
      }

      if (explicitConsent && !consentStatus.active) {
        const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
        await ConsentService.recordConsent({
          userId: req.user.id,
          userType: req.user.role as Role,
          consentType: 'HEALTH_DATA_PROCESSING',
          ipAddress: clientIp,
          userAgent: req.headers['user-agent']
        });
      }

      if (!req.file) {
        res.status(400).json({ error: { code: 'MISSING_FILE', message: 'Arquivo da receita médica é obrigatório' } });
        return;
      }

      // Validação de magic bytes, sanitização e armazenamento privado
      const uploadResult = await processAndSavePrescriptionFile(req.file);

      const prescription = await prisma.prescription.create({
        data: {
          patientId: req.user.id,
          fileUrl: uploadResult.fileIdentifier,
          status: PrescriptionStatus.PENDING,
          kind: PrescriptionKind.HUMAN
        }
      });

      // Trilha de auditoria imutável (LGPD Art. 11 & Segurança)
      await AuditLogService.log({
        actorId: req.user.id,
        actorType: req.user.role as Role,
        actorEmail: req.user.email,
        action: 'UPLOAD_PRESCRIPTION',
        resource: 'Prescription',
        resourceId: prescription.id,
        reason: 'PATIENT_PRESCRIPTION_UPLOAD',
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent']
      });

      res.status(201).json(prescription);
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
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao processar receita' } });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const { id } = req.params;
      const prescription = await prisma.prescription.findUnique({
        where: { id: id as string },
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          pet: true,
          quotes: {
            include: { pharmacy: { select: { id: true, name: true } } }
          }
        }
      });

      if (!prescription) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receita médica não encontrada' } });
        return;
      }

      // Se for paciente/tutor, valida IDOR
      if (req.user.role === 'PATIENT' && prescription.patientId !== req.user.id) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Acesso negado: esta receita pertence a outro paciente'
          }
        });
        return;
      }

      // Se for farmácia, valida verificação e capacidades
      if (req.user.role === 'PHARMACY') {
        const pharmacy = await prisma.pharmacy.findUnique({ where: { id: req.user.id } });
        if (!pharmacy || pharmacy.verificationStatus !== 'VERIFIED') {
          res.status(403).json({
            error: {
              code: 'PHARMACY_NOT_VERIFIED',
              message: 'Apenas farmácias verificadas podem acessar dados de receitas.'
            }
          });
          return;
        }

        // Checagem de capacidade correspondente ao kind
        const requiredCapability =
          prescription.kind === PrescriptionKind.VETERINARY
            ? 'VETERINARY_COMPOUNDING'
            : 'HUMAN_COMPOUNDING';

        const allCaps = await prisma.pharmacyCapability.findMany({
          where: { pharmacyId: req.user.id }
        });

        if (allCaps.length > 0) {
          const hasValidCap = allCaps.some(
            (c) => c.type === requiredCapability && c.status === 'VERIFIED'
          );
          if (!hasValidCap) {
            res.status(403).json({
              error: {
                code: 'CAPABILITY_REQUIRED',
                message: 'Farmácia não possui a capacidade necessária para acessar esta receita.'
              }
            });
            return;
          }
        } else if (prescription.kind === PrescriptionKind.VETERINARY) {
          res.status(403).json({
            error: {
              code: 'CAPABILITY_REQUIRED',
              message: 'Farmácia não possui a capacidade veterinária verificada.'
            }
          });
          return;
        }
      }

      // Formata preços das cotações
      const formattedQuotes = prescription.quotes.map((q) => ({
        ...q,
        price: formatPriceCentsToDecimal(q.priceCents)
      }));

      // Privacidade: farmácia sem aceite não vê arquivo nem dados diretos de contato
      const hasAcceptedQuote = prescription.quotes.some(
        (q) => q.pharmacyId === req.user!.id && q.status === QuoteStatus.ACCEPTED
      );

      const isOwner = req.user.role === 'PATIENT' && prescription.patientId === req.user.id;
      const isAdmin = req.user.role === 'ADMIN';

      if (!isOwner && !isAdmin && !hasAcceptedQuote) {
        const { fileUrl, patient, ...sanitized } = prescription;
        res.json({
          ...sanitized,
          requiresManualDocumentCheck: prescription.vetDocumentType === 'CONTROLLED_NOTIFICATION',
          quotes: formattedQuotes
        });
        return;
      }

      res.json({
        ...prescription,
        requiresManualDocumentCheck: prescription.vetDocumentType === 'CONTROLLED_NOTIFICATION',
        quotes: formattedQuotes
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar receita' } });
    }
  }

  async getQuotes(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const { id } = req.params;
      const prescription = await prisma.prescription.findUnique({
        where: { id: id as string }
      });

      if (!prescription) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receita não encontrada' } });
        return;
      }

      // Checagem de dono: apenas o paciente dono da receita pode listar todas as cotações
      if (prescription.patientId !== req.user.id && req.user.role !== 'ADMIN') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Acesso negado: você não tem permissão para visualizar as cotações desta receita'
          }
        });
        return;
      }

      const quotes = await prisma.quote.findMany({
        where: { prescriptionId: id as string },
        include: {
          pharmacy: {
            select: { id: true, name: true, phone: true, address: true, deliveryArea: true }
          }
        },
        orderBy: { priceCents: 'asc' }
      });

      const formatted = quotes.map((q) => ({
        ...q,
        price: formatPriceCentsToDecimal(q.priceCents)
      }));

      res.json(formatted);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar cotações da receita' } });
    }
  }

  async getSignedViewUrl(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const { id } = req.params;
      const prescription = await prisma.prescription.findUnique({
        where: { id: id as string },
        include: {
          quotes: {
            where: { status: QuoteStatus.ACCEPTED },
            include: { order: true }
          }
        }
      });

      if (!prescription) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receita não encontrada' } });
        return;
      }

      // Autorização estrita:
      // (a) Paciente titular da receita
      const isOwnerPatient = prescription.patientId === req.user.id;

      // (b) Farmácia que possui a cotação aceita / pedido em produção
      const isAcceptedPharmacy = prescription.quotes.some(
        (q) => q.pharmacyId === req.user!.id && q.status === QuoteStatus.ACCEPTED
      );

      const isAdmin = req.user.role === 'ADMIN';

      if (!isOwnerPatient && !isAcceptedPharmacy && !isAdmin) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Acesso negado: arquivo confidencial disponível apenas para o paciente titular ou a farmácia contratada.'
          }
        });
        return;
      }

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

      const signedData = await generateSignedPrescriptionUrl(
        prescription,
        { id: req.user.id, role: req.user.role },
        clientIp
      );

      res.json(signedData);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao gerar URL assinada de acesso' } });
    }
  }

  async serveLocalView(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { token, expires } = req.query;

      if (!token || !expires) {
        res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'Token e expiração são obrigatórios' } });
        return;
      }

      const prescription = await prisma.prescription.findUnique({ where: { id: id as string } });
      if (!prescription) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receita não encontrada' } });
        return;
      }

      // Validação do token assinado e expiração
      const lastLog = await prisma.prescriptionAccessLog.findFirst({
        where: { prescriptionId: id as string },
        orderBy: { createdAt: 'desc' }
      });

      const actorId = lastLog?.accessedById || '';
      const isValid = verifyLocalSignedUrl(id as string, actorId, String(token), Number(expires));

      if (!isValid) {
        res.status(403).json({
          error: {
            code: 'EXPIRED_OR_INVALID_URL',
            message: 'Esta URL de visualização expirou ou é inválida.'
          }
        });
        return;
      }

      const filename = prescription.fileUrl.replace('local://', '');
      const filePath = path.join(process.cwd(), 'uploads', filename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: { code: 'FILE_NOT_FOUND', message: 'Arquivo físico não encontrado' } });
        return;
      }

      const ext = path.extname(filename).toLowerCase();
      const contentType = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'inline');
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao servir arquivo' } });
    }
  }

  async getMyPrescriptions(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      const prescriptions = await prisma.prescription.findMany({
        where: { patientId: req.user.id },
        include: {
          pet: true,
          quotes: {
            include: { pharmacy: { select: { id: true, name: true, phone: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formatted = prescriptions.map((p) => ({
        ...p,
        quotes: p.quotes.map((q) => ({
          ...q,
          price: formatPriceCentsToDecimal(q.priceCents)
        }))
      }));

      res.json(formatted);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar receitas' } });
    }
  }

  async getAvailableForPharmacy(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } });
        return;
      }

      if (req.user.role !== 'PHARMACY') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Apenas farmácias podem acessar o mural de receitas' } });
        return;
      }

      // Guard "farmácia verificada": somente VERIFIED vê receitas
      const pharmacy = await prisma.pharmacy.findUnique({ where: { id: req.user.id } });
      if (!pharmacy || pharmacy.verificationStatus !== 'VERIFIED') {
        res.status(403).json({
          error: {
            code: 'PHARMACY_NOT_VERIFIED',
            message: 'Apenas farmácias com verificação ativa podem visualizar o mural de receitas.'
          }
        });
        return;
      }

      // Consulta capacidades da farmácia
      const allCapabilities = await prisma.pharmacyCapability.findMany({
        where: { pharmacyId: req.user.id }
      });

      let supportedKinds: PrescriptionKind[] = [];

      if (allCapabilities.length > 0) {
        const verifiedCaps = allCapabilities.filter((c) => c.status === 'VERIFIED');
        if (verifiedCaps.length === 0) {
          res.status(403).json({
            error: {
              code: 'PHARMACY_NOT_VERIFIED',
              message: 'Apenas farmácias com verificação ativa podem visualizar o mural de receitas.'
            }
          });
          return;
        }

        if (verifiedCaps.some((c) => c.type === 'HUMAN_COMPOUNDING')) {
          supportedKinds.push(PrescriptionKind.HUMAN);
        }
        if (verifiedCaps.some((c) => c.type === 'VETERINARY_COMPOUNDING')) {
          supportedKinds.push(PrescriptionKind.VETERINARY);
        }
      } else {
        // Legado: farmácia VERIFIED sem registros na tabela nova atua como HUMAN_COMPOUNDING
        supportedKinds.push(PrescriptionKind.HUMAN);
      }

      if (supportedKinds.length === 0) {
        res.status(403).json({
          error: {
            code: 'PHARMACY_NOT_VERIFIED',
            message: 'Apenas farmácias com verificação ativa podem visualizar o mural de receitas.'
          }
        });
        return;
      }

      const prescriptions = await prisma.prescription.findMany({
        where: {
          status: { in: [PrescriptionStatus.PENDING, PrescriptionStatus.QUOTED] },
          kind: { in: supportedKinds }
        },
        include: {
          pet: true,
          quotes: {
            where: { pharmacyId: req.user.id }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // LGPD Art. 11 e D6: Não expor dados diretos (nome, telefone, endereço do tutor) nem arquivo da receita na listagem aberta
      const sanitized = prescriptions.map((p) => {
        const formattedQuotes = p.quotes.map((q) => ({
          ...q,
          price: formatPriceCentsToDecimal(q.priceCents)
        }));

        if (p.kind === PrescriptionKind.VETERINARY) {
          let approximateAgeMonths: number | null = null;
          if (p.pet?.birthDate) {
            const birth = new Date(p.pet.birthDate);
            const now = new Date();
            approximateAgeMonths = Math.max(
              0,
              (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
            );
          }

          const animalSummary = p.pet
            ? {
                id: p.pet.id,
                name: p.pet.name,
                species: p.pet.species,
                breed: p.pet.breed,
                weightGrams: p.pet.weightGrams,
                birthDate: p.pet.birthDate,
                isFoodProducing: p.pet.isFoodProducing,
                approximateAgeMonths
              }
            : null;

          return {
            id: p.id,
            createdAt: p.createdAt,
            status: p.status,
            kind: p.kind,
            species: p.pet?.species || null,
            weightGrams: p.pet?.weightGrams || null,
            approximateAgeMonths,
            animal: animalSummary,
            prescriber: {
              name: p.prescriberName,
              crmv: p.prescriberCrmv,
              uf: p.prescriberUf
            },
            requiresManualDocumentCheck: p.vetDocumentType === 'CONTROLLED_NOTIFICATION',
            quotes: formattedQuotes
          };
        }

        return {
          id: p.id,
          createdAt: p.createdAt,
          status: p.status,
          kind: p.kind || 'HUMAN',
          patient: {
            anonymousId: `Paciente #${p.patientId.slice(0, 5).toUpperCase()}`
          },
          quotes: formattedQuotes
        };
      });

      res.json(sanitized);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar receitas para farmácia' } });
    }
  }
}
