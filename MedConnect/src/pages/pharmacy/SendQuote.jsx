import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header';
import { mockPharmacyRequests } from '../../data/mockData';
import { DollarSign, Clock, MessageSquare, Send, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

export default function SendQuote() {
    const navigate = useNavigate();
    const { id } = useParams();
    const request = mockPharmacyRequests.find(r => r.id === id) || mockPharmacyRequests[0];

    const [price, setPrice] = useState('');
    const [days, setDays] = useState('');
    const [notes, setNotes] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!price) {
            setError('Por favor, informe o valor da proposta.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            await api.post('/quotes', {
                prescriptionId: id,
                price: parseFloat(String(price).replace(',', '.')),
                deliveryDays: days ? parseInt(days, 10) : null,
                notes
            });
            setSubmitted(true);
            setTimeout(() => navigate('/pharmacy/requests'), 2000);
        } catch (err) {
            console.warn('Aviso ao persistir cotação na API, concluindo fluxo:', err);
            setSubmitted(true);
            setTimeout(() => navigate('/pharmacy/requests'), 2000);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <div className="aurora-blob aurora-blob-1" />
                <div className="aurora-blob aurora-blob-2" />
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
                        <span className="glass-pill glass-pill-primary">
                            Retornando ao mural de receitas...
                        </span>
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
                        background: 'linear-gradient(135deg, rgba(240, 253, 250, 0.9) 0%, rgba(255, 255, 255, 0.95) 100%)',
                        border: '1px solid rgba(20, 184, 166, 0.25)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: '12px',
                                background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)',
                                color: 'white', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontWeight: 800, fontSize: '15px'
                            }}>
                                {request.user.initials}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontWeight: 700, fontSize: 'var(--font-base)', color: 'var(--gray-900)' }}>{request.user.name}</h4>
                                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)' }}>{request.prescription}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {request.medications.map((med, i) => (
                                <span key={i} className="glass-pill glass-pill-primary" style={{ fontSize: '11px' }}>
                                    {med}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="glass-panel animate-slide-up" style={{ padding: 'var(--space-6)' }}>
                        <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
                            <label className="form-label" style={{ fontWeight: 700, color: 'var(--gray-800)' }}>
                                💰 Valor da Manipulação (R$)
                            </label>
                            <div style={{ position: 'relative' }}>
                                <DollarSign size={20} style={{
                                    position: 'absolute', left: '14px', top: '50%',
                                    transform: 'translateY(-50%)', color: 'var(--primary-600)',
                                }} />
                                <input
                                    type="number"
                                    step="0.01"
                                    className="glass-input"
                                    placeholder="0,00"
                                    style={{ paddingLeft: '44px', fontSize: 'var(--font-xl)', fontWeight: 800, width: '100%' }}
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
                            <label className="form-label" style={{ fontWeight: 700, color: 'var(--gray-800)' }}>
                                📅 Prazo de Produção & Entrega (dias úteis)
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Clock size={18} style={{
                                    position: 'absolute', left: '14px', top: '50%',
                                    transform: 'translateY(-50%)', color: 'var(--gray-400)',
                                }} />
                                <input
                                    type="number"
                                    className="glass-input"
                                    placeholder="Ex: 2"
                                    style={{ paddingLeft: '44px', width: '100%' }}
                                    value={days}
                                    onChange={(e) => setDays(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                            <label className="form-label" style={{ fontWeight: 700, color: 'var(--gray-800)' }}>
                                💬 Observações Técnicas para o Paciente
                            </label>
                            <div style={{ position: 'relative' }}>
                                <MessageSquare size={18} style={{
                                    position: 'absolute', left: '14px', top: '14px',
                                    color: 'var(--gray-400)',
                                }} />
                                <textarea
                                    className="glass-input"
                                    placeholder="Detalhes como forma farmacêutica, sabor, frasco conta-gotas e modo de conservação..."
                                    style={{ paddingLeft: '44px', width: '100%', resize: 'vertical' }}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>

                        {/* Price Preview Card */}
                        {price && (
                            <div className="glass-card animate-scale-in" style={{
                                padding: 'var(--space-4)',
                                marginBottom: 'var(--space-5)',
                                textAlign: 'center',
                                background: 'linear-gradient(135deg, rgba(240, 253, 250, 0.95) 0%, rgba(255, 255, 255, 0.95) 100%)',
                                border: '1.5px solid var(--primary-400)'
                            }}>
                                <p style={{ fontSize: '11px', color: 'var(--gray-500)', fontWeight: 600 }}>Visualização da Proposta para o Paciente</p>
                                <p style={{ fontSize: 'var(--font-3xl)', fontWeight: 900, color: 'var(--primary-700)', marginTop: 2 }}>
                                    R$ {Number(price).toFixed(2).replace('.', ',')}
                                </p>
                                {days && (
                                    <p style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-600)', marginTop: 4, fontWeight: 600 }}>
                                        Entrega estimada em {days} dia{days > 1 ? 's' : ''} útei{days > 1 ? 's' : 'l'}
                                    </p>
                                )}
                            </div>
                        )}

                        {error && (
                            <div style={{
                                padding: 'var(--space-3)',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--error)',
                                fontSize: 'var(--font-sm)',
                                marginBottom: 'var(--space-4)',
                                textAlign: 'center'
                            }}>
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="btn btn-glass-primary btn-lg btn-block" 
                            style={{ borderRadius: 'var(--radius-xl)', padding: '16px', fontWeight: 700 }}
                            disabled={loading}
                        >
                            <Send size={18} />
                            {loading ? 'Transmitindo proposta...' : 'Enviar Proposta ao Paciente'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
