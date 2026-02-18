import { useState } from 'react';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import { mockPharmacyOrders, orderStatuses } from '../../data/mockData';
import { MapPin, ChevronRight, Package, Truck, CheckCircle2 } from 'lucide-react';

export default function OrderManagement() {
    const [orders, setOrders] = useState(mockPharmacyOrders);
    const [activeTab, setActiveTab] = useState('active');
    const [updatingId, setUpdatingId] = useState(null);

    const statusFlow = ['PRODUCTION', 'DELIVERY', 'DELIVERED'];

    const getNextStatus = (currentStatus) => {
        const idx = statusFlow.indexOf(currentStatus);
        return idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
    };

    const handleAdvanceStatus = (orderId) => {
        setUpdatingId(orderId);
        setTimeout(() => {
            setOrders(prev => prev.map(o => {
                if (o.id === orderId) {
                    const next = getNextStatus(o.status);
                    return next ? { ...o, status: next } : o;
                }
                return o;
            }));
            setUpdatingId(null);
        }, 800);
    };

    const filtered = orders.filter(o =>
        activeTab === 'active' ? o.status !== 'DELIVERED' : o.status === 'DELIVERED'
    );

    const getStatusIcon = (status) => {
        switch (status) {
            case 'PRODUCTION': return <Package size={16} />;
            case 'DELIVERY': return <Truck size={16} />;
            case 'DELIVERED': return <CheckCircle2 size={16} />;
            default: return <Package size={16} />;
        }
    };

    return (
        <div className="app-container">
            <Header title="Gerenciar Pedidos" />

            <div className="page">
                <div className="tabs animate-slide-down" style={{ marginBottom: 'var(--space-5)' }}>
                    <button className={`tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
                        Ativos ({orders.filter(o => o.status !== 'DELIVERED').length})
                    </button>
                    <button className={`tab ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
                        Finalizados ({orders.filter(o => o.status === 'DELIVERED').length})
                    </button>
                </div>

                <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {filtered.map((order) => {
                        const status = orderStatuses[order.status];
                        const nextStatus = getNextStatus(order.status);
                        const isUpdating = updatingId === order.id;

                        return (
                            <div key={order.id} className="card animate-slide-up">
                                {/* Header */}
                                <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
                                    <div>
                                        <h4 className="font-semibold text-sm">{order.id}</h4>
                                        <p className="text-xs text-gray mt-1">{order.createdAt}</p>
                                    </div>
                                    <span className={`badge badge-dot badge-${status.color}`}>
                                        {getStatusIcon(order.status)}
                                        {status.label}
                                    </span>
                                </div>

                                {/* Client info */}
                                <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-3)' }}>
                                    <div className="avatar" style={{
                                        background: 'var(--gradient-secondary)',
                                        width: '36px', height: '36px', fontSize: '12px',
                                    }}>
                                        {order.user.initials}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">{order.user.name}</p>
                                        <div className="flex items-center gap-1">
                                            <MapPin size={11} color="var(--gray-400)" />
                                            <span className="text-xs text-gray truncate" style={{ maxWidth: '200px' }}>
                                                {order.address}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Medications */}
                                <div className="flex gap-2" style={{ flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                                    {order.medications.map((med, i) => (
                                        <span key={i} className="badge badge-primary">{med}</span>
                                    ))}
                                </div>

                                {/* Price */}
                                <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
                                    <span className="text-sm text-gray">Valor</span>
                                    <span className="font-bold text-primary" style={{ fontSize: 'var(--font-lg)' }}>
                                        R$ {order.price.toFixed(2).replace('.', ',')}
                                    </span>
                                </div>

                                {/* Advance status button */}
                                {nextStatus && (
                                    <button
                                        className="btn btn-primary btn-block btn-sm"
                                        onClick={() => handleAdvanceStatus(order.id)}
                                        disabled={isUpdating}
                                        style={isUpdating ? { opacity: 0.7 } : {}}
                                    >
                                        {isUpdating ? (
                                            <>Atualizando...</>
                                        ) : (
                                            <>
                                                Atualizar: {orderStatuses[nextStatus].label}
                                                <ChevronRight size={16} />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
