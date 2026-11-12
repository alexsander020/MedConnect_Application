/**
 * Rótulos e tons de status exibidos na interface.
 * tone → ver components/shared/StatusBadge.jsx
 */
export const orderStatuses = {
  PENDING: { label: 'Pendente', color: 'info' },
  ANALYSIS: { label: 'Em análise', color: 'info' },
  QUOTED: { label: 'Cotado', color: 'warning' },
  ACCEPTED: { label: 'Aprovado', color: 'primary' },
  APPROVED: { label: 'Aprovado', color: 'primary' },
  PRODUCTION: { label: 'Em manipulação', color: 'warning' },
  DELIVERY: { label: 'Saiu para entrega', color: 'info' },
  DELIVERED: { label: 'Entregue', color: 'success' },
  CANCELLED: { label: 'Cancelado', color: 'error' },
};

export const prescriptionStatuses = {
  PENDING: { label: 'Aguardando cotações', color: 'warning' },
  QUOTED: { label: 'Cotações recebidas', color: 'info' },
  ACCEPTED: { label: 'Cotação aprovada', color: 'primary' },
  CANCELLED: { label: 'Cancelada', color: 'error' },
};

export const quoteStatuses = {
  PENDING: { label: 'Aguardando paciente', color: 'warning' },
  ACCEPTED: { label: 'Aceita', color: 'success' },
  REJECTED: { label: 'Não escolhida', color: 'neutral' },
  EXPIRED: { label: 'Expirada', color: 'neutral' },
};

export const pharmacyVerificationStatuses = {
  PENDING_VERIFICATION: { label: 'Verificação pendente', color: 'warning' },
  VERIFIED: { label: 'Credenciada', color: 'success' },
  REJECTED: { label: 'Recusada', color: 'error' },
};

export const accountStatuses = {
  ACTIVE: { label: 'Ativa', color: 'success' },
  SUSPENDED: { label: 'Suspensa', color: 'error' },
};

export const roleLabels = {
  PATIENT: { label: 'Paciente', color: 'info' },
  PHARMACY: { label: 'Farmácia', color: 'primary' },
  ADMIN: { label: 'Administrador', color: 'neutral' },
};

export const supportTicketStatuses = {
  OPEN: { label: 'Aberto', color: 'warning' },
  IN_PROGRESS: { label: 'Em atendimento', color: 'info' },
  RESOLVED: { label: 'Resolvido', color: 'success' },
  CLOSED: { label: 'Encerrado', color: 'neutral' },
};

export const supportTicketCategories = {
  GENERAL: 'Dúvida geral',
  ORDER: 'Pedido ou entrega',
  PRESCRIPTION: 'Receita ou cotação',
  PHARMACY_ONBOARDING: 'Credenciamento de farmácia',
  PRIVACY: 'Privacidade e dados (LGPD)',
  TECHNICAL: 'Problema técnico',
};

export const consentTypeLabels = {
  HEALTH_DATA_PROCESSING: 'Tratamento de dados de saúde',
  PRESCRIPTION_UPLOAD: 'Envio e análise de receita',
  TERMS_AND_PRIVACY: 'Termos de Uso e Política de Privacidade',
};

/** Ordem da jornada do pedido (para timelines) */
export const ORDER_FLOW = ['PRODUCTION', 'DELIVERY', 'DELIVERED'];
