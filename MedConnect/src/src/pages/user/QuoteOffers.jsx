import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import StarRating from '../../components/StarRating';
import { mockQuoteOffers } from '../../data/mockData';
import { MapPin, Clock, MessageSquare, Check, ArrowRight } from 'lucide-react';

export default function QuoteOffers() {
    const navigate = useNavigate();
    const [selectedQuote, setSelectedQuote] = useState(null);

    // Sort by price to find best
    const sortedOffers = [...mockQuoteOffers].sort((a, b) => a.price - b.price);
    const bestPriceId = sortedOffers[0]?.id;

    const handleAccept = (quoteId) => {
        setSelectedQuote(quoteId);
        setTimeout(() => navigate('/orders'), 1500);
    };

    return (
        <div className="app-container">
            <Header title="Propostas Recebidas" showBack />

            <div className="page">
                {/* Info */}
                <div className="animate-slide-down" style={{
                    background: 'var(--info-light)', border: '1px solid #bfdbfe',
                    borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)',
                    marginBottom: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)',
                    alignItems: 'center',
                }}>
                    <span style={{ fontSize: 'var(--font-xl)' }}>📊</span>
                    <div>
                        <p className="text-sm font-semibold" style={{ color: '#1e40af' }}>
                            {mockQuoteOffers.length} propostas recebidas
                        </p>
                        <p className="text-xs" style={{ color: '#3b82f6' }}>
                            Compare preços e prazos antes de escolher
                        </p>
                    </div>
                </div>

                {/* Offers */}
                <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {sortedOffers.map((offer) => (
                        <div
                            key={offer.id}
                            className={`quote-card animate-slide-up ${offer.id === bestPriceId ? 'best-price' : ''}`}
                            style={selectedQuote === offer.id ? {
                                borderColor: 'var(--success)', background: 'var(--success-light)',
                            } : {}}
                        >
                            {selectedQuote === offer.id && (
                                <div className="animate-scale-in" style={{
                                    position: 'absolute', inset: 0, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(255,255,255,0.9)', borderRadius: 'inherit',
                                    zIndex: 2,
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{
                                            width: '48px', height: '48px', borderRadius: '50%',
                                            background: 'var(--success)', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            margin: '0 auto var(--space-2)',
                                        }}>
                                            <Check size={24} color="white" />
                                        </div>
                                        <p className="font-semibold">Proposta aceita!</p>
                                    </div>
                                </div>
                            )}

                            {/* Pharmacy info */}
                            <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
                                <div className="avatar" style={{ background: 'var(--gradient-secondary)' }}>
                                    {offer.pharmacy.initials}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 className="font-semibold text-sm">{offer.pharmacy.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <StarRating rating={Math.round(offer.pharmacy.rating)} size={11} />
                                        <span className="text-xs font-semibold">{offer.pharmacy.rating}</span>
                                        <span className="text-xs text-gray">({offer.pharmacy.totalReviews})</span>
                                    </div>
                                </div>
                            </div>

                            {/* Price and delivery */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)',
                                marginBottom: 'var(--space-3)',
                            }}>
                                <div style={{
                                    background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)',
                                    padding: 'var(--space-3)', textAlign: 'center',
                                }}>
                                    <p className="text-xs text-gray" style={{ marginBottom: '2px' }}>Valor</p>
                                    <p className="quote-price">
                                        R$ {offer.price.toFixed(2).replace('.', ',')}
                                    </p>
                                </div>
                                <div style={{
                                    background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)',
                                    padding: 'var(--space-3)', textAlign: 'center',
                                }}>
                                    <p className="text-xs text-gray" style={{ marginBottom: '2px' }}>Prazo</p>
                                    <p style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--gray-800)' }}>
                                        {offer.deliveryDays} dias
                                    </p>
                                </div>
                            </div>

                            {/* Notes */}
                            {offer.notes && (
                                <div className="flex gap-2 items-center" style={{
                                    background: 'var(--gray-50)', borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-3)',
                                }}>
                                    <MessageSquare size={14} color="var(--gray-400)" />
                                    <p className="text-xs text-gray">{offer.notes}</p>
                                </div>
                            )}

                            {/* Distance */}
                            <div className="flex items-center gap-3 mb-4" style={{ marginBottom: 'var(--space-3)' }}>
                                <div className="flex items-center gap-1">
                                    <MapPin size={12} color="var(--gray-400)" />
                                    <span className="text-xs text-gray">{offer.pharmacy.distance}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock size={12} color="var(--gray-400)" />
                                    <span className="text-xs text-gray">Entrega em {offer.deliveryDays} dias úteis</span>
                                </div>
                            </div>

                            {/* Accept button */}
                            <button
                                className="btn btn-primary btn-block btn-sm"
                                onClick={() => handleAccept(offer.id)}
                                disabled={selectedQuote !== null}
                            >
                                Aceitar Proposta
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
