import { apiErrorCode, apiErrorMessage } from '@/lib/format';

/**
 * Rótulos exclusivos das telas administrativas (trilha de auditoria, filtros).
 * Os status gerais ficam em src/constants/status.js.
 */

/**
 * Rótulos amigáveis das ações conhecidas da trilha de auditoria (backend: AuditLogService.log).
 * NÃO é uma lista fechada: a tela mostra qualquer ação que vier da API — as desconhecidas
 * aparecem pelo próprio código (ver auditActionLabel).
 */
export const AUDIT_ACTIONS = {
  ADMIN_VIEW_USER: 'Admin abriu dados de usuário',
  ADMIN_VIEW_PHARMACY: 'Admin abriu dados de farmácia',
  ADMIN_VIEW_SUPPORT_TICKET: 'Admin leu chamado de suporte',
  ADMIN_UPDATE_SUPPORT_TICKET: 'Admin atualizou chamado',
  ADMIN_SUSPEND_USER: 'Admin suspendeu usuário',
  ADMIN_REACTIVATE_USER: 'Admin reativou usuário',
  ADMIN_SUSPEND_PHARMACY: 'Admin suspendeu farmácia',
  ADMIN_REACTIVATE_PHARMACY: 'Admin reativou farmácia',
  VIEW_CONTACT_DATA: 'Farmácia acessou contato para entrega',
  UPLOAD_PRESCRIPTION: 'Paciente enviou receita',
  GIVE_CONSENT: 'Consentimento concedido',
  REVOKE_CONSENT: 'Consentimento revogado',
  PASSWORD_CHANGED: 'Senha alterada',
  EXPORT_DATA: 'Exportação de dados (LGPD)',
  ANONYMIZE_DATA: 'Anonimização de conta (LGPD)',
  DATA_RETENTION_PURGE_CYCLE: 'Ciclo de retenção de dados',
  REQUEST_VETERINARY_CAPABILITY: 'Farmácia solicitou habilitação veterinária',
  APPROVE_PHARMACY_CAPABILITY: 'Admin aprovou habilitação da farmácia',
  REJECT_PHARMACY_CAPABILITY: 'Admin recusou habilitação da farmácia',
  SUSPEND_PHARMACY_CAPABILITY: 'Admin suspendeu habilitação da farmácia',
  VIEW_CAPABILITY_EVIDENCE: 'Admin gerou link de documento de habilitação',
  OPEN_CAPABILITY_EVIDENCE_FILE: 'Admin abriu documento de habilitação',
  UPLOAD_VET_PRESCRIPTION: 'Tutor enviou receita veterinária',
};

export const AUDIT_RESOURCES = {
  User: 'Usuário',
  Pharmacy: 'Farmácia',
  Prescription: 'Receita',
  Order: 'Pedido',
  Consent: 'Consentimento',
  SupportTicket: 'Chamado de suporte',
  PharmacyCapability: 'Habilitação da farmácia',
  System: 'Sistema',
};

export const auditActionLabel = (action) => AUDIT_ACTIONS[action] || action || '—';
export const auditResourceLabel = (resource) => AUDIT_RESOURCES[resource] || resource || '—';

/** Quem fez a mudança de status do pedido / quem abriu o chamado */
export const ACTOR_LABELS = {
  PATIENT: 'Paciente',
  PHARMACY: 'Farmácia',
  ADMIN: 'Administrador',
};

export const REQUESTER_LABEL = (type) => (type ? ACTOR_LABELS[type] || type : 'Visitante');

/** Eventos de telemetria anonimizada do piloto */
export const PILOT_EVENTS = {
  quote_submitted: 'Cotação enviada',
  quote_accepted: 'Cotação aceita',
  prescription_uploaded: 'Receita enviada',
  order_delivered: 'Pedido entregue',
};

/** Identificador curto e legível (#3F2A9C1B) para pedidos e receitas */
export function shortId(id) {
  return id ? `#${String(id).replace(/-/g, '').slice(0, 8).toUpperCase()}` : '—';
}

export function toOptions(map) {
  return Object.entries(map).map(([value, entry]) => ({ value, label: typeof entry === 'string' ? entry : entry.label }));
}

/** Mensagem para erros ao suspender/reativar contas (códigos do backend) */
export function accountStatusErrorMessage(err) {
  switch (apiErrorCode(err)) {
    case 'CANNOT_SUSPEND_SELF':
      return 'Você não pode suspender a sua própria conta.';
    case 'CANNOT_SUSPEND_ADMIN':
      return 'Contas de administrador não podem ser suspensas por outro administrador.';
    case 'NOT_FOUND':
      return 'Esta conta não existe mais. Atualize a listagem.';
    default:
      return apiErrorMessage(err, 'Não foi possível alterar o status da conta.');
  }
}

/** cnpjData chega como texto JSON na fila de pendentes e já como objeto no detalhe */
export function parseCnpjData(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
