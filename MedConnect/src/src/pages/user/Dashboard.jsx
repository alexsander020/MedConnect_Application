import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import StarRating from '../../components/StarRating';
import { mockOrders, mockPharmacies, orderStatuses } from '../../data/mockData';
import { Plus, ArrowRight, MapPin, Clock, TrendingUp } from 'lucide-react';

export default function Dashboard() {
    const navigate = useNavigate();
    const activeOrders = mockOrders.filter(o => o.status !== 'DELIVERED');

    return (
        <div className="app-container">
            <Header />

            <div className="page">
                {/* Quick action card */}
                <div className="card-gradient animate-slide-up" style={{ marginBottom: 'var(--space-5)', cursor: 'pointer' }}
                    onClick={() => navigate('/new-quote')}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                            Precisa de um medicamento?
                        </h3>
                        <p style={{ fontSize: 'var(--font-sm)', opacity: 0.85, marginBottom: 'var(--space-4)' }}>
                            Envie sua receita e receba cotações
                        </p>
                        <div className="btn" style={{
                            background: 'rgba(255,255,255,0.2)', color: 'white',
                            backdropFilter: 'blur(10px)', padding: 'var(--space-2) var(--space-4)',
                            borderRadius: 'var(--radius-lg)', fontSize: 'var(--font-sm)',
                        }}>
                            <Plus size={16} />
                            Nova Cotação
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}
                    className="stagger">
                    <div className="metric-card animate-slide-up">
                        <div className="metric-value" style={{ color: 'var(--primary-600)' }}>3</div>
                        <div className="metric-label">Pedidos</div>
                    </div>
                    <div className="metric-card animate-slide-up">
                        <div className="metric-value" style={{ color: 'var(--warning)' }}>1</div>
                        <div className="metric-label">Em andamento</div>
                    </div>
                    <div className="metric-card animate-slide-up">
                        <div className="metric-value" style={{ color: 'var(--success)' }}>
                            <TrendingUp size={20} style={{ display: 'inline' }} /> 15%
                        </div>
                        <div className="metric-label">Economia</div>
                    </div>
                </div>

                {/* Active orders */}
                {activeOrders.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <div className="section-header">
                            <h2 className="section-title">Pedidos Ativos</h2>
                            <button className="section-link" onClick={() => navigate('/orders')}>
                                Ver todos <ArrowRight size={14} style={{ display: 'inline' }} />
                            </button>
                        </div>
                        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {activeOrders.map((order) => {
                                const status = orderStatuses[order.status];
                                return (
                                    <div key={order.id} className="card animate-slide-up"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => navigate(`/order/${order.id}`)}>
                                        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-2)' }}>
                                            <span className="text-sm font-semibold" style={{ color: 'var(--gray-700)' }}>
                                                {order.id}
                                            </span>
                                            <span className={`badge badge-dot badge-${status.color}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <p className="text-sm" style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-2)' }}>
                                            {order.medications.join(', ')}
                                        </p>
                                        {order.pharmacy && (
                                            <div className="flex items-center gap-2">
                                                <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                                                    {order.pharmacy.initials}
                                                </div>
                                                <span className="text-xs text-gray">{order.pharmacy.name}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Nearby pharmacies */}
                <div>
                    <div className="section-header">
                        <h2 className="section-title">Farmácias Próximas</h2>
                    </div>
                    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {mockPharmacies.slice(0, 3).map((pharmacy) => (
                            <div key={pharmacy.id} className="pharmacy-card animate-slide-up">
                                <div className="avatar avatar-lg" style={{
                                    background: 'var(--gradient-secondary)',
                                }}>
                                    {pharmacy.initials}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 className="font-semibold" style={{ fontSize: 'var(--font-sm)' }}>
                                        {pharmacy.name}
                                    </h4>
                                    <div className="flex items-center gap-1 mt-1">
                                        <MapPin size={12} color="var(--gray-400)" />
                                        <span className="text-xs text-gray">{pharmacy.address} • {pharmacy.distance}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <StarRating rating={Math.round(pharmacy.rating)} size={12} />
                                        <span className="text-xs font-semibold">{pharmacy.rating}</span>
                                        <span className="text-xs text-gray">({pharmacy.totalReviews})</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
