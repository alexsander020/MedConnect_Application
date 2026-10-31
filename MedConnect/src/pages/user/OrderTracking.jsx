import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import StarRating from '../../components/StarRating';
import { orderStatuses } from '../../constants/status';
import { Check, Clock, Phone, MessageCircle, MapPin, Package, Loader2, Sparkles, ShieldCheck, FileText, Star, AlertCircle, PawPrint } from 'lucide-react';
import { api } from '../../services/api';

export default function OrderTracking() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Consulta de detalhes reais do pedido via TanStack Query
    const {
        data: orderData,
        isLoading,
        isError
    } = useQuery({
        queryKey: ['order', id],
        queryFn: async () => {
            const res = await api.get(`/orders/${id}`);
            return res.data;
        },
        enabled: !!id
    });

    // Consulta da URL assinada de visualização segura da receita (5 min com auditoria compulsória)
    const prescriptionId = orderData?.quote?.prescriptionId || orderData?.quote?.prescription?.id;
    const { data: signedPrescriptionData } = useQuery({
        queryKey: ['prescriptionViewUrl', prescriptionId],
        queryFn: async () => {
            const res = await api.get(`/prescriptions/${prescriptionId}/view-url`);
            return res.data;
        },
        enabled: !!prescriptionId
    });

    if (isLoading) {
        return (
            <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Header title="Rastreamento em Tempo Real" showBack />
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--primary-600)" />
                </div>
            </div>
        );
    }

    if (isError || !orderData) {
        return (
            <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Header title="Rastreamento em Tempo Real" showBack />
                <div className="page" style={{ maxWidth: '500px', margin: '40px auto', textAlign: 'center' }}>
                    <div className="glass-card" style={{ padding: '32px' }}>
                        <AlertCircle size={40} color="var(--error)" style={{ margin: '0 auto 12px' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Pedido não encontrado</h3>
                        <p style={{ color: 'var(--gray-600)', marginBottom: '16px' }}>Não foi possível carregar os dados deste pedido.</p>
                        <button className="btn btn-primary" onClick={() => navigate('/orders')}>Voltar aos Pedidos</button>
                    </div>
                </div>
            </div>
        );
    }

    const currentStatus = orderData.status || 'PRODUCTION';
    const statusConfig = orderStatuses[currentStatus] || orderStatuses.PRODUCTION;

    const steps = [
        { key: 'PRODUCTION', label: 'Em Manipulação / Produção', desc: 'Sua fórmula está sendo manipulada no laboratório farmacêutico.' },
        { key: 'DELIVERY', label: 'Saiu para Entrega', desc: 'O mensageiro está a caminho do seu endereço de entrega.' },
        { key: 'DELIVERED', label: 'Pedido Entregue', desc: 'Entregue com sucesso e insumos verificados.' }
    ];

    const stepIndex = steps.findIndex((s) => s.key === currentStatus);
    const activeIndex = stepIndex >= 0 ? stepIndex : 0;

    const pharmacy = orderData.quote?.pharmacy;
    const pharmacyName = pharmacy?.name || 'Farmácia Parceira';
    const pharmacyInitials = pharmacyName.slice(0, 2).toUpperCase();
    const formattedPrice = orderData.quote?.price || (orderData.quote?.priceCents ? (orderData.quote.priceCents / 100).toFixed(2) : '0.00');

    return (
        <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="aurora-blob aurora-blob-1" />
            <div className="aurora-blob aurora-blob-2" />

            <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                <Header title="Rastreamento em Tempo Real" showBack />

                <div className="page" style={{ maxWidth: '640px', margin: '0 auto' }}>
                    {/* Hero Card */}
                    <div className="glass-card-dark animate-scale-in" style={{
                        padding: 'var(--space-6)',
                        marginBottom: 'var(--space-6)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        {orderData.animal ? 'Pedido de Manipulação Veterinária' : 'Pedido de Manipulação'}
                                    </span>
                                    {orderData.animal && (
                                        <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <PawPrint size={10} /> Pet: {orderData.animal.name}
                                        </span>
                                    )}
                                </div>
                                <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'white', margin: '4px 0 0' }}>
                                    #{orderData.id.slice(0, 8).toUpperCase()}
                                </h2>
                            </div>
                            <span className={`badge badge-dot badge-${statusConfig.color}`} style={{ padding: '6px 12px', fontSize: '12px' }}>
                                {statusConfig.label}
                            </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px' }}>
                            <div>
                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block' }}>Valor Total</span>
                                <span style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>
                                    R$ {formattedPrice}
                                </span>
                            </div>
                            {signedPrescriptionData?.signedUrl && (
                                <a
                                    href={signedPrescriptionData.signedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-outline"
                                    style={{
                                        color: 'white',
                                        borderColor: 'rgba(255,255,255,0.3)',
                                        fontSize: '12px',
                                        padding: '4px 10px',
                                        gap: '6px'
                                    }}
                                >
                                    <FileText size={14} /> Ver Receita Segura
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="glass-card animate-slide-up" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
                        <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 800, marginBottom: '20px', color: 'var(--gray-900)' }}>
                            Status da Entrega
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
                            {steps.map((st, idx) => {
                                const isDone = idx <= activeIndex;
                                const isCurrent = idx === activeIndex;

                                return (
                                    <div key={st.key} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: isDone ? 'var(--primary-600)' : 'var(--gray-200)',
                                            color: isDone ? 'white' : 'var(--gray-500)',
                                            flexShrink: 0,
                                            boxShadow: isCurrent ? '0 0 0 4px rgba(20, 184, 166, 0.25)' : 'none'
                                        }}>
                                            {isDone ? <Check size={16} /> : <Clock size={16} />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{
                                                fontSize: '14px',
                                                fontWeight: isCurrent ? 800 : 600,
                                                color: isCurrent ? 'var(--primary-700)' : isDone ? 'var(--gray-900)' : 'var(--gray-500)',
                                                margin: '0 0 2px'
                                            }}>
                                                {st.label}
                                            </p>
                                            <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: 0, lineHeight: 1.4 }}>
                                                {st.desc}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Review Button if Delivered */}
                    {currentStatus === 'DELIVERED' && (
                        <div className="glass-card animate-scale-in" style={{
                            padding: 'var(--space-5)',
                            marginBottom: 'var(--space-6)',
                            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                            border: '1px solid #f59e0b',
                            textAlign: 'center'
                        }}>
                            <Star size={32} color="#b45309" fill="#f59e0b" style={{ margin: '0 auto 8px' }} />
                            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#78350f', marginBottom: '4px' }}>
                                Seu pedido foi entregue!
                            </h3>
                            <p style={{ fontSize: '13px', color: '#92400e', marginBottom: '14px' }}>
                                Avalie sua experiência com a {pharmacyName} para ajudar outros pacientes.
                            </p>
                            <button
                                className="btn btn-primary"
                                style={{ background: '#b45309', borderColor: '#b45309' }}
                                onClick={() => navigate(`/review/${orderData.id}`)}
                            >
                                Avaliar Atendimento
                            </button>
                        </div>
                    )}

                    {/* Pharmacy Information */}
                    {pharmacy && (
                        <div className="glass-card animate-slide-up" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
                            <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--gray-500)', marginBottom: '12px' }}>
                                Farmácia Responsável
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div className="avatar avatar-lg" style={{ background: 'var(--gradient-primary)', color: 'white', fontWeight: 700 }}>
                                    {pharmacyInitials}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 2px' }}>{pharmacyName}</h4>
                                    <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: '0 0 4px' }}>{pharmacy.address || 'São Paulo, SP'}</p>
                                    {pharmacy.phone && (
                                        <p style={{ fontSize: '12px', color: 'var(--primary-700)', fontWeight: 600, margin: 0 }}>
                                            Telefone: {pharmacy.phone}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
