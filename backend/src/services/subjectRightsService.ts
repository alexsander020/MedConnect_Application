import bcrypt from 'crypto';
import { prisma } from '../lib/prisma';
import { decryptFieldSafe, maskCpf } from '../lib/fieldEncryption';
import { AuditLogService } from './auditLogService';
import { ConsentService } from './consentService';
import { Role } from '@prisma/client';

/**
 * Serviço de Atendimento aos Direitos do Titular (LGPD Art. 18).
 * Gerencia a exportação de dados (Acesso/Portabilidade) e o fluxo de eliminação/anonimização.
 */

export class SubjectRightsService {
  /**
   * Exporta todos os dados pessoais do titular em formato JSON legível.
   */
  static async exportData(userId: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        prescriptions: {
          include: {
            quotes: {
              include: {
                order: true
              }
            }
          }
        },
        reviews: true,
        consents: true,
        animals: true
      }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Busca logs de acesso relacionados às receitas do paciente
    const prescriptionIds = user.prescriptions.map((p) => p.id);
    const accessLogs = await prisma.prescriptionAccessLog.findMany({
      where: { prescriptionId: { in: prescriptionIds } },
      orderBy: { createdAt: 'desc' }
    });

    // Registra o evento na trilha de auditoria imutável
    await AuditLogService.log({
      actorId: userId,
      actorType: Role.PATIENT,
      actorEmail: user.email,
      action: 'EXPORT_DATA',
      resource: 'User',
      resourceId: userId,
      reason: 'TITULAR_RIGHT_EXPORT_ART18',
      details: { exportDate: new Date().toISOString() },
      ipAddress,
      userAgent
    });

