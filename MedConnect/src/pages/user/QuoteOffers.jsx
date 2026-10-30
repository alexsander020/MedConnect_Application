import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import StarRating from '../../components/StarRating';
import { MapPin, Clock, Check, ArrowRight, Loader2, Award, ShieldCheck, AlertCircle, Package, PawPrint } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function QuoteOffers() {
    const navigate = useNavigate();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [selectedQuoteId, setSelectedQuoteId] = useState(null);

    // Consulta em tempo real de receitas e suas respectivas cotações recebidas
    const {
        data: prescriptions = [],
        isLoading,
        isError,
        refetch
    } = useQuery({
        queryKey: ['myPrescriptions'],
        queryFn: async () => {
            const res = await api.get('/prescriptions/my');
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    // Mutaçāo transacional de aprovação de cotação e criação de pedido
    const acceptMutation = useMutation({
        mutationFn: async (quoteId) => {
            const res = await api.post('/orders', { quoteId });
            return res.data;
        },
        onSuccess: (newOrder) => {
            queryClient.invalidateQueries({ queryKey: ['myPrescriptions'] });
            queryClient.invalidateQueries({ queryKey: ['myOrders'] });
            toast.success('Cotação aprovada com sucesso! Seu pedido entrou em produção.');
            setTimeout(() => {
                navigate(`/order/${newOrder.id}`);
            }, 1200);
        },
        onError: (err) => {
            const msg = err?.response?.data?.error?.message || 'Não foi possível aprovar a cotação. Tente novamente.';
            toast.error(msg);
            setSelectedQuoteId(null);
        }
    });

    const handleAcceptQuote = (quoteId) => {
        setSelectedQuoteId(quoteId);
        acceptMutation.mutate(quoteId);
    };

    // Agrupa todas as cotações pendentes de aprovação
    const offers = [];
    prescriptions.forEach((presc) => {
        if (presc.quotes && presc.quotes.length > 0) {
            presc.quotes.forEach((q) => {
                if (q.status === 'PENDING') {
                    offers.push({
                        ...q,
                        prescriptionId: presc.id,
                        isVet: presc.kind === 'VETERINARY',
                        pet: presc.pet,
                        medicationsText: presc.notes || (presc.kind === 'VETERINARY' ? 'Receita veterinária enviada' : 'Receita médica enviada'),
                        pharmacyName: q.pharmacy?.name || 'Farmácia Parceira',
                        deliveryDaysText: q.deliveryDays ? `${q.deliveryDays} dias úteis` : '2 dias úteis',
                        priceFormatted: q.price || (q.priceCents ? (q.priceCents / 100).toFixed(2) : '0.00'),
                        numericPrice: Number(q.price || (q.priceCents ? q.priceCents / 100 : 0))
                    });
                }
            });
        }
    });

    const sortedOffers = [...offers].sort((a, b) => a.numericPrice - b.numericPrice);
    const bestPriceId = sortedOffers[0]?.id;

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
                            <Award size={24} color="var(--primary-600)" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <p style={{ fontSize: 'var(--font-base)', fontWeight: 800, color: 'var(--gray-900)', margin: 0 }}>
                                    {offers.length} Proposta{offers.length === 1 ? '' : 's'} Recebida{offers.length === 1 ? '' : 's'}
                                </p>
                                {offers.length > 0 && (
                                    <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 8px' }}>
                                        Melhor Preço Destacado
                                    </span>
                                )}
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--gray-600)', margin: '2px 0 0' }}>
                                Compare prazos, orçamentos e aprove com 1 clique para iniciar a manipulação.
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                            <Loader2 className="animate-spin" size={40} color="var(--primary-600)" />
                        </div>
                    ) : isError ? (
                        <div className="glass-card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <AlertCircle size={40} color="var(--error)" style={{ margin: '0 auto 12px' }} />
                            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: 8 }}>Erro ao carregar cotações</h3>
                            <p style={{ color: 'var(--gray-600)', marginBottom: 16 }}>Não foi possível buscar as propostas enviadas pelas farmácias.</p>
                            <button className="btn btn-primary" onClick={() => refetch()}>Tentar Novamente</button>
                        </div>
                    ) : offers.length === 0 ? (
                        <div className="glass-card" style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
                            <Package size={48} color="var(--gray-400)" style={{ margin: '0 auto 16px' }} />
                            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: 8 }}>
                                Nenhuma proposta pendente no momento
                            </h3>
                            <p style={{ color: 'var(--gray-600)', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                                As farmácias credenciadas estão analisando suas receitas enviadas. Assim que uma proposta for formulada, você receberá um aviso instantâneo.
                            </p>
                            <button className="btn btn-primary" onClick={() => navigate('/new-quote')}>
                                Enviar Nova Receita
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            {sortedOffers.map((quote) => {
                                const isBestPrice = quote.id === bestPriceId;
                                const isProcessing = acceptMutation.isPending && selectedQuoteId === quote.id;

                                return (
                                    <div
                                        key={quote.id}
                                        className="glass-card animate-slide-up"
                                        style={{
                                            padding: 'var(--space-5)',
                                            border: isBestPrice ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.4)',
                                            position: 'relative'
                                        }}
                                    >
                                        {isBestPrice && (
                                            <div style={{
                                                position: 'absolute', top: '-10px', right: '16px',
                                                background: '#10b981', color: 'white', fontSize: '11px',
                                                fontWeight: 800, padding: '2px 10px', borderRadius: '12px',
                                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                                            }}>
                                                ⭐ MENOR PREÇO
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--gray-900)' }}>
                                                        {quote.pharmacyName}
                                                    </h3>
                                                    {quote.isVet && (
                                                        <span className="badge badge-success" style={{ fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <PawPrint size={10} /> Veterinário
                                                        </span>
                                                    )}
                                                </div>
                                                {quote.isVet && quote.pet && (
                                                    <p style={{ fontSize: '12px', color: 'var(--primary-700)', fontWeight: 600, margin: '0 0 4px' }}>
                                                        Animal: {quote.pet.name} ({quote.pet.species} • {(quote.pet.weightGrams / 1000).toFixed(1)} kg)
                                                    </p>
                                                )}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <StarRating rating={5} size={12} />
                                                    <span style={{ fontSize: '12px', fontWeight: 700 }}>5.0</span>
                                                    <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>(Farmácia Credenciada)</span>
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary-700)', display: 'block' }}>
                                                    R$ {quote.priceFormatted}
                                                </span>
                                                <span style={{ fontSize: '12px', color: 'var(--gray-500)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <Clock size={12} /> {quote.deliveryDaysText}
                                                </span>
                                            </div>
                                        </div>

                                        <p style={{ fontSize: '13px', color: 'var(--gray-600)', background: 'rgba(243, 244, 246, 0.6)', padding: '8px 12px', borderRadius: '8px', margin: '0 0 16px' }}>
                                            <strong>Receita:</strong> {quote.medicationsText}
                                            {quote.notes && <span style={{ display: 'block', marginTop: '4px', fontStyle: 'italic' }}>Obs: {quote.notes}</span>}
                                        </p>

                                        <button
                                            className="btn btn-primary btn-block"
                                            onClick={() => handleAcceptQuote(quote.id)}
                                            disabled={acceptMutation.isPending}
                                            style={{
                                                padding: '10px 16px',
                                                fontSize: '14px',
                                                fontWeight: 700,
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                gap: 8
                                            }}
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    Processando Pedido...
                                                </>
                                            ) : (
                                                <>
                                                    <Check size={16} />
                                                    Aprovar Cotação e Fazer Pedido
                                                </>
                                            )}
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
