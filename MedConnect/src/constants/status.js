export const orderStatuses = {
    PENDING: { label: 'Pendente', color: 'info' },
    ANALYSIS: { label: 'Em Análise', color: 'info' },
    QUOTED: { label: 'Cotado', color: 'warning' },
    ACCEPTED: { label: 'Aprovado', color: 'primary' },
    APPROVED: { label: 'Aprovado', color: 'primary' },
    PRODUCTION: { label: 'Em Produção', color: 'warning' },
    DELIVERY: { label: 'Em Entrega', color: 'info' },
    DELIVERED: { label: 'Finalizado', color: 'success' },
    CANCELLED: { label: 'Cancelado', color: 'error' },
};

export const prescriptionStatuses = {
    PENDING: { label: 'Aguardando Cotações', color: 'warning' },
    QUOTED: { label: 'Cotações Recebidas', color: 'info' },
    ACCEPTED: { label: 'Cotação Aprovada', color: 'primary' },
    CANCELLED: { label: 'Cancelada', color: 'error' },
};

export const pharmacyVerificationStatuses = {
    PENDING_VERIFICATION: { label: 'Verificação Pendente', color: 'warning' },
    VERIFIED: { label: 'Credenciada', color: 'success' },
    REJECTED: { label: 'Recusada', color: 'error' },
};
