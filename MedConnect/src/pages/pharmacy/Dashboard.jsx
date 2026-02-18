import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import StarRating from '../../components/StarRating';
import { mockPharmacyRequests, mockPharmacyOrders, mockReviews } from '../../data/mockData';
import { FileText, Package, Star, TrendingUp, ArrowRight, Clock, Users } from 'lucide-react';

export default function PharmacyDashboard() {
    const navigate = useNavigate();
    const pendingRequests = mockPharmacyRequests.filter(r => r.status === 'pending').length;

    return (
        <div className="app-container">
            <Header />

            <div className="page">
                {/* Welcome card */}
                <div className="card-gradient animate-scale-in" style={{ marginBottom: 'var(--space-5)' }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                            Painel da Farmácia
                        </h3>
                        <p style={{ fontSize: 'var(--font-sm)', opacity: 0.85 }}>
                            Gerencie solicitações e pedidos
                        </p>
                    </div>
                </div>

                {/* Metrics */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)',
                    marginBottom: 'var(--space-6)',
                }} className="stagger">
                    <div className="metric-card animate-slide-up" style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/pharmacy/requests')}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                            background: 'var(--warning-light)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-2)',
                        }}>
                            <FileText size={20} color="var(--warning)" />
                        </div>
                        <div className="metric-value" style={{ color: 'var(--warning)' }}>{pendingRequests}</div>
                        <div className="metric-label">Novas Solicitações</div>
                    </div>

                    <div className="metric-card animate-slide-up" style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/pharmacy/orders')}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                            background: 'var(--info-light)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-2)',
                        }}>
                            <Package size={20} color="var(--info)" />
                        </div>
                        <div className="metric-value" style={{ color: 'var(--info)' }}>
                            {mockPharmacyOrders.filter(o => o.status !== 'DELIVERED').length}
                        </div>
                        <div className="metric-label">Em Andamento</div>
                    </div>

                    <div className="metric-card animate-slide-up">
                        <div style={{
                            width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                            background: 'var(--success-light)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-2)',
                        }}>
                            <TrendingUp size={20} color="var(--success)" />
                        </div>
                        <div className="metric-value" style={{ color: 'var(--success)' }}>R$ 264</div>
                        <div className="metric-label">Faturamento</div>
                    </div>

                    <div className="metric-card animate-slide-up" style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/pharmacy/reviews')}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                            background: '#fef3c7', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-2)',
                        }}>
                            <Star size={20} color="#f59e0b" />
                        </div>
                        <div className="metric-value" style={{ color: '#f59e0b' }}>4.8</div>
                        <div className="metric-label">Avaliação</div>
                    </div>
                </div>

                {/* Recent requests */}
                <div style={{ marginBottom: 'var(--space-6)' }}>
                    <div className="section-header">
                        <h2 className="section-title">Solicitações Recentes</h2>
                        <button className="section-link" onClick={() => navigate('/pharmacy/requests')}>
                            Ver todas <ArrowRight size={14} style={{ display: 'inline' }} />
                        </button>
                    </div>
                    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {mockPharmacyRequests.filter(r => r.status === 'pending').slice(0, 2).map((req) => (
                            <div key={req.id} className="card animate-slide-up" style={{ cursor: 'pointer' }}
                                onClick={() => navigate('/pharmacy/requests')}>
                                <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-2)' }}>
                                    <div className="avatar" style={{ background: 'var(--gradient-secondary)', width: '36px', height: '36px', fontSize: '12px' }}>
                                        {req.user.initials}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 className="font-semibold text-sm">{req.user.name}</h4>
                                        <p className="text-xs text-gray">{req.location}</p>
                                    </div>
                                    <span className="badge badge-warning">Nova</span>
                                </div>
                                <p className="text-sm text-gray">{req.medications.join(', ')}</p>
                                <div className="flex items-center gap-1 mt-2">
                                    <Clock size={12} color="var(--gray-400)" />
                                    <span className="text-xs text-gray">{req.createdAt}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent reviews */}
                <div>
                    <div className="section-header">
                        <h2 className="section-title">Últimas Avaliações</h2>
                        <button className="section-link" onClick={() => navigate('/pharmacy/reviews')}>
                            Ver todas <ArrowRight size={14} style={{ display: 'inline' }} />
                        </button>
                    </div>
                    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {mockReviews.slice(0, 2).map((review) => (
                            <div key={review.id} className="card animate-slide-up">
                                <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-2)' }}>
                                    <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '11px' }}>
                                        {review.user.initials}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 className="font-semibold text-sm">{review.user.name}</h4>
                                        <StarRating rating={review.rating} size={12} />
                                    </div>
                                    <span className="text-xs text-gray">{review.date}</span>
                                </div>
                                <p className="text-sm text-gray">{review.comment}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
