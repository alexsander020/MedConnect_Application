import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../../components/Header';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
    ShieldCheck,
    Check,
    X,
    FileText,
    AlertCircle,
    Building2,
    ExternalLink,
    Loader2,
    Ban,
    Search,
    Package,
    BarChart3,
    Clock,
    TrendingUp,
    ShoppingBag,
    Zap
} from 'lucide-react';

export default function AdminDashboard() {
    const toast = useToast();
    const queryClient = useQueryClient();

    // Abas do painel administrativo
    const [activeTab, setActiveTab] = useState('capabilities'); // 'capabilities' | 'pharmacies' | 'orders' | 'pilot'

    // Filtros da aba de Capacidades
    const [filterType, setFilterType] = useState('VETERINARY_COMPOUNDING');
    const [filterStatus, setFilterStatus] = useState('PENDING_VERIFICATION');

    // Estado de ação sobre Capacidade (approve | reject | suspend)
    const [selectedCapability, setSelectedCapability] = useState(null);
    const [capActionType, setCapActionType] = useState(null); // 'approve' | 'reject' | 'suspend'
    const [capReason, setCapReason] = useState('');
    const [checklist, setChecklist] = useState({
        mapaChecked: false,
        crmvChecked: false,
        rtCrfChecked: false
    });
    const [cnpjLookupData, setCnpjLookupData] = useState({});
    const [loadingCnpjId, setLoadingCnpjId] = useState(null);

    // Estado legado de Farmácias Pendentes
    const [selectedPharmacy, setSelectedPharmacy] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [actionType, setActionType] = useState(null); // 'approve' | 'reject'

    // 1. Query: Solicitações de Capacidades Regulatórias
    const {
        data: capabilities = [],
        isLoading: isLoadingCaps,
        isError: isErrorCaps,
        refetch: refetchCaps
    } = useQuery({
        queryKey: ['adminCapabilities', filterType, filterStatus],
        queryFn: async () => {
            const params = {};
            if (filterType !== 'ALL') params.type = filterType;
            if (filterStatus !== 'ALL') params.status = filterStatus;
            const res = await api.get('/admin/capabilities', { params });
            return res.data;
        }
    });

    // 2. Query: Farmácias Pendentes (Credenciamento Inicial)
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

    // 3. Query: Pedidos Existentes (Visibilidade ADMIN mesmo após suspensão)
    const {
        data: adminOrders = [],
        isLoading: isLoadingOrders
    } = useQuery({
        queryKey: ['adminOrders'],
        queryFn: async () => {
            const res = await api.get('/admin/orders');
            return res.data;
        },
        enabled: activeTab === 'orders'
    });

    // 4. Query: Métricas do Piloto (Fase 5)
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

    // Mutação: Aprovar / Recusar / Suspender Capacidade
    const capabilityActionMutation = useMutation({
        mutationFn: async ({ id, action, reason, checklistData }) => {
            if (action === 'approve') {
                const res = await api.patch(`/admin/capabilities/${id}/approve`, {
                    reason: reason || 'Registro MAPA, CRMV da empresa e RT/CRF conferidos pelo administrador',
                    checklist: checklistData
                });
                return res.data;
            }
            if (action === 'reject') {
                const res = await api.patch(`/admin/capabilities/${id}/reject`, {
                    reason
                });
                return res.data;
            }
            if (action === 'suspend') {
                const res = await api.patch(`/admin/capabilities/${id}/suspend`, {
                    reason
                });
                return res.data;
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['adminCapabilities'] });
            if (variables.action === 'approve') {
                toast.success('Capacidade aprovada e liberada com sucesso!');
            } else if (variables.action === 'reject') {
                toast.info('Solicitação de capacidade recusada.');
            } else if (variables.action === 'suspend') {
                toast.info('Capacidade suspensa. Pedidos já existentes seguem seu curso normal.');
            }
            setSelectedCapability(null);
            setCapActionType(null);
            setCapReason('');
            setChecklist({ mapaChecked: false, crmvChecked: false, rtCrfChecked: false });
        },
        onError: (err) => {
            toast.error(err?.response?.data?.error?.message || 'Erro ao processar ação na capacidade.');
        }
    });

    // Abertura de evidência privada por URL assinada de curta duração (com AuditLog)
    const handleOpenSignedEvidence = async (capabilityId, index) => {
        try {
            const res = await api.get(`/admin/capabilities/${capabilityId}/evidences/${index}/view-url`);
            const signedUrl = res.data?.signedUrl;
            if (signedUrl) {
                const fullUrl = signedUrl.startsWith('http')
                    ? signedUrl
                    : `${window.location.origin}${signedUrl}`;
                window.open(fullUrl, '_blank', 'noopener,noreferrer');
                toast.info('URL assinada temporária (5 min) gerada e registrada em AuditLog.');
            }
        } catch (err) {
            toast.error(err?.response?.data?.error?.message || 'Erro ao gerar URL assinada da evidência.');
        }
    };

    // Consulta de situação cadastral de CNPJ reutilizando interface da Fase 2.2
    const handleLookupCnpj = async (pharmacyId) => {
        try {
            setLoadingCnpjId(pharmacyId);
            const res = await api.get(`/admin/pharmacies/${pharmacyId}/cnpj-lookup`);
            setCnpjLookupData((prev) => ({ ...prev, [pharmacyId]: res.data }));
            toast.success('Situação cadastral do CNPJ consultada com sucesso.');
        } catch (err) {
            toast.error(err?.response?.data?.error?.message || 'Erro ao consultar situação do CNPJ.');
        } finally {
            setLoadingCnpjId(null);
        }
    };

    const handleConfirmCapabilityAction = () => {
        if (!selectedCapability) return;

        if (capActionType === 'approve') {
            if (
                selectedCapability.type === 'VETERINARY_COMPOUNDING' &&
                (!checklist.mapaChecked || !checklist.crmvChecked || !checklist.rtCrfChecked)
            ) {
                toast.error('Conclua todos os itens do checklist regulatório antes de aprovar.');
                return;
            }
        }

        if ((capActionType === 'reject' || capActionType === 'suspend') && !capReason.trim()) {
            toast.error('O motivo é obrigatório para recusar ou suspender uma capacidade.');
            return;
        }

        capabilityActionMutation.mutate({
            id: selectedCapability.id,
            action: capActionType,
            reason: capReason,
            checklistData: checklist
        });
    };

    // Mutação legada de verificação de farmácia
    const verifyMutation = useMutation({
        mutationFn: async ({ id, approved, reason }) => {
            const res = await api.patch(`/admin/pharmacies/${id}/verify`, {
                approved,
                rejectionReason: approved ? undefined : reason
            });
            return res.data;
        },
        onSuccess: (_, variables) => {
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
                <Header title="Painel Regulatório — Verificação por Capacidade & Farmácias" />

                <div className="page" style={{ maxWidth: '1024px', margin: '0 auto' }}>
                    {/* Intro Card */}
                    <div className="glass-card animate-slide-down" style={{
                        padding: 'var(--space-6)',
                        marginBottom: 'var(--space-5)',
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
                                Credenciamento Sanitário e Verificação por Capacidade
                            </h2>
                            <p style={{ margin: 0, fontSize: 'var(--font-sm)', color: 'var(--gray-600)' }}>
                                Confira registros no MAPA, CRMV da empresa, CRF do responsável técnico e evidências privadas via URL assinada auditada.
                            </p>
                        </div>
                    </div>

                    {/* Navegação por Abas */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className={`btn ${activeTab === 'capabilities' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setActiveTab('capabilities')}
                        >
                            Capacidades (MAPA / CRMV)
                        </button>
                        <button
                            type="button"
                            className={`btn ${activeTab === 'pharmacies' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setActiveTab('pharmacies')}
                        >
                            Farmácias Pendentes ({pendingPharmacies.length})
                        </button>
                        <button
                            type="button"
                            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setActiveTab('orders')}
                        >
                            Pedidos Existentes
                        </button>
                        <button
                            type="button"
                            className={`btn ${activeTab === 'pilot' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setActiveTab('pilot')}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <BarChart3 size={16} />
                            Métricas do Piloto (Fase 5)
                        </button>
                    </div>

                    {/* ABA 1: VERIFICAÇÃO POR CAPACIDADE */}
                    {activeTab === 'capabilities' && (
                        <div>
                            <div className="glass-card" style={{
                                padding: '16px',
                                marginBottom: '16px',
                                display: 'flex',
                                gap: '16px',
                                flexWrap: 'wrap',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                        Tipo de Capacidade
                                    </label>
                                    <select
                                        className="form-input"
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        style={{ minWidth: '220px' }}
                                    >
                                        <option value="VETERINARY_COMPOUNDING">Manipulação Veterinária (MAPA/CRMV)</option>
                                        <option value="HUMAN_COMPOUNDING">Manipulação Humana (ANVISA)</option>
                                        <option value="ALL">Todas as Capacidades</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                        Status da Solicitação
                                    </label>
                                    <select
                                        className="form-input"
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        style={{ minWidth: '220px' }}
                                    >
                                        <option value="PENDING_VERIFICATION">Pendente de Verificação</option>
                                        <option value="VERIFIED">Verificada (Ativa)</option>
                                        <option value="REJECTED">Recusada</option>
                                        <option value="SUSPENDED">Suspensa</option>
                                        <option value="ALL">Todos os Status</option>
                                    </select>
                                </div>
                            </div>

                            {isLoadingCaps ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '240px' }}>
                                    <Loader2 className="animate-spin" size={36} color="var(--primary-600)" />
                                </div>
                            ) : isErrorCaps ? (
                                <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                                    <AlertCircle size={36} color="var(--error)" style={{ margin: '0 auto 8px' }} />
                                    <p>Erro ao carregar solicitações de capacidade.</p>
                                    <button className="btn btn-primary" onClick={() => refetchCaps()}>Tentar Novamente</button>
                                </div>
                            ) : capabilities.length === 0 ? (
                                <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
                                    <p style={{ margin: 0, color: 'var(--gray-600)', fontWeight: 600 }}>
                                        Nenhuma solicitação encontrada para o filtro selecionado.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {capabilities.map((cap) => {
                                        const cnpjInfo = cnpjLookupData[cap.pharmacyId] || (cap.pharmacy?.cnpjData ? (() => {
                                            try { return JSON.parse(cap.pharmacy.cnpjData); } catch { return null; }
                                        })() : null);

                                        return (
                                            <div key={cap.id} className="glass-card" style={{ padding: '20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                            <Building2 size={18} color="var(--primary-600)" />
                                                            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                                                                {cap.pharmacy?.name || 'Farmácia'}
                                                            </h3>
                                                            <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                                                                {cap.type}
                                                            </span>
                                                            <span className="badge" style={{ fontSize: '11px', fontWeight: 700 }}>
                                                                {cap.status}
                                                            </span>
                                                        </div>
                                                        <p style={{ fontSize: '13px', color: 'var(--gray-600)', margin: 0 }}>
                                                            CNPJ: <strong>{cap.pharmacy?.cnpj}</strong> | E-mail: {cap.pharmacy?.email}
                                                        </p>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        <button
                                                            className="btn btn-outline"
                                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                                            onClick={() => handleLookupCnpj(cap.pharmacyId)}
                                                            disabled={loadingCnpjId === cap.pharmacyId}
                                                        >
                                                            <Search size={14} /> Situação CNPJ
                                                        </button>

                                                        {cap.status !== 'VERIFIED' && (
                                                            <button
                                                                className="btn btn-primary"
                                                                style={{ padding: '6px 14px', fontSize: '13px' }}
                                                                onClick={() => {
                                                                    setSelectedCapability(cap);
                                                                    setCapActionType('approve');
                                                                    setChecklist({
                                                                        mapaChecked: false,
                                                                        crmvChecked: false,
                                                                        rtCrfChecked: false
                                                                    });
                                                                }}
                                                            >
                                                                <Check size={15} /> Aprovar
                                                            </button>
                                                        )}

                                                        {cap.status === 'PENDING_VERIFICATION' && (
                                                            <button
                                                                className="btn btn-outline"
                                                                style={{ borderColor: 'var(--error)', color: 'var(--error)', padding: '6px 14px', fontSize: '13px' }}
                                                                onClick={() => {
                                                                    setSelectedCapability(cap);
                                                                    setCapActionType('reject');
                                                                    setCapReason('');
                                                                }}
                                                            >
                                                                <X size={15} /> Recusar
                                                            </button>
                                                        )}

                                                        {cap.status === 'VERIFIED' && (
                                                            <button
                                                                className="btn btn-outline"
                                                                style={{ borderColor: '#d97706', color: '#d97706', padding: '6px 14px', fontSize: '13px' }}
                                                                onClick={() => {
                                                                    setSelectedCapability(cap);
                                                                    setCapActionType('suspend');
                                                                    setCapReason('');
                                                                }}
                                                            >
                                                                <Ban size={15} /> Suspender Capacidade
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Dados Regulatórios de Manipulação Veterinária */}
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                                    gap: '12px',
                                                    marginTop: '14px',
                                                    padding: '12px',
                                                    background: 'rgba(249, 250, 251, 0.8)',
                                                    borderRadius: '8px'
                                                }}>
                                                    <div>
                                                        <span style={{ fontSize: '11px', color: 'var(--gray-500)', display: 'block' }}>Registro no MAPA:</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700 }}>{cap.mapaRegistrationNumber || 'N/A'}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: '11px', color: 'var(--gray-500)', display: 'block' }}>CRMV da Empresa / UF:</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700 }}>
                                                            {cap.crmvCompanyRegistration ? `${cap.crmvCompanyRegistration} / ${cap.crmvCompanyUf || ''}` : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontSize: '11px', color: 'var(--gray-500)', display: 'block' }}>Responsável Técnico (RT) e CRF:</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700 }}>
                                                            {cap.technicalResponsibleName
                                                                ? `${cap.technicalResponsibleName} (CRF ${cap.technicalResponsibleCrf || ''}/${cap.technicalResponsibleCrfUf || ''})`
                                                                : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Situação Cadastral CNPJ (Fase 2.2 reutilizada) */}
                                                {cnpjInfo && (
                                                    <div style={{
                                                        marginTop: '10px',
                                                        padding: '10px 12px',
                                                        background: 'rgba(238, 242, 255, 0.7)',
                                                        borderRadius: '8px',
                                                        fontSize: '12px'
                                                    }}>
                                                        <strong>Situação Cadastral CNPJ:</strong> {cnpjInfo.situacaoCadastral || 'ATIVA'} | Razão Social: {cnpjInfo.razaoSocial || cap.pharmacy?.name} ({cnpjInfo.municipio || ''}/{cnpjInfo.uf || ''})
                                                    </div>
                                                )}

                                                {/* Documentos de Evidência Privados (Acesso exclusivo via URL assinada temporária) */}
                                                {Array.isArray(cap.evidenceFileKeys) && cap.evidenceFileKeys.length > 0 && (
                                                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-700)' }}>
                                                            Evidências Privadas:
                                                        </span>
                                                        {cap.evidenceFileKeys.map((_, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                className="btn btn-outline"
                                                                style={{ padding: '4px 10px', fontSize: '12px' }}
                                                                onClick={() => handleOpenSignedEvidence(cap.id, idx)}
                                                            >
                                                                <FileText size={13} /> Abrir Evidência #{idx + 1} (URL Assinada) <ExternalLink size={11} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {cap.rejectionReason && (
                                                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#b91c1c', fontWeight: 600 }}>
                                                        Motivo Registrado: {cap.rejectionReason}
                                                    </div>
                                                )}

                                                {cap.status === 'VERIFIED' && cap.verifiedAt && (
                                                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#15803d', fontWeight: 600 }}>
                                                        Aprovada em {new Date(cap.verifiedAt).toLocaleString('pt-BR')} pelo ADMIN {cap.verifiedByAdminId ? `(ID: ${cap.verifiedByAdminId})` : ''}
                                                    </div>
                                                )}

                                                {cap.status !== 'PENDING_VERIFICATION' && cap.status !== 'VERIFIED' && cap.updatedAt && (
                                                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--gray-600)' }}>
                                                        Última ação em {new Date(cap.updatedAt).toLocaleString('pt-BR')}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ABA 2: FARMÁCIAS PENDENTES (CREDENCIAMENTO INICIAL) */}
                    {activeTab === 'pharmacies' && (
                        isLoading ? (
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
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* ABA 3: PEDIDOS EXISTENTES (VISIBILIDADE ADMIN) */}
                    {activeTab === 'orders' && (
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px' }}>
                                Acompanhamento de Pedidos em Curso (Incluindo Capacidades Suspensas)
                            </h3>
                            {isLoadingOrders ? (
                                <Loader2 className="animate-spin" size={28} color="var(--primary-600)" />
                            ) : adminOrders.length === 0 ? (
                                <p style={{ color: 'var(--gray-600)' }}>Nenhum pedido registrado no momento.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {adminOrders.map((o) => (
                                        <div key={o.id} style={{
                                            padding: '12px',
                                            background: 'rgba(249, 250, 251, 0.9)',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '14px' }}>
                                                    <Package size={14} style={{ display: 'inline', marginRight: 6 }} />
                                                    Pedido #{o.id.slice(0, 8)} — {o.quote?.pharmacy?.name}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                                                    Tipo: {o.quote?.prescription?.kind} | Valor: R$ {o.quote?.price}
                                                </div>
                                            </div>
                                            <span className="badge">{o.status}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ABA 4: MÉTRICAS DO PILOTO (FASE 5) */}
                    {activeTab === 'pilot' && (
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
                    )}
                </div>
            </div>

            {/* Modal de Ação sobre Capacidade Regulatória (Checklist + Aprovar/Recusar/Suspender) */}
            {selectedCapability && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div className="glass-card animate-scale-in" style={{
                        maxWidth: '520px', width: '100%', padding: '24px', background: 'white'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>
                            {capActionType === 'approve'
                                ? 'Conferência e Aprovação de Capacidade'
                                : capActionType === 'reject'
                                    ? 'Recusar Solicitação de Capacidade'
                                    : 'Suspender Capacidade Verificada'}
                        </h3>

                        {capActionType === 'approve' && selectedCapability.type === 'VETERINARY_COMPOUNDING' && (
                            <div style={{
                                marginBottom: '16px',
                                padding: '14px',
                                background: '#f8fafc',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <p style={{ fontSize: '12px', fontWeight: 700, margin: '0 0 10px', color: 'var(--gray-700)' }}>
                                    Checklist Regulatório Obrigatório (Conferência pelo ADMIN):
                                </p>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={checklist.mapaChecked}
                                        onChange={(e) => setChecklist((prev) => ({ ...prev, mapaChecked: e.target.checked }))}
                                    />
                                    Registro MAPA conferido ({selectedCapability.mapaRegistrationNumber})
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={checklist.crmvChecked}
                                        onChange={(e) => setChecklist((prev) => ({ ...prev, crmvChecked: e.target.checked }))}
                                    />
                                    CRMV da empresa conferido ({selectedCapability.crmvCompanyRegistration}/{selectedCapability.crmvCompanyUf})
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={checklist.rtCrfChecked}
                                        onChange={(e) => setChecklist((prev) => ({ ...prev, rtCrfChecked: e.target.checked }))}
                                    />
                                    RT e CRF conferidos ({selectedCapability.technicalResponsibleName} - CRF {selectedCapability.technicalResponsibleCrf}/{selectedCapability.technicalResponsibleCrfUf})
                                </label>
                            </div>
                        )}

                        {(capActionType === 'reject' || capActionType === 'suspend') && (
                            <>
                                <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '8px' }}>
                                    {capActionType === 'suspend'
                                        ? 'A suspensão impede novas cotações e oculta o mural veterinário imediatamente, mas preserva cotações e pedidos já em andamento.'
                                        : 'Informe o motivo técnico/regulatório da recusa (obrigatório):'}
                                </p>
                                <textarea
                                    className="form-input form-textarea"
                                    rows={3}
                                    placeholder="Informe o motivo obrigatório para registro em trilha de auditoria..."
                                    value={capReason}
                                    onChange={(e) => setCapReason(e.target.value)}
                                    style={{ width: '100%', marginBottom: '16px' }}
                                />
                            </>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                className="btn btn-outline"
                                onClick={() => {
                                    setSelectedCapability(null);
                                    setCapActionType(null);
                                    setCapReason('');
                                }}
                                disabled={capabilityActionMutation.isPending}
                            >
                                Cancelar
                            </button>
                            <button
                                className={`btn ${capActionType === 'approve' ? 'btn-primary' : 'btn-error'}`}
                                onClick={handleConfirmCapabilityAction}
                                disabled={capabilityActionMutation.isPending}
                            >
                                {capabilityActionMutation.isPending ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : capActionType === 'approve' ? (
                                    'Confirmar Aprovação'
                                ) : capActionType === 'reject' ? (
                                    'Confirmar Recusa'
                                ) : (
                                    'Confirmar Suspensão'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Legada de Confirmação / Recusa de Farmácia */}
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
                            >
                                Cancelar
                            </button>
                            <button
                                className={`btn ${actionType === 'approve' ? 'btn-primary' : 'btn-error'}`}
                                onClick={handleConfirmAction}
                            >
                                {actionType === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Recusa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
