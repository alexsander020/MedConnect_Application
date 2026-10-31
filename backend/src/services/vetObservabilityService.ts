import { prisma } from '../lib/prisma';

export interface VetMetricsSummary {
  prescriptionsCreated: number;
  quotesCreated: number;
  quotesAccepted: number;
  acceptanceRatePercent: number;
  capabilityRequestsByStatus: {
    PENDING_VERIFICATION: number;
    VERIFIED: number;
    REJECTED: number;
    SUSPENDED: number;
  };
  errorsByCode: Record<string, number>;
}

// Armazenamento em memória de contadores de eventos e erros operacionais
const memoryErrorCounts: Record<string, number> = {
  ANIMAL_FOOD_PRODUCING_NOT_SUPPORTED: 0,
  CONTROLLED_NOT_SUPPORTED: 0,
  VET_FEATURE_DISABLED: 0,
  VET_CAPABILITY_REQUIRED: 0,
  INVALID_PRESCRIBER_CRMV: 0
};

let memoryPrescriptionsCreated = 0;
let memoryQuotesCreated = 0;
let memoryQuotesAccepted = 0;
const memoryCapabilityStatusCounts: Record<string, number> = {
  PENDING_VERIFICATION: 0,
  VERIFIED: 0,
  REJECTED: 0,
  SUSPENDED: 0
};

// Chaves sensíveis que NUNCA devem aparecer nos logs estruturados (LGPD Art. 11 e Art. 46)
const SENSITIVE_KEYS = new Set([
  'cpf',
  'cnpj',
  'email',
  'phone',
  'telefone',
  'address',
  'endereco',
  'patientname',
  'nome',
  'password',
  'token',
  'medication',
  'medicationstext',
  'notes',
  'diagnosis',
  'controllednotificationnumber',
  'evidencefilekeys'
]);

function sanitizeMetadata(data?: Record<string, any>): Record<string, any> {
  if (!data) return {};
  const cleaned: Record<string, any> = {};

  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      continue;
    }
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      cleaned[k] = sanitizeMetadata(v);
    } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      cleaned[k] = v;
    }
  }

  return cleaned;
}

export class VetObservabilityService {
  /**
   * Emite log estruturado sanitizado (sem dados pessoais nem dados de saúde/receita)
   */
  public logVetEvent(event: string, metadata?: Record<string, any>): void {
    const sanitized = sanitizeMetadata(metadata);
    const structuredLog = {
      timestamp: new Date().toISOString(),
      type: 'VET_OBSERVABILITY',
      event,
      ...sanitized
    };
    // Emissão padronizada em stdout para ingestão por ferramentas de observabilidade
    console.log(JSON.stringify(structuredLog));
  }

  /**
   * Registra a criação de uma receita veterinária
   */
  public recordPrescriptionCreated(metadata?: { species?: string; vetDocumentType?: string }): void {
    memoryPrescriptionsCreated += 1;
    this.logVetEvent('prescription.created.veterinary', metadata);
  }

  /**
   * Registra a emissão de uma cotação veterinária
   */
  public recordQuoteCreated(metadata?: { pharmaceuticalForm?: string; deliveryDays?: number }): void {
    memoryQuotesCreated += 1;
    this.logVetEvent('quote.created.veterinary', metadata);
  }

  /**
   * Registra o aceite de uma cotação veterinária (conversão em pedido)
   */
  public recordQuoteAccepted(metadata?: { orderId?: string }): void {
    memoryQuotesAccepted += 1;
    this.logVetEvent('quote.accepted.veterinary', metadata);
  }

  /**
   * Registra transição de status de solicitação de capacidade
   */
  public recordCapabilityStatus(status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED'): void {
    if (memoryCapabilityStatusCounts[status] !== undefined) {
      memoryCapabilityStatusCounts[status] += 1;
    }
    this.logVetEvent(`pharmacy.capability.${status.toLowerCase()}`);
  }

  /**
   * Registra contagem de erros de negócio por código (ex: ANIMAL_FOOD_PRODUCING_NOT_SUPPORTED, CONTROLLED_NOT_SUPPORTED)
   */
  public recordErrorCode(code: string, context?: { route?: string }): void {
    memoryErrorCounts[code] = (memoryErrorCounts[code] || 0) + 1;
    this.logVetEvent('error.veterinary_code', { code, ...context });
  }

  /**
   * Retorna resumo consolidado de métricas da vertical veterinária
   * Combina contadores persistentes do banco com registros em memória
   */
  public async getVetMetrics(): Promise<VetMetricsSummary> {
    let dbPrescriptions = 0;
    let dbQuotes = 0;
    let dbAccepted = 0;
    const dbCapByStatus: Record<string, number> = {
      PENDING_VERIFICATION: 0,
      VERIFIED: 0,
      REJECTED: 0,
      SUSPENDED: 0
    };

    try {
      const [pCount, qCount, aCount, capGroups] = await Promise.all([
        prisma.prescription.count({ where: { kind: 'VETERINARY' } }).catch(() => 0),
        prisma.quote.count({ where: { prescription: { kind: 'VETERINARY' } } }).catch(() => 0),
        prisma.quote.count({ where: { status: 'ACCEPTED', prescription: { kind: 'VETERINARY' } } }).catch(() => 0),
        prisma.pharmacyCapability.groupBy({
          by: ['status'],
          where: { type: 'VETERINARY_COMPOUNDING' },
          _count: { _all: true }
        }).catch(() => [])
      ]);

      dbPrescriptions = pCount;
      dbQuotes = qCount;
      dbAccepted = aCount;

      for (const group of capGroups) {
        if (dbCapByStatus[group.status] !== undefined) {
          dbCapByStatus[group.status] = group._count._all;
        }
      }
    } catch {
      // Fallback gracioso para contadores em memória se o banco estiver indisponível
    }

    const totalQuotes = Math.max(dbQuotes, memoryQuotesCreated);
    const totalAccepted = Math.max(dbAccepted, memoryQuotesAccepted);
    const acceptanceRate = totalQuotes > 0 ? Number(((totalAccepted / totalQuotes) * 100).toFixed(2)) : 0;

    return {
      prescriptionsCreated: Math.max(dbPrescriptions, memoryPrescriptionsCreated),
      quotesCreated: totalQuotes,
      quotesAccepted: totalAccepted,
      acceptanceRatePercent: acceptanceRate,
      capabilityRequestsByStatus: {
        PENDING_VERIFICATION: Math.max(dbCapByStatus.PENDING_VERIFICATION, memoryCapabilityStatusCounts.PENDING_VERIFICATION),
        VERIFIED: Math.max(dbCapByStatus.VERIFIED, memoryCapabilityStatusCounts.VERIFIED),
        REJECTED: Math.max(dbCapByStatus.REJECTED, memoryCapabilityStatusCounts.REJECTED),
        SUSPENDED: Math.max(dbCapByStatus.SUSPENDED, memoryCapabilityStatusCounts.SUSPENDED)
      },
      errorsByCode: { ...memoryErrorCounts }
    };
  }

  /**
   * Reseta contadores em memória (usado para isolamento em suítes de testes)
   */
  public resetMetricsForTesting(): void {
    memoryPrescriptionsCreated = 0;
    memoryQuotesCreated = 0;
    memoryQuotesAccepted = 0;
    for (const key of Object.keys(memoryCapabilityStatusCounts)) {
      memoryCapabilityStatusCounts[key] = 0;
    }
    for (const key of Object.keys(memoryErrorCounts)) {
      memoryErrorCounts[key] = 0;
    }
  }
}

export const vetObservabilityService = new VetObservabilityService();
