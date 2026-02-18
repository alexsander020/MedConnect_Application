import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import StarRating from '../../components/StarRating';
import { mockOrders, orderStatuses } from '../../data/mockData';
import { Check, Clock, Phone, MessageCircle, MapPin, Package } from 'lucide-react';

export default function OrderTracking() {
    const { id } = useParams();
    const navigate = useNavigate();
    const order = mockOrders.find(o => o.id === id) || mockOrders[0];
    const status = orderStatuses[order.status];

    return (
        <div className="app-container">
            <Header title="Acompanhar Pedido" showBack />

            <div className="page">
                {/* Order ID and status */}
                <div className="card-dark animate-scale-in" style={{ marginBottom: 'var(--space-5)' }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
                            <span style={{ fontSize: 'var(--font-sm)', opacity: 0.7 }}>Pedido</span>
                            <span className={`badge badge-dot badge-${status.color}`}>{status.label}</span>
                        </div>
                        <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
                            {order.id}
                        </h2>
                        <p style={{ fontSize: 'var(--font-sm)', opacity: 0.7 }}>
                            {order.medications.join(' • ')}
                        </p>
                        {order.price && (
                            <p style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--primary-300)', marginTop: 'var(--space-3)' }}>
                                R$ {order.price.toFixed(2).replace('.', ',')}
                            </p>
                        )}
                    </div>
                </div>

                {/* Timeline */}
                <div style={{ marginBottom: 'var(--space-6)' }}>
                    <h3 className="section-title" style={{ marginBottom: 'var(--space-4)' }}>
                        Status do Pedido
                    </h3>
                    <div className="timeline animate-slide-up">
                        {order.timeline.map((item, i) => (
                            <div key={i} className="timeline-item">
                                <div className={`timeline-dot ${item.completed ? 'completed' : ''} ${item.active ? 'active' : ''}`}>
                                    {item.completed ? (
                                        <Check size={14} />
                                    ) : item.active ? (
                                        <Clock size={14} />
                                    ) : (
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gray-400)' }} />
                                    )}
                                </div>
                                <div>
                                    <p className="timeline-title" style={{
                                        color: item.completed || item.active ? 'var(--gray-800)' : 'var(--gray-400)',
                                    }}>
                                        {item.status}
                                    </p>
                                    {item.date && (
                                        <p className="timeline-desc">{item.date}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pharmacy info */}
                {order.pharmacy && (
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <h3 className="section-title" style={{ marginBottom: 'var(--space-4)' }}>
                            Farmácia
                        </h3>
                        <div className="card animate-slide-up">
                            <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
                                <div className="avatar avatar-lg" style={{ background: 'var(--gradient-secondary)' }}>
                                    {order.pharmacy.initials}
                                </div>
                                <div>
                                    <h4 className="font-semibold">{order.pharmacy.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <StarRating rating={Math.round(order.pharmacy.rating)} size={12} />
                                        <span className="text-xs font-semibold">{order.pharmacy.rating}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="btn btn-outline btn-sm" style={{ flex: 1 }}>
                                    <Phone size={14} />
                                    Ligar
                                </button>
                                <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                                    <MessageCircle size={14} />
                                    Mensagem
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delivery info */}
                {order.estimatedDelivery && (
                    <div className="card animate-slide-up" style={{
                        background: 'var(--primary-50)', border: '1px solid var(--primary-100)',
                    }}>
                        <div className="flex items-center gap-3">
                            <div style={{
                                width: '44px', height: '44px', borderRadius: 'var(--radius-lg)',
                                background: 'var(--primary-100)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Package size={22} color="var(--primary-600)" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--primary-700)' }}>
                                    Previsão de Entrega
                                </p>
                                <p className="text-xs text-gray">
                                    {new Date(order.estimatedDelivery).toLocaleDateString('pt-BR', {
                                        day: '2-digit', month: 'long', year: 'numeric',
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rate (only if delivered) */}
                {order.status === 'DELIVERED' && !order.rating && (
                    <button
                        className="btn btn-primary btn-lg btn-block mt-6"
                        onClick={() => navigate(`/review/${order.id}`)}
                    >
                        ⭐ Avaliar Atendimento
                    </button>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