    return {
      metadados: {
        plataforma: 'MedConnect Marketplace Farmacêutico',
        titularId: user.id,
        dataExportacao: new Date().toISOString(),
        fundamentoLegalSugerido: 'LGPD Artigo 18, incisos II e V (Acesso e Portabilidade dos Dados)',
        avisoJuridico: '[PENDENTE DE VALIDAÇÃO JURÍDICA: Rascunho técnico de exportação de dados pessoais]'
      },
      perfil: {
        nome: user.name,
        email: user.email,
        telefone: decryptFieldSafe(user.phone),
        endereco: decryptFieldSafe(user.address),
        cpfMascarado: user.cpfLastDigits ? maskCpf(user.cpfLastDigits) : null,
        dataCadastro: user.createdAt,
        statusAnonimizado: user.isAnonymized,
        dataAnonimizacao: user.anonymizedAt
      },
      consentimentos: user.consents.map((c) => ({
        tipo: c.consentType,
        versaoDoTexto: c.textVersion,
        dataConsentimento: c.consentedAt,
        revogadoEm: c.revokedAt,
        ipRegistro: c.ipAddress,
        motivoRevogacao: c.revocationReason
      })),
      receitasMedicas: user.prescriptions.map((p) => ({
        id: p.id,
        status: p.status,
        dataEnvio: p.createdAt,
        quantidadeCotacoes: p.quotes.length,
        pedidosAssociados: p.quotes.filter((q) => q.order).map((q) => ({
          pedidoId: q.order?.id,
          status: q.order?.status,
          dataPedido: q.order?.createdAt
        }))
      })),
      avaliacoes: user.reviews.map((r) => ({
        id: r.id,
        farmaciaId: r.pharmacyId,
        nota: r.rating,
        comentario: r.comment,
        data: r.createdAt
      })),
      animais: user.animals.map((a) => ({
        id: a.id,
        nome: a.name,
        especie: a.species,
        raca: a.breed,
        pesoGramas: a.weightGrams,
        dataNascimento: a.birthDate,
        destinadoProducaoAlimentar: a.isFoodProducing,
        removidoEm: a.deletedAt,
        dataCadastro: a.createdAt
      })),
      trilhaAcessosReceitas: accessLogs.map((log) => ({
        receitaId: log.prescriptionId,
        tipoAcesso: log.accessedByType,
        dataAcesso: log.createdAt
      }))
    };
  }

  /**
   * Executa a anonimização e exclusão de dados a pedido do titular (LGPD Art. 18, VI).
   * Preserva exclusivamente o mínimo regulatório sanitário e fiscal exigido por lei.
   */
  static async anonymizeUser(userId: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        prescriptions: {
          include: {
            quotes: {
              include: { order: true }
            }
          }
        }
      }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if (user.isAnonymized) {
      return {
        success: true,
        message: 'Este usuário já se encontra anonimizado na base de dados.',
        anonymizedAt: user.anonymizedAt
      };
    }

    const now = new Date();
    const randomizedString = Math.random().toString(36).substring(2, 10);
    const anonymizedEmail = `anonimizado_${userId.substring(0, 8)}_${randomizedString}@removido.medconnect.com.br`;

    // 1. Anonimizar o registro User (remoção de identificadores diretos)
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: 'Titular Anonimizado (Direito de Exclusão LGPD)',
        email: anonymizedEmail,
        phone: null,
        address: null,
        cpfEncrypted: null,
        cpfHash: null,
        cpfLastDigits: null,
        isAnonymized: true,
        anonymizedAt: now
      }
    });

    // 2. Revogar todos os consentimentos ativos
    await ConsentService.revokeConsent({
      userId,
      ipAddress,
      userAgent,
      reason: 'SOLICITACAO_EXCLUSAO_CONTA_LGPD_ART18'
    });

    // 3. Tratamento de receitas:
    // Receitas pendentes ou sem pedidos concluídos são canceladas e o ponteiro de arquivo é desvinculado.
    // Receitas com pedidos concluídos têm sua guarda mantida por dever sanitário (ANVISA).
    let purgedFilesCount = 0;
    let retainedRegulatoryCount = 0;

    for (const prescription of user.prescriptions) {
      const hasCompletedOrder = prescription.quotes.some((q) => q.order !== null);

      if (!hasCompletedOrder) {
        await prisma.prescription.update({
          where: { id: prescription.id },
          data: {
            status: 'CANCELLED',
            fileUrl: 'ARQUIVO_EXPURGADO_EXCLUSAO_TITULAR'
          }
        });
        purgedFilesCount++;
      } else {
        retainedRegulatoryCount++;
      }
    }

    // 3.1 Animais do tutor (vertical veterinária): anonimiza identificadores livres e aplica exclusão lógica.
    // Os registros mínimos necessários a receitas/pedidos já existentes permanecem vinculados (espécie e peso).
    await prisma.animal.updateMany({
      where: { tutorId: userId },
      data: { name: 'Animal Anonimizado', breed: null, notes: null, birthDate: null }
    });
    const animalsRemoved = await prisma.animal.updateMany({
      where: { tutorId: userId, deletedAt: null },
      data: { deletedAt: now }
    });

    // 4. Registrar o evento na trilha de auditoria
    await AuditLogService.log({
      actorId: userId,
      actorType: Role.PATIENT,
      actorEmail: user.email,
      action: 'ANONYMIZE_DATA',
      resource: 'User',
      resourceId: userId,
      reason: 'TITULAR_RIGHT_DELETION_ART18',
      details: {
        purgedFilesCount,
        animalsAnonymizedCount: animalsRemoved.count,
        retainedRegulatoryCount,
        retencaoMinimaAviso: '[PENDENTE DE VALIDAÇÃO JURÍDICA: Retenção mínima obrigatória de receitas dispensadas conforme RDC ANVISA 44/2009 e Portaria 344/1998]'
      },
      ipAddress,
      userAgent
    });

    return {
      success: true,
      anonymizedAt: now,
      purgedFilesCount,
      retainedRegulatoryCount,
      animalsAnonymizedCount: animalsRemoved.count,
      mensagem: 'Dados pessoais anonimizados e excluídos com sucesso.',
      retencaoRegulatoria: {
        status: 'MINIMA_PRESERVADA',
        justificativa: 'Artigo 16, inciso I da LGPD (cumprimento de obrigação legal ou regulatória pelo controlador).',
        avisoJuridico: '[PENDENTE DE VALIDAÇÃO JURÍDICA: Prazos e escopo de retenção de receitas aviadas dependem de validação sanitária]'
      }
    };
  }
}
