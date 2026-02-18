import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Pill, ArrowLeft, User, Mail, Lock, Phone, MapPin, Building2, FileText } from 'lucide-react';

export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [type, setType] = useState(location.state?.type || 'user');
    const [step, setStep] = useState(1);

    const handleRegister = (e) => {
        e.preventDefault();
        if (step === 1) {
            setStep(2);
            return;
        }
        login(type);
        if (type === 'user') {
            navigate('/dashboard', { replace: true });
        } else {
            navigate('/pharmacy', { replace: true });
        }
    };

    return (
        <div className="app-container" style={{ background: 'white' }}>
            <div className="page" style={{ paddingBottom: 'var(--space-6)' }}>
                {/* Back */}
                <button className="btn btn-ghost btn-icon" onClick={() => step === 1 ? navigate(-1) : setStep(1)}>
                    <ArrowLeft size={20} />
                </button>

                {/* Header */}
                <div className="animate-scale-in" style={{ textAlign: 'center', margin: 'var(--space-4) 0 var(--space-6)' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: 'var(--radius-xl)',
                        background: 'var(--gradient-primary)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto', boxShadow: 'var(--shadow-glow)',
                    }}>
                        <Pill size={28} color="white" />
                    </div>
                    <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, marginTop: 'var(--space-3)' }}>
                        Criar Conta
                    </h1>
                    <p className="text-sm text-gray">Passo {step} de 2</p>
                </div>

                {/* Progress */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
                    <div style={{
                        flex: 1, height: '4px', borderRadius: '2px',
                        background: 'var(--gradient-primary)',
                    }} />
                    <div style={{
                        flex: 1, height: '4px', borderRadius: '2px',
                        background: step >= 2 ? 'var(--gradient-primary)' : 'var(--gray-200)',
                        transition: 'background 0.3s',
                    }} />
                </div>

                {/* Type toggle (only step 1) */}
                {step === 1 && (
                    <div className="toggle-group" style={{ marginBottom: 'var(--space-5)' }}>
                        <div className={`toggle-option ${type === 'user' ? 'active' : ''}`} onClick={() => setType('user')}>
                            🧑 Paciente
                        </div>
                        <div className={`toggle-option ${type === 'pharmacy' ? 'active' : ''}`} onClick={() => setType('pharmacy')}>
                            🏥 Farmácia
                        </div>
                    </div>
                )}

                <form onSubmit={handleRegister}>
                    {step === 1 ? (
                        <div className="animate-slide-up stagger">
                            <div className="form-group">
                                <label className="form-label">{type === 'pharmacy' ? 'Nome da Farmácia' : 'Nome Completo'}</label>
                                <div style={{ position: 'relative' }}>
                                    {type === 'pharmacy' ? (
                                        <Building2 size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    ) : (
                                        <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    )}
                                    <input className="form-input" placeholder={type === 'pharmacy' ? 'FarmaMix Manipulação' : 'Seu nome completo'} style={{ paddingLeft: '42px' }} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">E-mail</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    <input type="email" className="form-input" placeholder="seu@email.com" style={{ paddingLeft: '42px' }} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Senha</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    <input type="password" className="form-input" placeholder="••••••••" style={{ paddingLeft: '42px' }} />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg btn-block mt-4">
                                Continuar
                            </button>
                        </div>
                    ) : (
                        <div className="animate-slide-up stagger">
                            <div className="form-group">
                                <label className="form-label">Telefone</label>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    <input className="form-input" placeholder="(11) 99999-9999" style={{ paddingLeft: '42px' }} />
                                </div>
                            </div>

                            {type === 'pharmacy' && (
                                <div className="form-group">
                                    <label className="form-label">CNPJ</label>
                                    <div style={{ position: 'relative' }}>
                                        <FileText size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                        <input className="form-input" placeholder="00.000.000/0001-00" style={{ paddingLeft: '42px' }} />
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Endereço</label>
                                <div style={{ position: 'relative' }}>
                                    <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    <input className="form-input" placeholder="Rua, número - Bairro, Cidade" style={{ paddingLeft: '42px' }} />
                                </div>
                            </div>

                            {type === 'pharmacy' && (
                                <div className="form-group">
                                    <label className="form-label">Raio de Atendimento</label>
                                    <select className="form-input form-select">
                                        <option value="">Selecione</option>
                                        <option value="5">5 km</option>
                                        <option value="10">10 km</option>
                                        <option value="15">15 km</option>
                                        <option value="20">20 km</option>
                                        <option value="30">30 km</option>
                                    </select>
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary btn-lg btn-block mt-4">
                                Criar Conta
                            </button>
                        </div>
                    )}
                </form>

                <p style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
                    <span className="text-sm text-gray">Já tem conta? </span>
                    <button onClick={() => navigate('/login')} className="text-sm text-primary font-semibold" style={{ background: 'none', border: 'none' }}>
                        Entrar
                    </button>
                </p>
            </div>
        </div>
    );
}
