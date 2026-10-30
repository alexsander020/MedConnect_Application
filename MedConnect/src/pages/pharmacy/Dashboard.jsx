import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { orderStatuses } from '../../constants/status';
import {
    Clock,
    TrendingUp,
    AlertTriangle,
    ShieldCheck,
    Loader2,
    ArrowRight,
    Package,
    Upload
} from 'lucide-react';

export default function PharmacyDashboard() {
    const navigate = useNavigate();
    const toast = useToast();
    const queryClient = useQueryClient();

    const [showVetModal, setShowVetModal] = useState(false);
    const [vetForm, setVetForm] = useState({
        mapaRegistrationNumber: '',
        crmvCompanyRegistration: '',
        crmvCompanyUf: 'SP',
        technicalResponsibleName: '',
        technicalResponsibleCrf: '',
        technicalResponsibleCrfUf: 'SP',
        files: []
    });

    // 1. Estatísticas consolidadas da farmácia autenticada (inclui capabilities)
    const {
        data: stats = {},
        isLoading: isLoadingStats
    } = useQuery({
        queryKey: ['pharmacyStats'],
        queryFn: async () => {
            const res = await api.get('/pharmacy/stats');
            return res.data;
        }
    });

    // 2. Receitas disponíveis para envio de cotação
    const {
        data: availablePrescriptions = [],
        isLoading: isLoadingRequests
    } = useQuery({
        queryKey: ['availablePrescriptions'],
        queryFn: async () => {
            try {
                const res = await api.get('/prescriptions/pharmacy');
                return Array.isArray(res.data) ? res.data : [];
            } catch {
                return [];
            }
        }
    });

    // 3. Pedidos em andamento / produção
    const {
        data: pharmacyOrders = [],
        isLoading: isLoadingOrders
    } = useQuery({
        queryKey: ['pharmacyOrders'],
        queryFn: async () => {
            try {
                const res = await api.get('/orders/my');
                return Array.isArray(res.data) ? res.data : [];
            } catch {
                return [];
            }
        }
    });

    const requestVetMutation = useMutation({
        mutationFn: async (formData) => {
            const res = await api.post('/pharmacy/capabilities/veterinary', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pharmacyStats'] });
            toast.success('Solicitação de capacidade veterinária enviada para verificação do ADMIN!');
            setShowVetModal(false);
        },
        onError: (err) => {
            toast.error(err?.response?.data?.error?.message || 'Erro ao solicitar capacidade veterinária.');
        }
    });

    const handleVetSubmit = (e) => {
        e.preventDefault();
        if (!vetForm.files || vetForm.files.length === 0) {
            toast.error('Anexe pelo menos um documento de evidência (PDF, JPG ou PNG).');
            return;
        }
        const fd = new FormData();
        fd.append('mapaRegistrationNumber', vetForm.mapaRegistrationNumber);
        fd.append('crmvCompanyRegistration', vetForm.crmvCompanyRegistration);
        fd.append('crmvCompanyUf', vetForm.crmvCompanyUf);
        fd.append('technicalResponsibleName', vetForm.technicalResponsibleName);
        fd.append('technicalResponsibleCrf', vetForm.technicalResponsibleCrf);
        fd.append('technicalResponsibleCrfUf', vetForm.technicalResponsibleCrfUf);
        Array.from(vetForm.files).forEach((f) => fd.append('evidences', f));
        requestVetMutation.mutate(fd);
    };

    const isPendingVerification = stats.verificationStatus === 'PENDING_VERIFICATION';
    const isRejected = stats.verificationStatus === 'REJECTED';

    const capabilities = Array.isArray(stats.capabilities) ? stats.capabilities : [];
    const vetCapability = capabilities.find((c) => c.type === 'VETERINARY_COMPOUNDING');

    const pendingCount = stats.pendingQuotes ?? availablePrescriptions.length;
    const inProductionCount = stats.inProgressOrders ?? pharmacyOrders.filter((o) => o.status !== 'DELIVERED').length;
    const revenueFormatted = stats.totalRevenue ? `R$ ${stats.totalRevenue}` : 'R$ 0,00';
    const ratingDisplay = stats.averageRating ? `${stats.averageRating}/5.0` : '5.0/5.0';

    return (
        <div className="max-w-container-max mx-auto space-y-lg pb-24 md:pb-0" style={{ padding: '24px 16px' }}>
            {/* Regulatory Banner if not VERIFIED */}
            {isPendingVerification && (
                <div className="glass-card animate-slide-down" style={{
                    padding: '16px 20px',
                    marginBottom: '24px',
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    border: '1px solid #f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                }}>
                    <AlertTriangle size={24} color="#d97706" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#92400e', margin: '0 0 2px' }}>
                            Cadastro em Análise Regulatória
                        </h4>
                        <p style={{ fontSize: '13px', color: '#b45309', margin: 0, lineHeight: 1.4 }}>
                            Sua licença sanitária e registro de responsável técnico estão sendo validados pela administração do MedConnect. Assim que aprovada, você poderá visualizar receitas e enviar propostas.
                        </p>
                    </div>
                </div>
            )}

            {isRejected && (
                <div className="glass-card animate-slide-down" style={{
                    padding: '16px 20px',
                    marginBottom: '24px',
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                    border: '1px solid #ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                }}>
                    <AlertTriangle size={24} color="#dc2626" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#991b1b', margin: '0 0 2px' }}>
                            Credenciamento Recusado
                        </h4>
                        <p style={{ fontSize: '13px', color: '#b91c1c', margin: 0, lineHeight: 1.4 }}>
                            Motivo: {stats.rejectionReason || 'Documentação em desacordo com as exigências sanitárias vigentes.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Card de Capacidade Veterinária (ETAPA V3) */}
            <div className="glass-card" style={{
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ShieldCheck size={24} color="var(--primary-600)" />
                    <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 2px' }}>
                            Capacidade de Manipulação Veterinária (MAPA / CRMV)
                        </h4>
                        <p style={{ fontSize: '13px', color: 'var(--gray-600)', margin: 0 }}>
                            {!vetCapability
                                ? 'Sua farmácia ainda não solicitou habilitação para atender receitas veterinárias.'
                                : vetCapability.status === 'VERIFIED'
                                    ? `Habilitada (MAPA: ${vetCapability.mapaRegistrationNumber} | CRMV/${vetCapability.crmvCompanyUf}: ${vetCapability.crmvCompanyRegistration})`
                                    : vetCapability.status === 'PENDING_VERIFICATION'
                                        ? 'Solicitação em análise pelo comitê regulatório (PENDING_VERIFICATION). Sua operação humana segue ativa.'
                                        : `Status: ${vetCapability.status} — Motivo: ${vetCapability.rejectionReason || 'Verifique a documentação.'}`}
                        </p>
                    </div>
                </div>

                {(!vetCapability || vetCapability.status === 'REJECTED') && (
                    <button
                        className="btn btn-primary"
                        style={{ fontSize: '13px', padding: '8px 16px' }}
                        onClick={() => setShowVetModal(true)}
                    >
                        {vetCapability ? 'Reenviar Documentação Veterinária' : 'Solicitar Capacidade Veterinária'}
                    </button>
                )}
            </div>

            {/* 1. Summary Section (KPIs) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                {/* KPI Card: Pending Quotes */}
                <div
                    className="card animate-slide-up"
                    style={{ padding: '20px', cursor: 'pointer', background: 'white' }}
                    onClick={() => navigate('/pharmacy/requests')}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: 600 }}>Cotações Disponíveis</span>
                        <div style={{ padding: '8px', background: 'rgba(20, 184, 166, 0.1)', borderRadius: '8px' }}>
                            <Clock size={18} color="var(--primary-600)" />
                        </div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '4px' }}>
                        {isLoadingStats ? '-' : pendingCount}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--primary-600)', fontWeight: 600 }}>
                        Aguardando orçamento
                    </div>
                </div>

                {/* KPI Card: In Production */}
                <div
                    className="card animate-slide-up"
                    style={{ padding: '20px', cursor: 'pointer', background: 'white' }}
                    onClick={() => navigate('/pharmacy/orders')}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: 600 }}>Em Produção / Entrega</span>
                        <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
                            <Package size={18} color="var(--warning)" />
                        </div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '4px' }}>
                        {isLoadingStats ? '-' : inProductionCount}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: 600 }}>
                        Fórmulas ativas
                    </div>
                </div>

                {/* KPI Card: Total Revenue */}
                <div className="card animate-slide-up" style={{ padding: '20px', background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: 600 }}>Faturamento Total</span>
                        <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                            <TrendingUp size={18} color="var(--success)" />
                        </div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '4px' }}>
                        {isLoadingStats ? '-' : revenueFormatted}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>
                        {stats.deliveredOrders || 0} pedidos entregues
                    </div>
                </div>

                {/* KPI Card: Average Rating */}
                <div
                    className="card animate-slide-up"
                    style={{ padding: '20px', cursor: 'pointer', background: 'white' }}
                    onClick={() => navigate('/pharmacy/reviews')}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: 600 }}>Nota de Avaliação</span>
                        <div style={{ padding: '8px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '8px' }}>
                            ⭐
                        </div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '4px' }}>
                        {isLoadingStats ? '-' : ratingDisplay}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                        {stats.reviewsCount || 0} avaliações recebidas
                    </div>
                </div>
            </div>

            {/* Layout: Recent Quotes and Production Queue */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '24px'
            }}>
                {/* 2. Recent Quote Requests */}
                <div className="card animate-slide-up" style={{ padding: '20px', background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--gray-900)' }}>
                            Receitas Recentes para Cotar
                        </h3>
                        <button
                            onClick={() => navigate('/pharmacy/requests')}
                            className="section-link"
                            style={{ fontSize: '13px' }}
                        >
                            Ver todas <ArrowRight size={14} style={{ display: 'inline' }} />
                        </button>
                    </div>

                    {isLoadingRequests ? (
                        <div style={{ padding: '30px', textAlign: 'center' }}>
                            <Loader2 size={24} className="animate-spin" color="var(--primary-600)" style={{ margin: '0 auto' }} />
                        </div>
                    ) : availablePrescriptions.length === 0 ? (
                        <div style={{ padding: '30px 16px', textAlign: 'center', background: 'rgba(249, 250, 251, 0.6)', borderRadius: '8px' }}>
                            <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: 0 }}>
                                Nenhuma receita aguardando cotação no momento.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {availablePrescriptions.slice(0, 4).map((p) => (
                                <div
                                    key={p.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px',
                                        background: 'rgba(243, 244, 246, 0.6)',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => navigate(`/pharmacy/send-quote/${p.id}`)}
                                >
                                    <div>
                                        <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 2px', color: 'var(--gray-900)' }}>
                                            {p.patient?.anonymousId || `Receita #${p.id.slice(0, 6).toUpperCase()}`}
                                        </p>
                                        <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: 0 }}>
                                            {p.notes || 'Fórmula sob prescrição médica'}
                                        </p>
                                    </div>
                                    <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                                        Cotar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Orders in Production */}
                <div className="card animate-slide-up" style={{ padding: '20px', background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--gray-900)' }}>
                            Fórmulas em Manipulação
                        </h3>
                        <button
                            onClick={() => navigate('/pharmacy/orders')}
                            className="section-link"
                            style={{ fontSize: '13px' }}
                        >
                            Gerenciar <ArrowRight size={14} style={{ display: 'inline' }} />
                        </button>
                    </div>

                    {isLoadingOrders ? (
                        <div style={{ padding: '30px', textAlign: 'center' }}>
                            <Loader2 size={24} className="animate-spin" color="var(--primary-600)" style={{ margin: '0 auto' }} />
                        </div>
                    ) : pharmacyOrders.length === 0 ? (
                        <div style={{ padding: '30px 16px', textAlign: 'center', background: 'rgba(249, 250, 251, 0.6)', borderRadius: '8px' }}>
                            <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: 0 }}>
                                Nenhum pedido em manipulação ativa no momento.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {pharmacyOrders.slice(0, 4).map((o) => {
                                const statusCfg = orderStatuses[o.status] || orderStatuses.PRODUCTION;
                                return (
                                    <div
                                        key={o.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '12px',
                                            background: 'rgba(243, 244, 246, 0.6)',
                                            borderRadius: '8px'
                                        }}
                                    >
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 2px', color: 'var(--gray-900)' }}>
                                                #{o.id.slice(0, 8).toUpperCase()}
                                            </p>
                                            <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: 0 }}>
                                                {o.quote?.prescription?.notes || 'Fórmula Manipulada'}
                                            </p>
                                        </div>
                                        <span className={`badge badge-dot badge-${statusCfg.color}`}>
                                            {statusCfg.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Solicitação de Capacidade Veterinária */}
            {showVetModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div className="glass-card animate-scale-in" style={{
                        maxWidth: '540px', width: '100%', padding: '24px', background: 'white'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
                            Solicitar Capacidade Veterinária (VETERINARY_COMPOUNDING)
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '16px' }}>
                            Sua operação humana atual permanece ativa. Os documentos anexados serão armazenados de forma privada e conferidos pelo ADMIN.
                        </p>

                        <form onSubmit={handleVetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                    Número de Registro no MAPA *
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ex.: SP-12345-6"
                                    required
                                    value={vetForm.mapaRegistrationNumber}
                                    onChange={(e) => setVetForm((p) => ({ ...p, mapaRegistrationNumber: e.target.value }))}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                        Registro da Empresa no CRMV *
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Ex.: 54321"
                                        required
                                        value={vetForm.crmvCompanyRegistration}
                                        onChange={(e) => setVetForm((p) => ({ ...p, crmvCompanyRegistration: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                        UF CRMV *
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        maxLength={2}
                                        required
                                        value={vetForm.crmvCompanyUf}
                                        onChange={(e) => setVetForm((p) => ({ ...p, crmvCompanyUf: e.target.value.toUpperCase() }))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                    Nome do Responsável Técnico (RT) *
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ex.: Dra. Camila Farmacêutica"
                                    required
                                    value={vetForm.technicalResponsibleName}
                                    onChange={(e) => setVetForm((p) => ({ ...p, technicalResponsibleName: e.target.value }))}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                        CRF do Responsável Técnico *
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Ex.: 98765"
                                        required
                                        value={vetForm.technicalResponsibleCrf}
                                        onChange={(e) => setVetForm((p) => ({ ...p, technicalResponsibleCrf: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                        UF CRF *
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        maxLength={2}
                                        required
                                        value={vetForm.technicalResponsibleCrfUf}
                                        onChange={(e) => setVetForm((p) => ({ ...p, technicalResponsibleCrfUf: e.target.value.toUpperCase() }))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                    Documentos de Evidência em Upload Privado (PDF/JPG/PNG) *
                                </label>
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="form-input"
                                    required
                                    onChange={(e) => setVetForm((p) => ({ ...p, files: e.target.files }))}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => setShowVetModal(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={requestVetMutation.isPending}
                                >
                                    <Upload size={15} /> Enviar para Verificação
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
