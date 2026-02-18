import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header';
import { mockPharmacyRequests } from '../../data/mockData';
import { DollarSign, Clock, MessageSquare, Send, Check } from 'lucide-react';

export default function SendQuote() {
    const navigate = useNavigate();
    const { id } = useParams();
    const request = mockPharmacyRequests.find(r => r.id === id) || mockPharmacyRequests[0];

    const [price, setPrice] = useState('');
    const [days, setDays] = useState('');
    const [notes, setNotes] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
        setTimeout(() => navigate('/pharmacy/requests'), 2000);
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
                        Cotação Enviada!
                    </h2>
                    <p className="text-sm text-gray">O cliente receberá sua proposta</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <Header title="Enviar Cotação" showBack />

            <div className="page">
                {/* Request summary */}
                <div className="card animate-slide-down" style={{
                    marginBottom: 'var(--space-5)', background: 'var(--gray-50)',
                    border: '1px solid var(--gray-200)',
                }}>
                    <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-3)' }}>
                        <div className="avatar" style={{ background: 'var(--gradient-secondary)', width: '40px', height: '40px', fontSize: '13px' }}>
                            {request.user.initials}
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm">{request.user.name}</h4>
                            <p className="text-xs text-gray">{request.prescription}</p>
                        </div>
                    </div>
                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        {request.medications.map((med, i) => (
                            <span key={i} className="badge badge-primary">{med}</span>
                        ))}
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="animate-slide-up">
                    <div className="form-group">
                        <label className="form-label">💰 Valor Total (R$)</label>
                        <div style={{ position: 'relative' }}>
                            <DollarSign size={18} style={{
                                position: 'absolute', left: '14px', top: '50%',
                                transform: 'translateY(-50%)', color: 'var(--gray-400)',
                            }} />
                            <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                placeholder="0,00"
                                style={{ paddingLeft: '42px', fontSize: 'var(--font-xl)', fontWeight: 700 }}
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">📅 Prazo de Entrega (dias úteis)</label>
                        <div style={{ position: 'relative' }}>
                            <Clock size={18} style={{
                                position: 'absolute', left: '14px', top: '50%',
                                transform: 'translateY(-50%)', color: 'var(--gray-400)',
                            }} />
                            <input
                                type="number"
                                className="form-input"
                                placeholder="Ex: 3"
                                style={{ paddingLeft: '42px' }}
                                value={days}
                                onChange={(e) => setDays(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">💬 Observações</label>
                        <div style={{ position: 'relative' }}>
                            <MessageSquare size={18} style={{
                                position: 'absolute', left: '14px', top: '14px',
                                color: 'var(--gray-400)',
                            }} />
                            <textarea
                                className="form-input form-textarea"
                                placeholder="Informações adicionais para o cliente..."
                                style={{ paddingLeft: '42px' }}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Price preview */}
                    {price && (
                        <div className="price-highlight animate-scale-in" style={{ marginBottom: 'var(--space-4)' }}>
                            <p className="text-xs text-gray text-center" style={{ marginBottom: '2px' }}>Resumo da proposta</p>
                            <p className="text-center" style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--primary-700)' }}>
                                R$ {Number(price).toFixed(2).replace('.', ',')}
                            </p>
                            {days && (
                                <p className="text-sm text-center text-gray" style={{ marginTop: '4px' }}>
                                    Entrega em {days} dia{days > 1 ? 's' : ''} útei{days > 1 ? 's' : 'l'}
                                </p>
                            )}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary btn-lg btn-block">
                        <Send size={18} />
                        Enviar Proposta
                    </button>
                </form>
            </div>
        </div>
    );
}
