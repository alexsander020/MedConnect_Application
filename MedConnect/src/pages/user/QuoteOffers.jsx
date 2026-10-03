import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import StarRating from '../../components/StarRating';
import { mockQuoteOffers } from '../../data/mockData';
import { MapPin, Clock, MessageSquare, Check, ArrowRight, Loader2, Sparkles, Award, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

export default function QuoteOffers() {
    const navigate = useNavigate();
    const [selectedQuote, setSelectedQuote] = useState(null);
    const [offers, setOffers] = useState(mockQuoteOffers);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/prescriptions/my')
            .then(res => {
                if (res.data && res.data.length > 0) {
                    const allQuotes = [];
                    res.data.forEach(p => {
                        if (p.quotes && p.quotes.length > 0) {
                            p.quotes.forEach(q => {
                                allQuotes.push({
                                    id: q.id,
                                    pharmacy: {
                                        name: q.pharmacy?.name || 'Farmácia Parceira',
                                        initials: (q.pharmacy?.name || 'FP').slice(0, 2).toUpperCase(),
                                        rating: 4.9,
                                        totalReviews: 184,
                                        distance: '2.3 km'
                                    },
                                    price: q.price,
                                    deliveryDays: q.deliveryDays || 2,
                                    notes: q.notes || 'Medicamento manipulado com alto rigor e insumos certificados.',
                                    medications: [p.notes || 'Receita Médica'],
                                });
                            });
                        }
                    });
                    if (allQuotes.length > 0) {
                        setOffers(allQuotes);
                    }
                }
            })
            .catch(err => {
                console.warn('Usando cotações demonstrativas:', err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    // Sort by price to find best
    const sortedOffers = [...offers].sort((a, b) => a.price - b.price);
    const bestPriceId = sortedOffers[0]?.id;

    const handleAccept = async (quoteId) => {
        setSelectedQuote(quoteId);
        try {
            await api.post('/orders', { quoteId });
        } catch (err) {
            console.warn('Erro ao criar pedido na API, mantendo demonstração visual:', err);
        } finally {
            setTimeout(() => navigate('/orders'), 1600);
        }
    };

    return (
        <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="aurora-blob aurora-blob-1" />
            <div className="aurora-blob aurora-blob-3" />

            <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                <Header title="Comparador de Cotações" showBack />

                <div className="page" style={{ maxWidth: '680px', margin: '0 auto' }}>
                    {/* Header Banner */}
                    <div className="glass-card animate-slide-down" style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                        marginBottom: 'var(--space-6)', padding: 'var(--space-4)',
                        background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.9) 0%, rgba(255, 255, 255, 0.95) 100%)',
                        border: '1px solid rgba(99, 102, 241, 0.25)'
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: 'rgba(99, 102, 241, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Award size={24} color="var(--secondary-600)" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <p style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: 'var(--gray-900)' }}>
                                    {offers.length} Farmácias Responderam
                                </p>
                                <span className="glass-pill glass-pill-primary" style={{ fontSize: '10px', padding: '2px 8px' }}>
                                    Melhor Preço Identificado
                                </span>
                            </div>
                            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-600)', marginTop: 2 }}>
                                Escolha a melhor opção de preço, avaliação e prazo de entrega
                            </p>
                        </div>
                    </div>

                    {/* Offers List */}
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
                            <Loader2 className="animate-spin" size={36} color="var(--primary-600)" />
                        </div>
                    ) : (
                        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            {sortedOffers.map((offer) => {
                                const isBest = offer.id === bestPriceId;
                                const isSelected = selectedQuote === offer.id;

                                return (
                                    <div
                                        key={offer.id}
                                        className="glass-card animate-slide-up"
                                        style={{
                                            padding: 'var(--space-5)',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            border: isBest ? '2px solid var(--primary-400)' : '1px solid rgba(255, 255, 255, 0.75)',
                                            background: isSelected 
                                                ? 'linear-gradient(135deg, rgba(209, 250, 229, 0.95) 0%, rgba(240, 253, 250, 0.95) 100%)'
                                                : isBest
                                                    ? 'linear-gradient(135deg, rgba(240, 253, 250, 0.92) 0%, rgba(255, 255, 255, 0.95) 100%)'
                                                    : 'rgba(255, 255, 255, 0.85)'
                                        }}
                                    >
                                        {/* Success overlay on select */}
                                        {isSelected && (
                                            <div className="animate-scale-in" style={{
                                                position: 'absolute', inset: 0, display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                background: 'rgba(255, 255, 255, 0.95)',
                                                backdropFilter: 'blur(10px)',
                                                zIndex: 10
                                            }}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{
                                                        width: '54px', height: '54px', borderRadius: '50%',
                                                        background: 'var(--success)', display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        margin: '0 auto var(--space-3)',
                                                        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)'
                                                    }}>
                                                        <Check size={28} color="white" />
                                                    </div>
                                                    <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'var(--gray-900)' }}>
                                                        Proposta Aprovada!
                                                    </h3>
                                                    <p style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-600)', marginTop: 2 }}>
                                                        Gerando pedido e enviando para produção...
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Best price badge */}
                                        {isBest && (
                                            <div style={{
                                                position: 'absolute', top: 0, right: 0,
                                                background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                                                color: 'white', fontSize: '11px', fontWeight: 800,
                                                padding: '4px 14px', borderBottomLeftRadius: '12px',
                                                display: 'flex', alignItems: 'center', gap: 4,
                                                boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)'
                                            }}>
                                                <Sparkles size={12} />
                                                MELHOR CUSTO-BENEFÍCIO
                                            </div>
                                        )}

                                        {/* Pharmacy Info Header */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                                            <div style={{
                                                width: '46px', height: '46px', borderRadius: '14px',
                                                background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)',
                                                color: 'white', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', fontWeight: 800, fontSize: '15px',
                                                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                                            }}>
                                                {offer.pharmacy.initials}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ fontWeight: 700, fontSize: 'var(--font-base)', color: 'var(--gray-900)' }}>
                                                    {offer.pharmacy.name}
                                                </h4>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                    <StarRating rating={Math.round(offer.pharmacy.rating || 5)} size={12} />
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-700)' }}>
                                                        {offer.pharmacy.rating || 4.9}
                                                    </span>
                                                    <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                                                        ({offer.pharmacy.totalReviews || 120} avaliações)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Price & Delivery Highlights */}
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-3)',
                                            marginBottom: 'var(--space-4)',
                                        }}>
                                            <div className="glass-panel" style={{
                                                padding: 'var(--space-3) var(--space-4)',
                                                background: 'rgba(255, 255, 255, 0.7)',
                                                borderRadius: 'var(--radius-lg)'
                                            }}>
                                                <p style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 600 }}>Valor Total</p>
                                                <p style={{
                                                    fontSize: 'var(--font-2xl)', fontWeight: 900,
                                                    color: isBest ? 'var(--primary-700)' : 'var(--gray-900)',
                                                    letterSpacing: '-0.02em', marginTop: 2
                                                }}>
                                                    R$ {Number(offer.price).toFixed(2).replace('.', ',')}
                                                </p>
                                            </div>

                                            <div className="glass-panel" style={{
                                                padding: 'var(--space-3) var(--space-4)',
                                                background: 'rgba(255, 255, 255, 0.7)',
                                                borderRadius: 'var(--radius-lg)'
                                            }}>
                                                <p style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 600 }}>Prazo de Entrega</p>
                                                <p style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'var(--gray-800)', marginTop: 4 }}>
                                                    {offer.deliveryDays} {offer.deliveryDays > 1 ? 'dias úteis' : 'dia útil'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        {offer.notes && (
                                            <div style={{
                                                padding: 'var(--space-3)',
                                                background: 'rgba(241, 245, 249, 0.7)',
                                                borderRadius: 'var(--radius-md)',
                                                fontSize: 'var(--font-xs)',
                                                color: 'var(--gray-600)',
                                                marginBottom: 'var(--space-4)',
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 6
                                            }}>
                                                <MessageSquare size={14} color="var(--gray-400)" style={{ marginTop: 2, flexShrink: 0 }} />
                                                <span>{offer.notes}</span>
                                            </div>
                                        )}

                                        {/* Distance and badges */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-xs)', color: 'var(--gray-500)' }}>
                                                <MapPin size={13} color="var(--gray-400)" />
                                                <span>Distância: {offer.pharmacy.distance || '3 km'}</span>
                                            </div>
                                            <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 700 }}>
                                                ✓ Frete com rastreamento
                                            </span>
                                        </div>

                                        {/* Accept Button */}
                                        <button
                                            className={`btn btn-block ${isBest ? 'btn-glass-primary' : 'btn-primary'}`}
                                            style={{
                                                padding: '12px',
                                                borderRadius: 'var(--radius-xl)',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 8
                                            }}
                                            onClick={() => handleAccept(offer.id)}
                                            disabled={selectedQuote !== null}
                                        >
                                            Aceitar esta Proposta
                                            <ArrowRight size={18} />
                                        </button>
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
