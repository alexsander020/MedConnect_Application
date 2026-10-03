import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import { Upload, Camera, FileText, MapPin, Send, Check, X, Sparkles, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

export default function NewQuote() {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (f) {
            setFile(f);
            setError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Por favor, anexe o arquivo da sua receita médica.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            if (notes) formData.append('notes', notes);
            if (location) formData.append('location', location);

            await api.post('/prescriptions', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSubmitted(true);
            setTimeout(() => navigate('/orders'), 2000);
        } catch (err) {
            console.error('Erro ao enviar receita:', err);
            setError(err.response?.data?.error || 'Falha ao enviar receita. Tente novamente.');
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
                            width: '84px', height: '84px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 'var(--space-6)',
                            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
                        }}>
                            <Check size={44} color="white" />
                        </div>
                        <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, marginBottom: 'var(--space-3)', color: 'var(--gray-900)' }}>
                            Receita Enviada!
                        </h2>
                        <p style={{ color: 'var(--gray-600)', fontSize: 'var(--font-sm)', lineHeight: 1.6, marginBottom: 'var(--space-6)' }}>
                            Sua solicitação já está disponível para as melhores farmácias credenciadas. Você receberá as propostas em instantes.
                        </p>
                        <span className="glass-pill glass-pill-primary">
                            Redirecionando para seus pedidos...
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
                <Header title="Nova Cotação" showBack />

                <div className="page" style={{ maxWidth: '640px', margin: '0 auto' }}>
                    {/* Header banner */}
                    <div className="glass-card animate-slide-down" style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                        marginBottom: 'var(--space-6)', padding: 'var(--space-4)',
                        background: 'linear-gradient(135deg, rgba(240, 253, 250, 0.9) 0%, rgba(255, 255, 255, 0.9) 100%)',
                        border: '1px solid rgba(20, 184, 166, 0.25)'
                    }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: 10,
                            background: 'rgba(20, 184, 166, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Sparkles size={20} color="var(--primary-600)" />
                        </div>
                        <div>
                            <p style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'var(--primary-800)' }}>
                                Orçamento 100% Gratuito e Seguro
                            </p>
                            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-600)' }}>
                                Envie a receita médica e receba propostas em minutos
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Upload area */}
                        <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                            <label className="form-label" style={{ fontWeight: 700, color: 'var(--gray-800)', marginBottom: 'var(--space-2)' }}>
                                📋 Anexar Receita Médica
                            </label>

                            {!file ? (
                                <label 
                                    className="glass-card animate-slide-up" 
                                    htmlFor="file-upload"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 'var(--space-10) var(--space-6)',
                                        border: '2px dashed rgba(20, 184, 166, 0.4)',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        background: 'rgba(255, 255, 255, 0.75)'
                                    }}
                                >
                                    <div style={{
                                        width: 64, height: 64, borderRadius: '50%',
                                        background: 'rgba(20, 184, 166, 0.12)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginBottom: 'var(--space-4)',
                                        boxShadow: '0 4px 15px rgba(20, 184, 166, 0.15)'
                                    }}>
                                        <Upload size={30} color="var(--primary-600)" />
                                    </div>
                                    <p style={{ fontWeight: 700, color: 'var(--gray-800)', fontSize: 'var(--font-base)' }}>
                                        <span style={{ color: 'var(--primary-600)' }}>Clique para enviar</span> ou arraste o arquivo
                                    </p>
                                    <p style={{ marginTop: 'var(--space-1)', fontSize: 'var(--font-xs)', color: 'var(--gray-400)' }}>
                                        Formatos aceitos: PDF, JPG ou PNG (até 10MB)
                                    </p>
                                    <input
                                        id="file-upload"
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            ) : (
                                <div className="glass-card animate-scale-in" style={{
                                    display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                                    padding: 'var(--space-4) var(--space-5)',
                                    background: 'linear-gradient(135deg, rgba(240, 253, 250, 0.95) 0%, rgba(255, 255, 255, 0.95) 100%)',
                                    border: '1.5px solid var(--primary-400)'
                                }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '12px',
                                        background: 'rgba(20, 184, 166, 0.18)', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <FileText size={24} color="var(--primary-700)" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontWeight: 700, fontSize: 'var(--font-sm)', color: 'var(--gray-900)' }} className="truncate">
                                            {file.name}
                                        </p>
                                        <p style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: 2 }}>
                                            {(file.size / 1024).toFixed(0)} KB • Pronto para envio
                                        </p>
                                    </div>
                                    <button 
                                        type="button" 
                                        className="btn btn-ghost btn-icon" 
                                        onClick={() => setFile(null)}
                                        style={{ borderRadius: '50%' }}
                                    >
                                        <X size={18} color="var(--gray-400)" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Quick capture buttons */}
                        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                            <label 
                                className="glass-card" 
                                htmlFor="camera-upload" 
                                style={{
                                    flex: 1, padding: '12px', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', gap: 8, cursor: 'pointer', fontWeight: 600,
                                    fontSize: 'var(--font-sm)', color: 'var(--gray-700)'
                                }}
                            >
                                <Camera size={18} color="var(--primary-600)" />
                                Tirar Foto
                                <input
                                    id="camera-upload"
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                            </label>
                            <label 
                                className="glass-card" 
                                htmlFor="gallery-upload" 
                                style={{
                                    flex: 1, padding: '12px', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', gap: 8, cursor: 'pointer', fontWeight: 600,
                                    fontSize: 'var(--font-sm)', color: 'var(--gray-700)'
                                }}
                            >
                                <FileText size={18} color="var(--secondary-600)" />
                                Galeria
                                <input
                                    id="gallery-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        </div>

                        {/* Location */}
                        <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
                            <label className="form-label" style={{ fontWeight: 700, color: 'var(--gray-800)' }}>
                                📍 Sua Região de Entrega
                            </label>
                            <div style={{ position: 'relative' }}>
                                <MapPin size={18} style={{
                                    position: 'absolute', left: '14px', top: '50%',
                                    transform: 'translateY(-50%)', color: 'var(--gray-400)',
                                }} />
                                <input
                                    className="glass-input"
                                    placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP"
                                    style={{ paddingLeft: '44px', width: '100%' }}
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                />
                            </div>
                            <button 
                                type="button" 
                                className="btn btn-ghost text-sm mt-2"
                                style={{ color: 'var(--primary-700)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                onClick={() => setLocation('São Paulo, SP - Localização Atual')}
                            >
                                <MapPin size={14} />
                                Usar localização atual aproximada
                            </button>
                        </div>

                        {/* Notes */}
                        <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                            <label className="form-label" style={{ fontWeight: 700, color: 'var(--gray-800)' }}>
                                💬 Observações Adicionais (opcional)
                            </label>
                            <textarea
                                className="glass-input"
                                placeholder="Preferências específicas: cápsula vegetal, sabor morango, etc."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>

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

                        {/* Submit button */}
                        <button 
                            type="submit" 
                            className="btn btn-glass-primary btn-lg btn-block" 
                            style={{ borderRadius: 'var(--radius-xl)', padding: '16px', fontWeight: 700, fontSize: '1rem' }}
                            disabled={loading}
                        >
                            <Send size={18} />
                            {loading ? 'Transmitindo receita às farmácias...' : 'Solicitar Orçamento Agora'}
                        </button>
                    </form>

                    <div style={{ marginTop: 'var(--space-6)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--gray-500)', fontSize: 'var(--font-xs)' }}>
                        <ShieldCheck size={16} color="var(--success)" />
                        Receita enviada sob sigilo médico e proteção de dados
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
