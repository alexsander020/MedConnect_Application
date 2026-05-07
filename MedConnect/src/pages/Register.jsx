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
            <div style={{ display: 'flex', minHeight: '100vh', background: 'white' }}>
                <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '500px', padding: 'var(--space-8)' }}>
                    <CheckCircle2 size={80} color="var(--success)" style={{ margin: '0 auto var(--space-6)' }} />
                    <h2 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>Cadastro Realizado!</h2>
                    <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-8)', fontSize: 'var(--font-lg)', lineHeight: 1.6 }}>
                        {successMessage}
                    </p>
                    <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/login')}>
                        Ir para o Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'white' }}>
            {/* Left Side - Visual/Branding (hidden on small screens, flex on large) */}
            <div style={{
                flex: 1,
                background: 'var(--gradient-hero)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                padding: 'var(--space-8)'
            }}>
                {/* Decorative Elements */}
                <div style={{
                    position: 'absolute', top: '10%', left: '-10%',
                    width: '400px', height: '400px', borderRadius: '50%',
                    background: 'rgba(13,148,136,0.2)', filter: 'blur(60px)',
                }} />
                
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '500px' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: 'var(--radius-xl)',
                        background: 'rgba(255,255,255,0.1)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto var(--space-6)', backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <Pill size={40} color="white" />
                    </div>
                    <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: 'var(--space-4)', lineHeight: 1.2 }}>
                        Junte-se ao <br/><span style={{ color: 'var(--primary-300)' }}>MedConnect</span>
                    </h2>
                    <p style={{ fontSize: 'var(--font-lg)', color: 'var(--gray-300)', lineHeight: 1.6 }}>
                        A plataforma inovadora para facilitar a conexão entre pacientes e farmácias de manipulação em todo o Brasil.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: 'var(--space-8)',
                maxWidth: '600px',
                margin: '0 auto'
            }}>
                <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
                    {/* Back button */}
                    <button className="btn btn-ghost" onClick={() => step === 1 ? navigate(-1) : setStep(1)} style={{ marginBottom: 'var(--space-8)', paddingLeft: 0 }}>
                        <ArrowLeft size={20} />
                        Voltar
                    </button>

                    <div className="animate-scale-in" style={{ marginBottom: 'var(--space-6)' }}>
                        <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800 }}>
                            Criar Conta
                        </h1>
                        <p className="text-gray" style={{ marginTop: 'var(--space-2)' }}>
                            Passo {step} de 2
                        </p>
                    </div>

                    {/* Progress */}
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-8)' }}>
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
                        <div className="toggle-group animate-slide-up" style={{ marginBottom: 'var(--space-6)' }}>
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
                                    Continuar para o próximo passo
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
                                    {loading ? 'Criando...' : 'Finalizar Cadastro'}
                                </button>
                            </div>
                        )}
                    </form>

                    <p style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
                        <span className="text-gray" style={{ color: 'var(--gray-500)' }}>Já tem conta? </span>
                        <button onClick={() => navigate('/login')} className="font-semibold" style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontSize: '1rem' }}>
                            Entrar na Plataforma
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
