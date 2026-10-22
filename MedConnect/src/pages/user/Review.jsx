import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../../components/Header';
import StarRating from '../../components/StarRating';
import { Check, Send, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function Review() {
    const navigate = useNavigate();
    const { id } = useParams();
    const toast = useToast();
    const queryClient = useQueryClient();

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const reviewMutation = useMutation({
        mutationFn: async ({ orderId, rating, comment }) => {
            const res = await api.post('/reviews', { orderId, rating, comment });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['order', id] });
            queryClient.invalidateQueries({ queryKey: ['myOrders'] });
            setSubmitted(true);
            toast.success('Avaliação enviada com sucesso! Obrigado pelo feedback.');
            setTimeout(() => navigate('/orders'), 2200);
        },
        onError: (err) => {
            const msg = err?.response?.data?.error?.message || 'Não foi possível registrar a avaliação.';
            toast.error(msg);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (rating < 1 || rating > 5) {
            toast.warning('Selecione uma nota de 1 a 5 estrelas.');
            return;
        }

        reviewMutation.mutate({
            orderId: id,
            rating,
            comment: comment.trim() || undefined
        });
    };

    if (submitted) {
        return (
            <div className="app-container">
                <div className="page" style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '80vh', textAlign: 'center',
                }}>
                    <div className="animate-scale-in" style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: 'var(--success-light)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        marginBottom: 'var(--space-5)',
                    }}>
                        <Check size={40} color="var(--success)" />
                    </div>
                    <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                        Avaliação Enviada!
                    </h2>
                    <p className="text-sm text-gray">Obrigado por ajudar a manter a qualidade da rede</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <Header title="Avaliar Atendimento" showBack />

            <div className="page" style={{ maxWidth: '540px', margin: '0 auto' }}>
                <div className="animate-slide-up" style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: 'var(--primary-50)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto var(--space-4)', fontSize: '36px',
                    }}>
                        ⭐
                    </div>
                    <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                        Como foi sua experiência?
                    </h2>
                    <p className="text-sm text-gray">Pedido #{id ? id.slice(0, 8).toUpperCase() : ''}</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Stars */}
                    <div className="animate-scale-in" style={{
                        display: 'flex', justifyContent: 'center',
                        marginBottom: 'var(--space-8)', gap: 'var(--space-2)',
                    }}>
                        <StarRating rating={rating} size={36} interactive onChange={setRating} />
                    </div>

                    {rating > 0 && (
                        <div className="animate-slide-up">
                            <p className="text-center font-semibold mb-6" style={{
                                color: rating >= 4 ? 'var(--success)' : rating >= 3 ? 'var(--warning)' : 'var(--error)',
                                fontSize: 'var(--font-lg)',
                            }}>
                                {rating === 5 && 'Excelente! 🎉'}
                                {rating === 4 && 'Muito bom! 😊'}
                                {rating === 3 && 'Regular 😐'}
                                {rating === 2 && 'Ruim 😕'}
                                {rating === 1 && 'Péssimo 😞'}
                            </p>

                            <div className="form-group">
                                <label className="form-label">Comentário (opcional)</label>
                                <textarea
                                    className="form-input form-textarea"
                                    placeholder="Conte como foi o atendimento, prazo de entrega, qualidade..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={4}
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg btn-block mt-4"
                                disabled={reviewMutation.isPending}
                            >
                                {reviewMutation.isPending ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Enviar Avaliação
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
