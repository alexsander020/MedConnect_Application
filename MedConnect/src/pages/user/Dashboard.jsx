import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import StarRating from '../../components/StarRating';
import { orderStatuses } from '../../constants/status';
import { Plus, ArrowRight, MapPin, TrendingUp, Loader2, Package, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

export default function Dashboard() {
    const navigate = useNavigate();

    const {
        data: orders = [],
        isLoading: isLoadingOrders,
        isError: isErrorOrders,
        refetch: refetchOrders
    } = useQuery({
        queryKey: ['myOrders'],
        queryFn: async () => {
            const res = await api.get('/orders/my');
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    const {
        data: pharmacies = [],
        isLoading: isLoadingPharmacies
    } = useQuery({
        queryKey: ['pharmacies'],
        queryFn: async () => {
            const res = await api.get('/pharmacies');
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    const {
        data: prescriptions = []
    } = useQuery({
        queryKey: ['myPrescriptions'],
        queryFn: async () => {
            const res = await api.get('/prescriptions/my');
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    const activeOrders = orders.filter((o) => o.status !== 'DELIVERED');
    const inProgressCount = activeOrders.length;
    const totalOrdersCount = orders.length;
    const quotesCount = prescriptions.reduce((acc, p) => acc + (p.quotes?.length || 0), 0);

    return (
        <div className="app-container">
            <Header />

            <div className="page">
                {/* Quick action card */}
                <div
                    className="card-gradient animate-slide-up"
                    style={{ marginBottom: 'var(--space-5)', cursor: 'pointer' }}
                    onClick={() => navigate('/new-quote')}
                >
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                            Precisa de um medicamento?
                        </h3>
                        <p style={{ fontSize: 'var(--font-sm)', opacity: 0.85, marginBottom: 'var(--space-4)' }}>
                            Envie sua receita e receba cotações das melhores farmácias de manipulação
                        </p>
                        <div
                            className="btn"
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                backdropFilter: 'blur(10px)',
                                padding: 'var(--space-2) var(--space-4)',
                                borderRadius: 'var(--radius-lg)',
                                fontSize: 'var(--font-sm)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Plus size={16} />
                            Nova Cotação
                        </div>
                    </div>
                </div>

                {/* Real Metrics Stats */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: 'var(--space-3)',
                        marginBottom: 'var(--space-6)'
                    }}
                    className="stagger"
                >
                    <div className="metric-card animate-slide-up">
                        <div className="metric-value" style={{ color: 'var(--primary-600)' }}>
                            {isLoadingOrders ? '-' : totalOrdersCount}
                        </div>
                        <div className="metric-label">Pedidos</div>
                    </div>
                    <div className="metric-card animate-slide-up">
                        <div className="metric-value" style={{ color: 'var(--warning)' }}>
                            {isLoadingOrders ? '-' : inProgressCount}
                        </div>
                        <div className="metric-label">Em andamento</div>
                    </div>
                    <div className="metric-card animate-slide-up">
                        <div className="metric-value" style={{ color: 'var(--success)' }}>
                            <TrendingUp size={20} style={{ display: 'inline' }} /> {quotesCount}
                        </div>
                        <div className="metric-label">Cotações</div>
                    </div>
                </div>

                {/* Active orders */}
                <div style={{ marginBottom: 'var(--space-6)' }}>
                    <div className="section-header">
                        <h2 className="section-title">Pedidos Ativos</h2>
                        {orders.length > 0 && (
                            <button className="section-link" onClick={() => navigate('/orders')}>
                                Ver todos <ArrowRight size={14} style={{ display: 'inline' }} />
                            </button>
                        )}
                    </div>

                    {isLoadingOrders ? (
                        <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={28} color="var(--primary-600)" style={{ margin: '0 auto' }} />
                        </div>
                    ) : isErrorOrders ? (
                        <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                            <p className="text-sm text-gray" style={{ marginBottom: '8px' }}>Não foi possível carregar seus pedidos.</p>
                            <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => refetchOrders()}>
                                Tentar Novamente
                            </button>
                        </div>
                    ) : activeOrders.length === 0 ? (
                        <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', background: 'rgba(255,255,255,0.7)' }}>
                            <Package size={32} color="var(--gray-400)" style={{ margin: '0 auto 8px' }} />
                            <p className="text-sm font-semibold" style={{ color: 'var(--gray-700)', marginBottom: '4px' }}>
                                Nenhum pedido em andamento
                            </p>
                            <p className="text-xs text-gray" style={{ marginBottom: '12px' }}>
                                Envie uma nova receita para receber propostas de farmácias.
                            </p>
                            <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '13px' }} onClick={() => navigate('/new-quote')}>
                                <Plus size={14} /> Solicitar Cotação
                            </button>
                        </div>
                    ) : (
                        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {activeOrders.map((order) => {
                                const statusConfig = orderStatuses[order.status] || orderStatuses.PRODUCTION;
                                const pharmacyName = order.quote?.pharmacy?.name || 'Farmácia Parceira';
                                const initials = pharmacyName.slice(0, 2).toUpperCase();
                                const medicationsText = order.quote?.prescription?.notes || 'Fórmula Manipulada sob Receita';

                                return (
                                    <div
                                        key={order.id}
                                        className="card animate-slide-up"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => navigate(`/order/${order.id}`)}
                                    >
                                        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-2)' }}>
                                            <span className="text-sm font-semibold" style={{ color: 'var(--gray-700)' }}>
                                                #{order.id.slice(0, 8).toUpperCase()}
                                            </span>
                                            <span className={`badge badge-dot badge-${statusConfig.color}`}>
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--gray-800)', marginBottom: 'var(--space-2)' }}>
                                            {medicationsText}
                                        </p>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                                                    {initials}
                                                </div>
                                                <span className="text-xs text-gray">{pharmacyName}</span>
                                            </div>
                                            {order.quote?.price && (
                                                <span className="text-sm font-bold" style={{ color: 'var(--primary-700)' }}>
                                                    R$ {Number(order.quote.price).toFixed(2).replace('.', ',')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Real Verified Pharmacies */}
                <div>
                    <div className="section-header">
                        <h2 className="section-title">Farmácias Credenciadas</h2>
                    </div>
                    {isLoadingPharmacies ? (
                        <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={28} color="var(--primary-600)" style={{ margin: '0 auto' }} />
                        </div>
                    ) : pharmacies.length === 0 ? (
                        <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                            <p className="text-xs text-gray">Nenhuma farmácia cadastrada no momento.</p>
                        </div>
                    ) : (
                        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {pharmacies.slice(0, 4).map((pharmacy) => {
                                const rating = 5.0;
                                const distance = pharmacy.deliveryArea ? `Até ${pharmacy.deliveryArea}` : 'Raio metropolitano';
                                const initials = (pharmacy.name || 'FM').substring(0, 2).toUpperCase();

                                return (
                                    <div key={pharmacy.id} className="pharmacy-card animate-slide-up">
                                        <div
                                            className="avatar avatar-lg"
                                            style={{
                                                background: 'var(--gradient-secondary)',
                                                color: 'white',
                                                fontWeight: 700
                                            }}
                                        >
                                            {initials}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 className="font-semibold" style={{ fontSize: 'var(--font-sm)' }}>
                                                {pharmacy.name}
                                            </h4>
                                            <div className="flex items-center gap-1 mt-1">
                                                <MapPin size={12} color="var(--gray-400)" />
                                                <span className="text-xs text-gray">{pharmacy.address || 'São Paulo, SP'} • {distance}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <StarRating rating={rating} size={12} />
                                                <span className="text-xs font-semibold">5.0</span>
                                                <span className="text-xs text-gray">(Credenciada)</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
