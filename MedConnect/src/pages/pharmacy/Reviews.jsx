import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import StarRating from '../../components/StarRating';
import { Star, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function Reviews() {
    const { user } = useAuth();
    const pharmacyId = user?.id;

    // Busca avaliações reais da farmácia autenticada
    const {
        data: reviews = [],
        isLoading,
        isError,
        refetch
    } = useQuery({
        queryKey: ['pharmacyReviews', pharmacyId],
        queryFn: async () => {
            if (!pharmacyId) return [];
            const res = await api.get(`/reviews/pharmacy/${pharmacyId}`);
            return Array.isArray(res.data) ? res.data : [];
        },
        enabled: !!pharmacyId
    });

    const reviewsCount = reviews.length;
    const avgRating = reviewsCount > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount).toFixed(1)
        : '5.0';

    const ratingDist = [5, 4, 3, 2, 1].map((stars) => {
        const count = reviews.filter((r) => r.rating === stars).length;
        const percent = reviewsCount > 0 ? (count / reviewsCount) * 100 : 0;
        return { stars, count, percent };
    });

    return (
        <div className="app-container">
            <Header title="Avaliações de Clientes" />

            <div className="page" style={{ maxWidth: '640px', margin: '0 auto' }}>
                {/* Summary card */}
                <div className="card animate-scale-in" style={{
                    marginBottom: 'var(--space-6)',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: 'none',
                    padding: '24px'
                }}>
                    <div className="flex items-center gap-6">
                        <div style={{ textAlign: 'center', minWidth: '100px' }}>
                            <p style={{ fontSize: 'var(--font-4xl)', fontWeight: 800, color: '#92400e', lineHeight: 1, margin: '0 0 6px' }}>
                                {avgRating}
                            </p>
                            <StarRating rating={Math.round(Number(avgRating))} size={16} />
                            <p className="text-xs mt-2" style={{ color: '#92400e', fontWeight: 600 }}>
                                {reviewsCount} {reviewsCount === 1 ? 'avaliação' : 'avaliações'}
                            </p>
                        </div>
                        <div style={{ flex: 1 }}>
                            {ratingDist.map(({ stars, count, percent }) => (
                                <div key={stars} className="flex items-center gap-2" style={{ marginBottom: '4px' }}>
                                    <span className="text-xs font-semibold" style={{ width: '12px', color: '#92400e' }}>{stars}</span>
                                    <Star size={12} fill="#f59e0b" color="#f59e0b" />
                                    <div style={{
                                        flex: 1, height: '6px', background: 'rgba(146,64,14,0.15)',
                                        borderRadius: '3px', overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${percent}%`, height: '100%',
                                            background: '#f59e0b', borderRadius: '3px',
                                            transition: 'width 0.5s ease-out',
                                        }} />
                                    </div>
                                    <span className="text-xs" style={{ width: '20px', textAlign: 'right', color: '#92400e' }}>{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Reviews List */}
                {isLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <Loader2 className="animate-spin" size={36} color="var(--primary-600)" style={{ margin: '0 auto' }} />
                    </div>
                ) : isError ? (
                    <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
                        <AlertCircle size={36} color="var(--error)" style={{ margin: '0 auto 8px' }} />
                        <p className="text-sm font-semibold" style={{ color: 'var(--gray-800)', marginBottom: '8px' }}>
                            Erro ao carregar avaliações
                        </p>
                        <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '13px' }} onClick={() => refetch()}>
                            Tentar Novamente
                        </button>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <MessageSquare size={40} color="var(--gray-300)" style={{ margin: '0 auto 12px' }} />
                        <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-800)', marginBottom: '4px' }}>
                            Nenhuma avaliação recebida ainda
                        </h4>
                        <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: 0 }}>
                            Assim que os pacientes receberem fórmulas entregues com sucesso, os depoimentos e notas aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        {reviews.map((review) => {
                            const patientName = review.patient?.name || 'Paciente';
                            const initials = patientName.slice(0, 2).toUpperCase();
                            const formattedDate = new Date(review.createdAt).toLocaleDateString('pt-BR');

                            return (
                                <div key={review.id} className="card animate-slide-up" style={{ padding: '18px' }}>
                                    <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-3)' }}>
                                        <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '12px', background: 'var(--primary-50)', color: 'var(--primary-700)', fontWeight: 700 }}>
                                            {initials}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 className="font-semibold text-sm" style={{ margin: 0 }}>{patientName}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <StarRating rating={review.rating} size={12} />
                                                <span className="text-xs text-gray">{formattedDate}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {review.comment && (
                                        <p className="text-sm" style={{ color: 'var(--gray-700)', lineHeight: 1.5, margin: 0 }}>
                                            "{review.comment}"
                                        </p>
                                    )}
                                    <p className="text-xs text-gray mt-2" style={{ margin: '8px 0 0' }}>
                                        Pedido: #{review.orderId.slice(0, 8).toUpperCase()}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
