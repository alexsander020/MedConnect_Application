import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Pill, ArrowLeft, User, Mail, Lock, Phone, MapPin, Building2, FileText, CheckCircle2 } from 'lucide-react';
import { ehEmailValido, ehSenhaForte } from '../utils/validacoes';

export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const { register } = useAuth();
    
    const [type, setType] = useState(location.state?.type || 'user');
    const [step, setStep] = useState(1);
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleNextStep = (e) => {
        e.preventDefault();
        setError('');
        
        if (!ehEmailValido(email)) {
            setError('Por favor, informe um e-mail válido.');
            return;
        }
        if (!ehSenhaForte(password)) {
            setError('A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, um número e um caractere especial.');
            return;
        }
        if (!name.trim()) {
            setError('Por favor, informe seu nome.');
            return;
        }
        
        setStep(2);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            await register(email, password, type);
            setSuccessMessage('Conta criada com sucesso! Verifique sua caixa de e-mail para confirmar seu cadastro antes de fazer login.');
            setStep(3); // Tela de sucesso
        } catch (err) {
            console.error(err);
            setError(err.message || 'Ocorreu um erro ao criar a conta.');
        } finally {
            setLoading(false);
        }
    };

    if (step === 3) {
        return (
            <div className="app-container" style={{ background: 'white' }}>
                <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                    <CheckCircle2 size={64} color="var(--success)" style={{ marginBottom: 'var(--space-4)' }} />
                    <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, textAlign: 'center', marginBottom: 'var(--space-2)' }}>Cadastro Realizado!</h2>
                    <p style={{ textAlign: 'center', color: 'var(--gray-600)', marginBottom: 'var(--space-6)' }}>
                        {successMessage}
                    </p>
                    <button className="btn btn-primary btn-block" onClick={() => navigate('/login')}>
                        Ir para o Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container" style={{ background: 'white' }}>
            <div className="page" style={{ paddingBottom: 'var(--space-6)' }}>
              <div style={{ maxWidth: '400px', margin: '0 auto' }}>
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

                {error && (
                    <div className="form-error" style={{ marginBottom: 'var(--space-4)', textAlign: 'center', padding: 'var(--space-3)', background: 'var(--error-light)', borderRadius: 'var(--radius-md)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={step === 1 ? handleNextStep : handleRegister}>
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
                                    <input 
                                        className="form-input" 
                                        placeholder={type === 'pharmacy' ? 'FarmaMix Manipulação' : 'Seu nome completo'} 
                                        style={{ paddingLeft: '42px' }} 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">E-mail</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    <input 
                                        type="email" 
                                        className="form-input" 
                                        placeholder="seu@email.com" 
                                        style={{ paddingLeft: '42px' }} 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Senha</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    <input 
                                        type="password" 
                                        className="form-input" 
                                        placeholder="••••••••" 
                                        style={{ paddingLeft: '42px' }} 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                                <span className="text-xs text-gray mt-1" style={{ display: 'block' }}>Mínimo 8 caracteres, 1 maiúscula, 1 número, 1 especial.</span>
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

                            <button type="submit" className="btn btn-primary btn-lg btn-block mt-4" disabled={loading}>
                                {loading ? 'Criando...' : 'Criar Conta'}
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
        </div>
    );
}
