import { useState, useEffect, useCallback } from 'react';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';
import { orderStatuses } from '../../data/mockData';
import { MapPin, ChevronRight, Package, Truck, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

export default function OrderManagement() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('active');
    const [updatingId, setUpdatingId] = useState(null);

    const statusFlow = ['PRODUCTION', 'DELIVERY', 'DELIVERED'];

    const getNextStatus = (currentStatus) => {
        const idx = statusFlow.indexOf(currentStatus);
        return idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
    };

    const fetchOrders = useCallback(() => {
        setLoading(true);
        setError(null);
        api.get('/orders/my')
            .then(res => {
                if (Array.isArray(res.data)) {
                    const formatted = res.data.map(o => {
                        const patientName = o.quote?.prescription?.patient?.name || 'Paciente';
                        const initials = patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                        return {
                            id: `#${o.id.slice(0, 6).toUpperCase()}`,
                            rawId: o.id,
                            patient: patientName,
                            initials: initials || 'PA',
                            address: o.quote?.prescription?.patient?.address || 'São Paulo, SP',
                            medications: [o.quote?.prescription?.notes || 'Fórmula sob prescrição médica'],
                            status: o.status === 'DELIVERED' ? 'DELIVERED' : (o.status === 'DELIVERY' ? 'DELIVERY' : 'PRODUCTION'),
                            price: o.quote?.price || 0,
                            deliveryEstimate: o.quote?.deliveryDays ? `${o.quote.deliveryDays} dias úteis` : '2 dias',
                            createdAt: new Date(o.createdAt).toLocaleDateString('pt-BR')
                        };
                    });
                    setOrders(formatted);
                } else {
                    setOrders([]);
                }
            })
            .catch(err => {
                console.error('Erro ao buscar pedidos da farmácia:', err);
                setError(err?.response?.data?.error || 'Não foi possível carregar os pedidos da farmácia. Tente novamente.');
                setOrders([]);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleAdvanceStatus = async (orderId) => {
        setUpdatingId(orderId);
        const currentOrder = orders.find(o => o.id === orderId);
        const next = getNextStatus(currentOrder?.status);

        if (next && currentOrder?.rawId) {
            try {
                await api.patch(`/orders/${currentOrder.rawId}/status`, { status: next });
                setOrders(prev => prev.map(o => {
                    if (o.id === orderId) {
                        return { ...o, status: next };
                    }
                    return o;
                }));
            } catch (err) {
                console.error('Erro ao atualizar status na API:', err);
                alert('Não foi possível atualizar o status do pedido no servidor.');
            } finally {
                setUpdatingId(null);
            }
        } else {
            setUpdatingId(null);
        }
    };

    const filtered = orders.filter(o =>
        activeTab === 'active' ? o.status !== 'DELIVERED' : o.status === 'DELIVERED'
    );

    const getStatusIcon = (status) => {
        switch (status) {
            case 'PRODUCTION': return <Package size={15} />;
            case 'DELIVERY': return <Truck size={15} />;
            case 'DELIVERED': return <CheckCircle2 size={15} />;
            default: return <Package size={15} />;
        }
    };

    const getNextLabel = (status) => {
        switch (status) {
            case 'PRODUCTION': return 'Avançar para Entrega';
            case 'DELIVERY': return 'Confirmar Entrega';
            default: return 'Finalizado';
        }
    };

    return (
        <div className="space-y-6 pb-24 md:pb-6">
            {/* Header with pill tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div>
                    <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>
                        Linha de Produção & Entregas
                    </h2>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)', marginTop: 2 }}>
                        Gerencie o status de manipulação e expedição dos medicamentos
                    </p>
                </div>

                <div className="glass-tab-container" style={{ width: 'auto', minWidth: '280px' }}>
                    <div 
                        className={`glass-tab ${activeTab === 'active' ? 'active' : ''}`}
                        onClick={() => setActiveTab('active')}
                    >
                        Em Andamento ({orders.filter(o => o.status !== 'DELIVERED').length})
                    </div>
                    <div 
                        className={`glass-tab ${activeTab === 'completed' ? 'active' : ''}`}
                        onClick={() => setActiveTab('completed')}
                    >
                        Concluídos ({orders.filter(o => o.status === 'DELIVERED').length})
                    </div>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <LoadingState message="Carregando pedidos em produção..." />
            ) : error ? (
                <ErrorState
                    title="Erro ao carregar pedidos"
                    message={error}
                    onRetry={fetchOrders}
                />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={Package}
                    title={`Nenhum pedido ${activeTab === 'active' ? 'em andamento' : 'concluído'}`}
                    description="Novos pedidos de pacientes aparecerão aqui conforme forem aprovados."
                />
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: 'var(--space-5)'
                }}>
                    {filtered.map((order) => {
                        const statusObj = orderStatuses[order.status] || { label: order.status, color: 'primary' };
                        const nextStatus = getNextStatus(order.status);
                        const isUpdating = updatingId === order.id;

                        return (
                            <div key={order.id} className="glass-card animate-slide-up" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ fontWeight: 800, fontSize: 'var(--font-base)', color: 'var(--gray-900)' }}>{order.id}</h4>
                                        <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: 2 }}>{order.createdAt}</p>
                                    </div>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '4px 10px', borderRadius: 'var(--radius-full)',
                                        fontSize: '11px', fontWeight: 700,
                                        background: order.status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                        color: order.status === 'DELIVERED' ? 'var(--success)' : 'var(--warning)',
                                        border: `1px solid ${order.status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`
                                    }}>
                                        {getStatusIcon(order.status)}
                                        {statusObj.label}
                                    </span>
                                </div>

                                {/* Patient Info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) 0' }}>
                                    <div style={{
                                        width: 42, height: 42, borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #a5b4fc 100%)',
                                        color: 'white', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontWeight: 800, fontSize: '14px',
                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                    }}>
                                        {order.initials}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontWeight: 700, fontSize: 'var(--font-sm)', color: 'var(--gray-900)' }} className="truncate">
                                            {order.patient}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: '11px', color: 'var(--gray-500)' }}>
                                            <MapPin size={12} color="var(--gray-400)" />
                                            <span className="truncate">{order.address}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Medications */}
                                <div className="glass-panel" style={{ padding: 'var(--space-3)', background: 'rgba(255, 255, 255, 0.65)', borderRadius: 'var(--radius-md)' }}>
                                    <p style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 600 }}>Fórmula Prescrita:</p>
                                    <p style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--gray-800)', marginTop: 2 }}>
                                        {order.medications.join(', ')}
                                    </p>
                                </div>

                                {/* Price and SLA */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 }}>
                                    <div>
                                        <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>Prazo:</span>
                                        <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--gray-700)', marginLeft: 4 }}>{order.deliveryEstimate}</span>
                                    </div>
                                    <span style={{ fontSize: 'var(--font-lg)', fontWeight: 900, color: 'var(--primary-700)' }}>
                                        R$ {Number(order.price).toFixed(2).replace('.', ',')}
                                    </span>
                                </div>

                                {/* Action button to advance status */}
                                {nextStatus && (
                                    <button
                                        className="btn btn-glass-primary"
                                        style={{
                                            marginTop: 'var(--space-2)',
                                            padding: '10px',
                                            borderRadius: 'var(--radius-lg)',
                                            fontSize: 'var(--font-xs)',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8
                                        }}
                                        onClick={() => handleAdvanceStatus(order.id)}
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Atualizando status...
                                            </>
                                        ) : (
                                            <>
                                                {getNextLabel(order.status)}
                                                <ChevronRight size={16} />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
