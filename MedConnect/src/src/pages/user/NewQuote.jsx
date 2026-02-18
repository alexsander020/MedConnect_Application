import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import { Upload, Camera, FileText, MapPin, Send, Check, X } from 'lucide-react';

export default function NewQuote() {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (f) setFile(f);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
        setTimeout(() => navigate('/orders'), 2000);
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
                    <p className="text-sm text-gray" style={{ maxWidth: '260px' }}>
                        Sua receita foi enviada para as farmácias da região. Você receberá propostas em breve.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <Header title="Nova Cotação" showBack />

            <div className="page">
                {/* Step indicator */}
                <div className="animate-slide-down" style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    marginBottom: 'var(--space-6)', padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--primary-50)', borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--primary-100)',
                }}>
                    <Send size={16} color="var(--primary-600)" />
                    <p className="text-sm" style={{ color: 'var(--primary-700)' }}>
                        Envie sua receita e receba cotações de farmácias próximas
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Upload area */}
                    <div className="form-group">
                        <label className="form-label">📋 Receita Médica</label>
                        {!file ? (
                            <label className="upload-area animate-slide-up" htmlFor="file-upload">
                                <Upload size={48} />
                                <p>
                                    <span className="upload-text-highlight">Clique para enviar</span> ou arraste o arquivo
                                </p>
                                <p style={{ marginTop: 'var(--space-1)', fontSize: 'var(--font-xs)' }}>
                                    PDF, JPG ou PNG (máx. 10MB)
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
                            <div className="card animate-scale-in" style={{
                                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                                background: 'var(--primary-50)', border: '2px solid var(--primary-200)',
                            }}>
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: 'var(--radius-lg)',
                                    background: 'var(--primary-100)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <FileText size={22} color="var(--primary-600)" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p className="text-sm font-semibold truncate">{file.name}</p>
                                    <p className="text-xs text-gray">{(file.size / 1024).toFixed(0)} KB</p>
                                </div>
                                <button type="button" className="btn btn-ghost btn-icon" onClick={() => setFile(null)}>
                                    <X size={18} color="var(--gray-400)" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Quick capture buttons */}
                    <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                        <label className="btn btn-outline btn-sm" htmlFor="camera-upload" style={{ flex: 1, cursor: 'pointer' }}>
                            <Camera size={16} />
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
                        <label className="btn btn-outline btn-sm" htmlFor="gallery-upload" style={{ flex: 1, cursor: 'pointer' }}>
                            <FileText size={16} />
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
                    <div className="form-group">
                        <label className="form-label">📍 Sua Localização</label>
                        <div style={{ position: 'relative' }}>
                            <MapPin size={18} style={{
                                position: 'absolute', left: '14px', top: '50%',
                                transform: 'translateY(-50%)', color: 'var(--gray-400)',
                            }} />
                            <input
                                className="form-input"
                                placeholder="Buscar endereço..."
                                style={{ paddingLeft: '42px' }}
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                            />
                        </div>
                        <button type="button" className="btn btn-ghost text-sm mt-2"
                            style={{ color: 'var(--primary-600)' }}
                            onClick={() => setLocation('São Paulo, SP - GPS')}>
                            <MapPin size={14} />
                            Usar localização atual
                        </button>
                    </div>

                    {/* Notes */}
                    <div className="form-group">
                        <label className="form-label">💬 Observações (opcional)</label>
                        <textarea
                            className="form-input form-textarea"
                            placeholder="Informações adicionais sobre os medicamentos..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Submit */}
                    <button type="submit" className="btn btn-primary btn-lg btn-block mt-4">
                        <Send size={18} />
                        Solicitar Cotação
                    </button>
                </form>
            </div>

            <BottomNav />
        </div>
    );
}
