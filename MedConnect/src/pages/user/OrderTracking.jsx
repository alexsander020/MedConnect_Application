import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import StarRating from '../../components/StarRating';
import { mockOrders, orderStatuses } from '../../data/mockData';
import { Check, Clock, Phone, MessageCircle, MapPin, Package, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

const defaultStatusConfig = {
    PENDING: { label: 'Pendente', color: 'info' },
    REVIEWING: { label: 'Em Análise', color: 'info' },
    QUOTED: { label: 'Cotado', color: 'warning' },
    ACCEPTED: { label: 'Aprovado', color: 'primary' },
    PRODUCTION: { label: 'Em Produção', color: 'warning' },
    DELIVERY: { label: 'Em Entrega', color: 'info' },
    DELIVERED: { label: 'Finalizado', color: 'success' },
    CANCELLED: { label: 'Cancelado', color: 'error' }
};

export default function OrderTracking() {
    const { id } = useParams();
    const [order, setOrder] = useState(() => mockOrders.find(o => o.id === id) || mockOrders[0]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/orders/my')
            .then(res => {
                if (res.data && res.data.length > 0) {
                    const found = res.data.find(o => o.id === id || o.id.slice(0, 8).toUpperCase() === id);
                    if (found) {
                        const statusKey = found.status || 'PRODUCTION';
                        const steps = [
                            { key: 'ACCEPTED', label: 'Cotação Aprovada' },
                            { key: 'PRODUCTION', label: 'Em Manipulação / Produção' },
                            { key: 'DELIVERY', label: 'Saiu para Entrega' },
                            { key: 'DELIVERED', label: 'Pedido Entregue' }
                        ];
                        const stepIdx = steps.findIndex(s => s.key === statusKey);
                        const curIdx = stepIdx >= 0 ? stepIdx : 1;

                        setOrder({
                            id: found.id.slice(0, 8).toUpperCase(),
                            rawId: found.id,
                            status: statusKey,
                            price: found.quote?.price || 0,
                            medications: found.quote?.prescription?.notes
                                ? [found.quote.prescription.notes]
                                : ['Receita Médica Anexada'],
                            pharmacy: found.quote?.pharmacy ? {
                                name: found.quote.pharmacy.name,
                                initials: found.quote.pharmacy.name.slice(0, 2).toUpperCase(),
                                rating: 4.9,
                                phone: found.quote.pharmacy.phone
                            } : null,
                            timeline: steps.map((s, idx) => ({
                                status: s.label,
                                completed: idx <= curIdx,
                                active: idx === curIdx
                            }))
                        });
                    }
                }
            })
            .catch(err => {
                console.warn('Usando dados locais de pedido:', err);
            })
            .finally(() => setLoading(false));
    }, [id]);

    const status = orderStatuses[order.status] || defaultStatusConfig[order.status] || defaultStatusConfig.PRODUCTION;

    return (
        <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="aurora-blob aurora-blob-1" />
            <div className="aurora-blob aurora-blob-2" />

            <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                <Header title="Rastreamento em Tempo Real" showBack />

                <div className="page" style={{ maxWidth: '640px', margin: '0 auto' }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                            <Loader2 className="animate-spin" size={36} color="var(--primary-600)" />
                        </div>
                    ) : (
                        <>
                            {/* Order ID & Glowing Hero Card */}
                            <div className="glass-card-dark animate-scale-in" style={{
                                padding: 'var(--space-6)',
                                marginBottom: 'var(--space-6)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    position: 'absolute', top: '-20%', right: '-10%',
                                    width: '180px', height: '180px', borderRadius: '50%',
                                    background: 'rgba(20, 184, 166, 0.25)', filter: 'blur(40px)'
                                }} />

                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span className="neon-pulse" />
                                            <span style={{ fontSize: 'var(--font-xs)', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>
                                                Acompanhamento ao Vivo
                                            </span>
                                        </div>
                                        <span className="glass-badge" style={{
                                            background: 'rgba(20, 184, 166, 0.25)',
                                            borderColor: 'rgba(94, 234, 212, 0.4)',
                                            color: '#5eead4'
                                        }}>
                                            {status.label}
                                        </span>
                                    </div>

                                    <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: 6 }}>
                                        Pedido #{order.id}
                                    </h2>

                                    <p style={{ fontSize: 'var(--font-sm)', color: 'rgba(203, 213, 225, 0.9)', marginBottom: 'var(--space-4)' }}>
                                        {order.medications.join(' • ')}
                                    </p>

                                    {order.price && (
                                        <div style={{
                                            paddingTop: 'var(--space-3)',
                                            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span style={{ fontSize: 'var(--font-xs)', color: 'rgba(255, 255, 255, 0.6)' }}>Valor Total Confirmado:</span>
                                            <span style={{ fontSize: 'var(--font-2xl)', fontWeight: 900, color: '#5eead4' }}>
                                                R$ {Number(order.price).toFixed(2).replace('.', ',')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stepper Timeline */}
                            <div className="glass-card animate-slide-up" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-5)' }}>
                                    <Clock size={20} color="var(--primary-600)" />
                                    <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: 'var(--gray-900)' }}>
                                        Progresso da Manipulação
                                    </h3>
                                </div>

                                <div className="timeline" style={{ paddingLeft: '8px' }}>
                                    {order.timeline.map((item, i) => (
                                        <div key={i} className="timeline-item" style={{ position: 'relative', paddingBottom: 'var(--space-5)' }}>
                                            <div 
                                                className={`timeline-dot ${item.completed ? 'completed' : ''} ${item.active ? 'active' : ''}`}
                                                style={item.completed ? {
                                                    background: 'var(--primary-600)',
                                                    boxShadow: '0 0 12px rgba(13, 148, 136, 0.4)'
                                                } : item.active ? {
                                                    background: 'var(--warning)',
                                                    boxShadow: '0 0 12px rgba(245, 158, 11, 0.4)'
                                                } : {}}
                                            >
                                                {item.completed ? (
                                                    <Check size={14} color="white" />
                                                ) : item.active ? (
                                                    <Clock size={14} color="white" />
                                                ) : (
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gray-300)' }} />
                                                )}
                                            </div>
                                            <div style={{ paddingLeft: '14px' }}>
                                                <p style={{
                                                    fontWeight: item.completed || item.active ? 700 : 500,
                                                    fontSize: 'var(--font-sm)',
                                                    color: item.completed ? 'var(--gray-900)' : item.active ? 'var(--primary-700)' : 'var(--gray-400)',
                                                }}>
                                                    {item.status}
                                                </p>
                                                {item.date && (
                                                    <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: 2 }}>{item.date}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pharmacy Info Card */}
                            {order.pharmacy && (
                                <div className="glass-card animate-slide-up" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                                        <div style={{
                                            width: '48px', height: '48px', borderRadius: '14px',
                                            background: 'linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)',
                                            color: 'white', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontWeight: 800, fontSize: '16px',
                                            boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)'
                                        }}>
                                            {order.pharmacy.initials}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ fontWeight: 700, fontSize: 'var(--font-base)', color: 'var(--gray-900)' }}>
                                                {order.pharmacy.name}
                                            </h4>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                <StarRating rating={Math.round(order.pharmacy.rating || 5)} size={12} />
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-700)' }}>
                                                    {order.pharmacy.rating}
                                                </span>
                                                <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>• Farmácia Homologada</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                        <button 
                                            className="btn btn-outline" 
                                            style={{
                                                flex: 1, padding: '10px', borderRadius: 'var(--radius-lg)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--gray-700)',
                                                background: 'rgba(255, 255, 255, 0.8)'
                                            }}
                                            onClick={() => window.open(`tel:${order.pharmacy.phone || ''}`)}
                                        >
                                            <Phone size={15} color="var(--primary-600)" />
                                            Ligar Farmácia
                                        </button>
                                        <button 
                                            className="btn btn-glass-primary" 
                                            style={{
                                                flex: 1, padding: '10px', borderRadius: 'var(--radius-lg)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                fontSize: 'var(--font-sm)', fontWeight: 700
                                            }}
                                            onClick={() => alert('Canal de WhatsApp direto com o farmacêutico responsável aberto!')}
                                        >
                                            <MessageCircle size={15} />
                                            Falar no WhatsApp
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Estimated Delivery */}
                            <div className="glass-card animate-slide-up" style={{
                                padding: 'var(--space-4) var(--space-5)',
                                display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                                background: 'linear-gradient(135deg, rgba(240, 253, 250, 0.85) 0%, rgba(255, 255, 255, 0.95) 100%)',
                                border: '1px solid rgba(20, 184, 166, 0.3)'
                            }}>
                                <div style={{
                                    width: '46px', height: '46px', borderRadius: '12px',
                                    background: 'rgba(20, 184, 166, 0.15)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Package size={24} color="var(--primary-700)" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'var(--primary-800)' }}>
                                        Previsão de Entrega no Endereço
                                    </p>
                                    <p style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)', marginTop: 2 }}>
                                        Em até 24 a 48 horas úteis após finalização do laboratório
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
