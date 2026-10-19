import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';
import { Clock, MapPin, Eye, Send, FileText } from 'lucide-react';
import { api } from '../../services/api';

export default function Requests() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('pending');

    const fetchRequests = useCallback(() => {
        setLoading(true);
        setError(null);
        api.get('/prescriptions/pharmacy')
            .then(res => {
                if (Array.isArray(res.data)) {
                    const formatted = res.data.map(p => {
                        const isQuoted = p.quotes && p.quotes.length > 0;
                        const myQuote = isQuoted ? p.quotes[0] : null;
                        const patientName = p.patient?.anonymousId || 'Paciente Anônimo';
                        const initials = 'PA';

                        return {
                            id: p.id,
                            user: {
                                name: patientName,
                                initials: initials
                            },
                            location: 'Região do Paciente (Oculta até aprovação)',
                            prescription: 'Fórmula Médica Solicitada',
                            medications: [p.notes || 'Fórmula sob prescrição médica'],
                            createdAt: new Date(p.createdAt).toLocaleDateString('pt-BR'),
                            status: isQuoted ? 'quoted' : 'pending',
                            quotedPrice: myQuote?.price || 0,
                            fileUrl: null
                        };
                    });
                    setRequests(formatted);
                } else {
                    setRequests([]);
                }
            })
            .catch(err => {
                console.error('Erro ao buscar receitas para farmácia:', err);
                setError(err?.response?.data?.error || 'Não foi possível carregar as oportunidades de receita. Tente novamente.');
                setRequests([]);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const filtered = requests.filter(r =>
        activeTab === 'pending' ? r.status === 'pending' : r.status === 'quoted'
    );

    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const quotedCount = requests.filter(r => r.status === 'quoted').length;

    return (
        <div className="space-y-6 pb-24 md:pb-6">
            {/* Header / Filter bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div>
                    <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>
                        Mural de Oportunidades
                    </h2>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)', marginTop: 2 }}>
                        Receitas médicas de pacientes aguardando propostas de manipulação
                    </p>
                </div>

                {/* Tabs */}
                <div className="glass-tab-container" style={{ width: 'auto', minWidth: '280px' }}>
                    <div 
                        className={`glass-tab ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        Pendentes ({pendingCount})
                    </div>
                    <div 
                        className={`glass-tab ${activeTab === 'quoted' ? 'active' : ''}`}
                        onClick={() => setActiveTab('quoted')}
                    >
                        Cotadas ({quotedCount})
                    </div>
                </div>
            </div>

            {/* Requests Area */}
            {loading ? (
                <LoadingState message="Carregando receitas para cotação..." />
            ) : error ? (
                <ErrorState
                    title="Erro ao carregar receitas"
                    message={error}
                    onRetry={fetchRequests}
                />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title={`Nenhuma receita ${activeTab === 'pending' ? 'pendente' : 'cotada'}`}
                    description="Novas solicitações de pacientes aparecerão aqui em tempo real."
                />
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: 'var(--space-5)'
                }}>
                    {filtered.map((req) => (
                        <div 
                            key={req.id} 
                            className="glass-card animate-slide-up"
                            style={{
                                padding: 'var(--space-5)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--space-3)'
                            }}
                        >
                            {/* Card Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)',
                                    color: 'white', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontWeight: 800, fontSize: '15px',
                                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)'
                                }}>
                                    {req.user.initials}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h4 style={{ fontWeight: 700, fontSize: 'var(--font-base)', color: 'var(--gray-900)' }} className="truncate">
                                        {req.user.name}
                                    </h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 'var(--font-xs)', color: 'var(--gray-500)' }}>
                                        <MapPin size={12} color="var(--gray-400)" />
                                        <span className="truncate">{req.location}</span>
                                    </div>
                                </div>

                                {req.status === 'pending' ? (
                                    <span style={{
                                        background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)', padding: '3px 8px',
                                        borderRadius: 'var(--radius-full)', fontSize: '10px', fontWeight: 700
                                    }}>
                                        NOVA
                                    </span>
                                ) : (
                                    <span style={{
                                        background: 'rgba(99, 102, 241, 0.1)', color: 'var(--secondary-600)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)', padding: '3px 8px',
                                        borderRadius: 'var(--radius-full)', fontSize: '10px', fontWeight: 700
                                    }}>
                                        COTADA
                                    </span>
                                )}
                            </div>

                            {/* Prescription info */}
                            <div className="glass-panel" style={{
                                padding: 'var(--space-3) var(--space-4)',
                                background: 'rgba(255, 255, 255, 0.65)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <FileText size={18} color="var(--primary-600)" />
                                <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--gray-800)' }}>
                                    {req.prescription}
                                </span>
                            </div>

                            {/* Medications tags */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '2px 0' }}>
                                {req.medications.map((med, i) => (
                                    <span 
                                        key={i} 
                                        style={{
                                            background: 'rgba(20, 184, 166, 0.08)',
                                            color: 'var(--primary-800)',
                                            padding: '4px 10px',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-xs)',
                                            fontWeight: 600
                                        }}
                                    >
                                        {med}
                                    </span>
                                ))}
                            </div>

                            {/* Timestamp */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--gray-400)', fontSize: '11px' }}>
                                <Clock size={12} />
                                <span>Publicada em {req.createdAt}</span>
                            </div>

                            {/* Quoted Price if already sent */}
                            {req.status === 'quoted' && (
                                <div style={{
                                    padding: 'var(--space-3)',
                                    background: 'rgba(20, 184, 166, 0.08)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid rgba(20, 184, 166, 0.2)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '12px', color: 'var(--gray-600)', fontWeight: 600 }}>Proposta Enviada:</span>
                                    <span style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'var(--primary-700)' }}>
                                        R$ {req.quotedPrice.toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'auto', paddingTop: 'var(--space-3)', borderTop: '1px solid rgba(226, 232, 240, 0.8)' }}>
                                <button 
                                    className="btn btn-outline" 
                                    style={{
                                        flex: 1, padding: '8px 12px', fontSize: 'var(--font-xs)', fontWeight: 600,
                                        borderRadius: 'var(--radius-lg)', background: 'white'
                                    }}
                                    onClick={() => {
                                        if (req.fileUrl) {
                                            window.open(req.fileUrl, '_blank');
                                        } else {
                                            alert('Conforme as normas de privacidade (LGPD), a imagem da receita e os dados de contato são liberados após o paciente aprovar sua cotação.');
                                        }
                                    }}
                                >
                                    <Eye size={15} />
                                    Ver Receita
                                </button>

                                {req.status === 'pending' && (
                                    <button 
                                        className="btn btn-glass-primary" 
                                        style={{
                                            flex: 1.2, padding: '8px 14px', fontSize: 'var(--font-xs)', fontWeight: 700,
                                            borderRadius: 'var(--radius-lg)'
                                        }}
                                        onClick={() => navigate(`/pharmacy/send-quote/${req.id}`)}
                                    >
                                        <Send size={15} />
                                        Enviar Cotação
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
