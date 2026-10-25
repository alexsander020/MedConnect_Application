import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../../components/Header';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ShieldCheck, Check, X, FileText, AlertCircle, Building2, User, ExternalLink, Loader2, BarChart3, Clock, TrendingUp, ShoppingBag, Users, Zap } from 'lucide-react';

export default function AdminDashboard() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'pilot'
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

    const {
        data: pilotData,
        isLoading: isPilotLoading,
        isError: isPilotError,
        refetch: refetchPilot
    } = useQuery({
        queryKey: ['adminPilotMetrics'],
        queryFn: async () => {
            const res = await api.get('/admin/pilot-metrics');
            return res.data;
        },
        enabled: activeTab === 'pilot'
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
                <Header title="Painel Administrativo e Regulatório" />

                <div className="page" style={{ maxWidth: '960px', margin: '0 auto' }}>
                    {/* Tab Navigation */}
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                        <button
                            type="button"
                            className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('pending')}
                            style={{ borderRadius: '20px', padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <Building2 size={16} />
                            Farmácias Pendentes ({pendingPharmacies.length})
                        </button>
                        <button
                            type="button"
                            className={`btn ${activeTab === 'pilot' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('pilot')}
                            style={{ borderRadius: '20px', padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <BarChart3 size={16} />
                            Métricas do Piloto (Fase 5)
                        </button>
                    </div>

                    {activeTab === 'pilot' ? (
                        /* Pilot Metrics Tab Content */
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div className="glass-card" style={{
                                padding: 'var(--space-6)',
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
                                    <BarChart3 size={28} color="var(--primary-600)" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, margin: '0 0 4px', color: 'var(--gray-900)' }}>
                                        Painel de Validação do Piloto (4 Semanas)
                                    </h2>
                                    <p style={{ margin: 0, fontSize: 'var(--font-sm)', color: 'var(--gray-600)' }}>
                                        Telemetria de negócio agregada e anonimizada (Privacy-by-Design, sem PII de pacientes ou receitas).
                                    </p>
                                </div>
                            </div>

                            {isPilotLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                                    <Loader2 className="animate-spin" size={40} color="var(--primary-600)" />
                                </div>
                            ) : isPilotError ? (
                                <div className="glass-card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                                    <AlertCircle size={32} color="var(--error)" style={{ margin: '0 auto 8px' }} />
                                    <p style={{ color: 'var(--gray-700)' }}>Não foi possível carregar as métricas do piloto.</p>
                                    <button className="btn btn-primary" onClick={() => refetchPilot()}>Recarregar</button>
                                </div>
                            ) : (
                                <>
                                    {/* Grid de KPIs do Piloto */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                                        {/* KPI 1: TTFQ */}
                                        <div className="glass-card" style={{ padding: 'var(--space-4)', borderLeft: '4px solid var(--primary-600)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase' }}>TTFQ Médio</span>
                                                <Clock size={16} color="var(--primary-600)" />
                                            </div>
                                            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gray-900)' }}>
                                                {pilotData?.metrics?.avgTtfqMinutes || 0} min
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: 4 }}>
                                                Meta: ≤ {pilotData?.targets?.ttfqMinutesMax} min
                                            </div>
                                        </div>

                                        {/* KPI 2: Cotações por Receita */}
                                        <div className="glass-card" style={{ padding: 'var(--space-4)', borderLeft: '4px solid #10b981' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Cotações / Receita</span>
                                                <Zap size={16} color="#10b981" />
                                            </div>
                                            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gray-900)' }}>
                                                {pilotData?.metrics?.quotesPerPrescription || 0}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: 4 }}>
                                                Meta: ≥ {pilotData?.targets?.quotesPerPrescriptionMin}
                                            </div>
                                        </div>

                                        {/* KPI 3: Taxa de Aceitação */}
                                        <div className="glass-card" style={{ padding: 'var(--space-4)', borderLeft: '4px solid #f59e0b' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Taxa de Aceitação</span>
                                                <TrendingUp size={16} color="#f59e0b" />
                                            </div>
                                            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gray-900)' }}>
                                                {pilotData?.metrics?.acceptanceRate || 0}%
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: 4 }}>
                                                Meta: ≥ {pilotData?.targets?.acceptanceRateMin}%
                                            </div>
                                        </div>

                                        {/* KPI 4: Pedidos Concluídos */}
                                        <div className="glass-card" style={{ padding: 'var(--space-4)', borderLeft: '4px solid #8b5cf6' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Pedidos Entregues</span>
                                                <ShoppingBag size={16} color="#8b5cf6" />
                                            </div>
                                            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gray-900)' }}>
                                                {pilotData?.metrics?.deliveredOrders || 0} / {pilotData?.metrics?.totalOrders || 0}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: 4 }}>
                                                Farmácias ativas: {pilotData?.metrics?.activePharmacies || 0}
                                            </div>
                                        </div>

                                        {/* KPI 5: Vazamento Estimado */}
                                        <div className="glass-card" style={{ padding: 'var(--space-4)', borderLeft: '4px solid #ef4444' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Vazamento Estimado</span>
                                                <AlertCircle size={16} color="#ef4444" />
                                            </div>
                                            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gray-900)' }}>
                                                {pilotData?.metrics?.leakageEstimatePercent || 0}%
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: 4 }}>
                                                Meta de segurança: ≤ {pilotData?.targets?.leakageMax}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Amostra de Eventos Anonimizados (Privacy-by-Design) */}
                                    <div className="glass-card" style={{ padding: 'var(--space-5)' }}>
                                        <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 800, marginBottom: 'var(--space-3)', color: 'var(--gray-900)' }}>
                                            Últimos Eventos de Telemetria (Sem Dados Pessoais)
                                        </h3>
                                        {(!pilotData?.anonymizedEvents || pilotData.anonymizedEvents.length === 0) ? (
                                            <p style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)', margin: 0 }}>
                                                Nenhum evento registrado ainda na região do piloto.
                                            </p>
                                        ) : (
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid var(--gray-200)', textAlign: 'left', color: 'var(--gray-600)' }}>
                                                            <th style={{ padding: '8px' }}>Evento</th>
                                                            <th style={{ padding: '8px' }}>ID Opaco</th>
                                                            <th style={{ padding: '8px' }}>Tempo Resposta</th>
                                                            <th style={{ padding: '8px' }}>Valor (R$)</th>
                                                            <th style={{ padding: '8px' }}>Data/Hora</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {pilotData.anonymizedEvents.map((evt, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                                                                <td style={{ padding: '8px', fontWeight: 700, color: 'var(--primary-700)' }}>{evt.event}</td>
                                                                <td style={{ padding: '8px', fontFamily: 'monospace', color: 'var(--gray-600)' }}>{evt.anonymousId}</td>
                                                                <td style={{ padding: '8px' }}>{evt.timeToQuoteMinutes ? `${evt.timeToQuoteMinutes} min` : '-'}</td>
                                                                <td style={{ padding: '8px' }}>{evt.priceCents ? `R$ ${(evt.priceCents / 100).toFixed(2)}` : '-'}</td>
                                                                <td style={{ padding: '8px', color: 'var(--gray-500)' }}>{new Date(evt.timestamp).toLocaleString('pt-BR')}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        /* Pending Pharmacies Tab Content */
                        <>
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
                                                    <p style={{ margin: '0 0 8px', fontSize: 'var(--font-sm)', color: 'var(--gray-600)' }}>
                                                        CNPJ: <strong>{pharmacy.cnpj}</strong> | E-mail: {pharmacy.email}
                                                    </p>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}
                                                        onClick={() => {
                                                            setSelectedPharmacy(pharmacy);
                                                            setActionType('approve');
                                                        }}
                                                    >
                                                        <Check size={14} /> Aprovar
                                                    </button>
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ background: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}
                                                        onClick={() => {
                                                            setSelectedPharmacy(pharmacy);
                                                            setActionType('reject');
                                                        }}
                                                    >
                                                        <X size={14} /> Recusar
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Detalhes Técnicos e Sanitários */}
                                            <div style={{
                                                marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--gray-200)',
                                                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, fontSize: '12px'
                                            }}>
                                                <div><strong>Resp. Técnico:</strong> {pharmacy.technicalResponsibleName || 'Não informado'}</div>
                                                <div><strong>CRF:</strong> {pharmacy.technicalResponsibleCrf ? `${pharmacy.technicalResponsibleCrf}/${pharmacy.technicalResponsibleUf}` : 'Não informado'}</div>
                                                <div><strong>Alvará Sanitário:</strong> {pharmacy.sanitaryLicense || 'Não informado'}</div>
                                                <div><strong>AFE ANVISA:</strong> {pharmacy.operatingAuth || 'Não informado'}</div>
                                                {pharmacy.documentUrl && (
                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                        <a
                                                            href={pharmacy.documentUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ color: 'var(--primary-600)', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'underline' }}
                                                        >
                                                            <FileText size={14} /> Visualizar Documento Comprobatório Sanitário <ExternalLink size={12} />
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
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
