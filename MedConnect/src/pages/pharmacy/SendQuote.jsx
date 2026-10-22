import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../../components/Header';
import { DollarSign, Clock, MessageSquare, Send, Check, Loader2, FileText, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function SendQuote() {
    const navigate = useNavigate();
    const { id } = useParams();
    const toast = useToast();
    const queryClient = useQueryClient();

    const [price, setPrice] = useState('');
    const [days, setDays] = useState('');
    const [notes, setNotes] = useState('');
    const [submitted, setSubmitted] = useState(false);

    // Consulta os dados da receita médica
    const {
        data: prescription,
        isLoading,
        isError
    } = useQuery({
        queryKey: ['prescription', id],
        queryFn: async () => {
            const res = await api.get(`/prescriptions/${id}`);
            return res.data;
        },
        enabled: !!id
    });

    // Envio da cotação
    const quoteMutation = useMutation({
        mutationFn: async ({ prescriptionId, price, deliveryDays, notes }) => {
            const res = await api.post('/quotes', {
                prescriptionId,
                price,
                deliveryDays,
                notes
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pharmacyStats'] });
            queryClient.invalidateQueries({ queryKey: ['availablePrescriptions'] });
            queryClient.invalidateQueries({ queryKey: ['prescription', id] });
            setSubmitted(true);
            toast.success('Proposta enviada ao paciente com sucesso!');
            setTimeout(() => navigate('/pharmacy/requests'), 2000);
        },
        onError: (err) => {
            const msg = err?.response?.data?.error?.message || 'Erro ao enviar cotação.';
            toast.error(msg);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const numericPrice = parseFloat(String(price).replace(',', '.'));
        if (!numericPrice || numericPrice <= 0) {
            toast.warning('Informe um valor válido em reais para a proposta.');
            return;
        }

        quoteMutation.mutate({
            prescriptionId: id,
            price: numericPrice,
            deliveryDays: days ? parseInt(days, 10) : undefined,
            notes: notes.trim() || undefined
        });
    };

    if (submitted) {
        return (
            <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <div className="page" style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '80vh', textAlign: 'center',
                    position: 'relative', zIndex: 1
                }}>
                    <div className="glass-panel animate-scale-in" style={{
                        padding: 'var(--space-10) var(--space-8)',
                        maxWidth: '420px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 'var(--space-6)',
                            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
                        }}>
                            <Check size={40} color="white" />
                        </div>
                        <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, marginBottom: 'var(--space-2)', color: 'var(--gray-900)' }}>
                            Proposta Enviada!
                        </h2>
                        <p style={{ color: 'var(--gray-600)', fontSize: 'var(--font-sm)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
                            O cliente receberá a notificação em tempo real com o valor e prazo informados.
                        </p>
                        <span className="badge badge-success">
                            Retornando ao mural de receitas...
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Header title="Enviar Proposta de Cotação" showBack />
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                    <Loader2 className="animate-spin" size={36} color="var(--primary-600)" />
                </div>
            </div>
        );
    }

    if (isError || !prescription) {
        return (
            <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Header title="Enviar Proposta de Cotação" showBack />
                <div className="page" style={{ maxWidth: '500px', margin: '40px auto', textAlign: 'center' }}>
                    <div className="glass-card" style={{ padding: '32px' }}>
                        <AlertCircle size={40} color="var(--error)" style={{ margin: '0 auto 12px' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Receita não encontrada</h3>
                        <p style={{ color: 'var(--gray-600)', marginBottom: '16px' }}>
                            Esta receita pode já ter sido finalizada ou cancelada pelo paciente.
                        </p>
                        <button className="btn btn-primary" onClick={() => navigate('/pharmacy/requests')}>
                            Voltar às Solicitações
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="aurora-blob aurora-blob-1" />
            <div className="aurora-blob aurora-blob-2" />

            <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                <Header title="Enviar Proposta de Cotação" showBack />

                <div className="page" style={{ maxWidth: '640px', margin: '0 auto' }}>
                    {/* Patient Request Summary */}
                    <div className="glass-card animate-slide-down" style={{
                        padding: 'var(--space-5)', marginBottom: 'var(--space-6)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px', color: 'var(--gray-900)' }}>
                                    {prescription.patient?.anonymousId || `Receita #${prescription.id.slice(0, 8).toUpperCase()}`}
                                </h3>
                                <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: 0 }}>
                                    Cadastrada em {new Date(prescription.createdAt).toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                            <span className="badge badge-info">
                                Aguardando Orçamento
                            </span>
                        </div>

                        <div style={{ background: 'rgba(243, 244, 246, 0.7)', padding: '10px 14px', borderRadius: '8px', marginTop: '10px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--gray-500)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Especificação médica da fórmula:
                            </span>
                            <p style={{ fontSize: '13px', color: 'var(--gray-800)', fontWeight: 600, margin: '4px 0 0' }}>
                                {prescription.notes || 'Fórmula sob prescrição médica anexada'}
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="glass-card animate-slide-up" style={{ padding: 'var(--space-6)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', color: 'var(--gray-900)' }}>
                            Dados da Proposta Farmacêutica
                        </h3>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label">Valor Total (R$) *</label>
                            <div style={{ position: 'relative' }}>
                                <DollarSign size={18} color="var(--gray-400)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ex: 89,90"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    style={{ paddingLeft: '38px' }}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label">Prazo de Produção e Entrega (dias úteis)</label>
                            <div style={{ position: 'relative' }}>
                                <Clock size={18} color="var(--gray-400)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    className="form-input"
                                    placeholder="Ex: 2"
                                    value={days}
                                    onChange={(e) => setDays(e.target.value)}
                                    style={{ paddingLeft: '38px' }}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label className="form-label">Observações e Recomendações Farmacêuticas</label>
                            <textarea
                                className="form-input form-textarea"
                                rows={3}
                                placeholder="Ex: Insumos puros com laudo analítico, embalagem âmbar com proteção UV..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-block btn-lg"
                            disabled={quoteMutation.isPending}
                            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                        >
                            {quoteMutation.isPending ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Enviando Orçamento...
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Enviar Proposta ao Paciente
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
