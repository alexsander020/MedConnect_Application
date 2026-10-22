import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../../components/Header';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ShieldCheck, Check, X, FileText, AlertCircle, Building2, User, ExternalLink, Loader2 } from 'lucide-react';

export default function AdminDashboard() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [selectedPharmacy, setSelectedPharmacy] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [actionType, setActionType] = useState(null); // 'approve' | 'reject'

    const {
        data: pendingPharmacies = [],
        isLoading,
        isError,
        refetch
    } = useQuery({
        queryKey: ['adminPendingPharmacies'],
        queryFn: async () => {
            const res = await api.get('/admin/pharmacies/pending');
            return res.data;
        }
    });

    const verifyMutation = useMutation({
        mutationFn: async ({ id, approved, reason }) => {
            const res = await api.patch(`/admin/pharmacies/${id}/verify`, {
                approved,
                rejectionReason: approved ? undefined : reason
            });
            return res.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['adminPendingPharmacies'] });
            if (variables.approved) {
                toast.success('Farmácia aprovada e credenciada com sucesso!');
            } else {
                toast.info('Credenciamento da farmácia recusado.');
            }
            setSelectedPharmacy(null);
            setRejectionReason('');
            setActionType(null);
        },
        onError: (err) => {
            toast.error(err?.response?.data?.error?.message || 'Erro ao processar verificação da farmácia.');
        }
    });

    const handleConfirmAction = () => {
        if (!selectedPharmacy) return;
        if (actionType === 'reject' && !rejectionReason.trim()) {
            toast.error('Informe o motivo da recusa.');
            return;
        }

        verifyMutation.mutate({
            id: selectedPharmacy.id,
            approved: actionType === 'approve',
            reason: rejectionReason
        });
    };

    return (
        <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="aurora-blob aurora-blob-1" />
            <div className="aurora-blob aurora-blob-2" />

            <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                <Header title="Painel Regulatório — Farmácias Pendentes" />

                <div className="page" style={{ maxWidth: '960px', margin: '0 auto' }}>
                    {/* Intro Card */}
                    <div className="glass-card animate-slide-down" style={{
                        padding: 'var(--space-6)',
                        marginBottom: 'var(--space-6)',
                        background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.9) 0%, rgba(255, 255, 255, 0.95) 100%)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-4)'
                    }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: 14,
                            background: 'rgba(99, 102, 241, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <ShieldCheck size={28} color="var(--primary-600)" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, margin: '0 0 4px', color: 'var(--gray-900)' }}>
                                Credenciamento Sanitário e Fiscal
                            </h2>
                            <p style={{ margin: 0, fontSize: 'var(--font-sm)', color: 'var(--gray-600)' }}>
                                Analise alvarás sanitários, certidões do CRF e dados cadastrais antes de autorizar o envio de cotações.
                            </p>
                        </div>
                    </div>

                    {/* Content States */}
                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                            <Loader2 className="animate-spin" size={40} color="var(--primary-600)" />
                        </div>
                    ) : isError ? (
                        <div className="glass-card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <AlertCircle size={40} color="var(--error)" style={{ margin: '0 auto 12px' }} />
                            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: 8 }}>Erro ao carregar solicitações</h3>
                            <p style={{ color: 'var(--gray-600)', marginBottom: 16 }}>Não foi possível buscar as farmácias pendentes.</p>
                            <button className="btn btn-primary" onClick={() => refetch()}>Tentar Novamente</button>
                        </div>
                    ) : pendingPharmacies.length === 0 ? (
                        <div className="glass-card" style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: '50%',
                                background: 'rgba(16, 185, 129, 0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                <Check size={32} color="var(--success)" />
                            </div>
                            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: 8 }}>Nenhuma farmácia pendente</h3>
                            <p style={{ color: 'var(--gray-600)' }}>Todas as farmácias cadastradas já foram avaliadas pelo comitê regulatório.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            {pendingPharmacies.map((pharmacy) => (
                                <div key={pharmacy.id} className="glass-card animate-slide-up" style={{ padding: 'var(--space-5)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <Building2 size={20} color="var(--primary-600)" />
                                                <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 800, margin: 0, color: 'var(--gray-900)' }}>
                                                    {pharmacy.name}
                                                </h3>
                                                <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                                                    Aguardando Validação
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '13px', color: 'var(--gray-600)', margin: '0 0 8px' }}>
                                                CNPJ: <strong>{pharmacy.cnpj}</strong> | E-mail: {pharmacy.email}
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                className="btn btn-outline"
                                                style={{ borderColor: 'var(--error)', color: 'var(--error)', padding: '6px 14px', fontSize: '13px' }}
                                                onClick={() => {
                                                    setSelectedPharmacy(pharmacy);
                                                    setActionType('reject');
                                                }}
                                            >
                                                <X size={15} /> Recusar
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                style={{ padding: '6px 14px', fontSize: '13px' }}
                                                onClick={() => {
                                                    setSelectedPharmacy(pharmacy);
                                                    setActionType('approve');
                                                }}
                                            >
                                                <Check size={15} /> Aprovar
                                            </button>
                                        </div>
                                    </div>

                                    {/* Regulatory Details Grid */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                        gap: '12px',
                                        marginTop: '12px',
                                        padding: '12px',
                                        background: 'rgba(249, 250, 251, 0.7)',
                                        borderRadius: '8px'
                                    }}>
                                        <div>
                                            <span style={{ fontSize: '11px', color: 'var(--gray-500)', display: 'block' }}>Licença Sanitária:</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{pharmacy.sanitaryLicense || 'Não informada'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '11px', color: 'var(--gray-500)', display: 'block' }}>Autorização (AFE/ANVISA):</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{pharmacy.operatingAuth || 'Não informada'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '11px', color: 'var(--gray-500)', display: 'block' }}>Responsável Técnico:</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600 }}>
                                                {pharmacy.technicalResponsibleName ? `${pharmacy.technicalResponsibleName} (${pharmacy.technicalResponsibleCrf || ''}/${pharmacy.technicalResponsibleUf || ''})` : 'Não informado'}
                                            </span>
                                        </div>
                                        {pharmacy.documentUrl && (
                                            <div>
                                                <span style={{ fontSize: '11px', color: 'var(--gray-500)', display: 'block' }}>Documento Comprobatório:</span>
                                                <a
                                                    href={pharmacy.documentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ fontSize: '13px', color: 'var(--primary-600)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                                                >
                                                    Visualizar Anexo <ExternalLink size={12} />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Confirmação / Recusa */}
            {selectedPharmacy && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div className="glass-card animate-scale-in" style={{
                        maxWidth: '480px', width: '100%', padding: '24px', background: 'white'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>
                            {actionType === 'approve' ? 'Aprovar Farmácia?' : 'Recusar Credenciamento'}
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '16px' }}>
                            {actionType === 'approve'
                                ? `Tem certeza que deseja aprovar e liberar as operações de "${selectedPharmacy.name}"?`
                                : `Informe o motivo regulatório para a recusa de "${selectedPharmacy.name}":`}
                        </p>

                        {actionType === 'reject' && (
                            <textarea
                                className="form-input form-textarea"
                                rows={3}
                                placeholder="Ex.: Licença sanitária com data de validade expirada..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                style={{ width: '100%', marginBottom: '16px' }}
                            />
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                className="btn btn-outline"
                                onClick={() => {
                                    setSelectedPharmacy(null);
                                    setActionType(null);
                                    setRejectionReason('');
                                }}
                                disabled={verifyMutation.isPending}
                            >
                                Cancelar
                            </button>
                            <button
                                className={`btn ${actionType === 'approve' ? 'btn-primary' : 'btn-error'}`}
                                onClick={handleConfirmAction}
                                disabled={verifyMutation.isPending}
                            >
                                {verifyMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : actionType === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Recusa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
