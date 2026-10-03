import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Pill, Mail, Lock, Eye, EyeOff, ArrowLeft, Building2, User, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [type, setType] = useState(location.state?.type || 'user');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { user } = await login(email, password, type);
            if (user.role === 'PHARMACY') {
                navigate('/pharmacy', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.message || 'Falha ao fazer login. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
            {/* Aurora Background Blobs */}
            <div className="aurora-blob aurora-blob-1" />
            <div className="aurora-blob aurora-blob-2" />
            <div className="aurora-blob aurora-blob-3" />

            <div style={{ width: '100%', maxWidth: '1050px', position: 'relative', zIndex: 1 }}>
                {/* Back to Home Button */}
                <button 
                    className="btn btn-ghost" 
                    onClick={() => navigate('/')} 
                    style={{ marginBottom: 'var(--space-4)', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--gray-700)' }}
                >
                    <ArrowLeft size={18} />
                    Voltar ao Início
                </button>

                <div className="glass-panel" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    borderRadius: 'var(--radius-2xl)',
                    overflow: 'hidden',
                    boxShadow: '0 20px 50px -10px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.7) inset'
                }}>
                    {/* Left Column: Visual branding and benefits */}
                    <div style={{
                        background: 'linear-gradient(145deg, rgba(13, 148, 136, 0.95) 0%, rgba(15, 118, 110, 0.92) 50%, rgba(15, 23, 42, 0.95) 100%)',
                        color: 'white',
                        padding: 'var(--space-10) var(--space-8)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Background glow circle */}
                        <div style={{
                            position: 'absolute', top: '-10%', right: '-10%',
                            width: '300px', height: '300px', borderRadius: '50%',
                            background: 'rgba(94, 234, 212, 0.25)', filter: 'blur(50px)'
                        }} />

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
                                <div style={{
                                    width: '46px', height: '46px', borderRadius: '14px',
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    backdropFilter: 'blur(10px)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                                }}>
                                    <Pill size={26} color="white" />
                                </div>
                                <span style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, letterSpacing: '-0.02em' }}>
                                    Med<span style={{ color: '#5eead4' }}>Connect</span>
                                </span>
                            </div>

                            <span className="glass-badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#ccfbf1', marginBottom: 'var(--space-4)' }}>
                                <Sparkles size={13} />
                                Acesso Seguro & Criptografado
                            </span>

                            <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.3rem)', fontWeight: 800, lineHeight: 1.2, marginBottom: 'var(--space-4)', color: 'white' }}>
                                {type === 'user' ? 'Gerencie suas cotações e economize na saúde.' : 'Receba receitas e expanda sua farmácia de manipulação.'}
                            </h2>

                            <p style={{ color: 'rgba(204, 251, 241, 0.9)', fontSize: 'var(--font-base)', lineHeight: 1.6, maxWidth: '400px' }}>
                                {type === 'user' 
                                    ? 'Acompanhe suas receitas enviadas, compare ofertas e receba seus remédios com comodidade e transparência.'
                                    : 'Acesse centenas de receitas médicas na sua região, envie orçamentos e gerencie a linha de produção em tempo real.'}
                            </p>
                        </div>

                        {/* Feature pills */}
                        <div style={{ marginTop: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--font-sm)', color: 'rgba(255, 255, 255, 0.9)' }}>
                                <CheckCircle2 size={18} color="#5eead4" />
                                <span>Ambiente protegido por JWT e LGPD</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--font-sm)', color: 'rgba(255, 255, 255, 0.9)' }}>
                                <CheckCircle2 size={18} color="#5eead4" />
                                <span>Notificações em tempo real com WebSocket</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Form */}
                    <div style={{ padding: 'var(--space-8) var(--space-8)', background: 'rgba(255, 255, 255, 0.85)' }}>
                        <div style={{ maxWidth: '380px', margin: '0 auto' }}>
                            <div style={{ marginBottom: 'var(--space-6)' }}>
                                <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--gray-900)' }}>
                                    Entrar na Conta
                                </h1>
                                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)', marginTop: 4 }}>
                                    Selecione seu perfil e informe seus dados
                                </p>
                            </div>

                            {/* Profile Type Toggle */}
                            <div className="glass-tab-container" style={{ marginBottom: 'var(--space-6)' }}>
                                <div
                                    className={`glass-tab ${type === 'user' ? 'active' : ''}`}
                                    onClick={() => setType('user')}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                >
                                    <User size={16} />
                                    Paciente
                                </div>
                                <div
                                    className={`glass-tab ${type === 'pharmacy' ? 'active' : ''}`}
                                    onClick={() => setType('pharmacy')}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                >
                                    <Building2 size={16} />
                                    Farmácia
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleLogin}>
                                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                                    <label className="form-label" style={{ fontWeight: 600, color: 'var(--gray-700)' }}>E-mail</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={18} style={{
                                            position: 'absolute', left: '14px', top: '50%',
                                            transform: 'translateY(-50%)', color: 'var(--gray-400)',
                                        }} />
                                        <input
                                            type="email"
                                            className="glass-input"
                                            placeholder="seu@email.com"
                                            style={{ paddingLeft: '44px', width: '100%' }}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                                    <label className="form-label" style={{ fontWeight: 600, color: 'var(--gray-700)' }}>Senha</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={18} style={{
                                            position: 'absolute', left: '14px', top: '50%',
                                            transform: 'translateY(-50%)', color: 'var(--gray-400)',
                                        }} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className="glass-input"
                                            placeholder="••••••••"
                                            style={{ paddingLeft: '44px', paddingRight: '44px', width: '100%' }}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute', right: '14px', top: '50%',
                                                transform: 'translateY(-50%)', background: 'none',
                                                border: 'none', color: 'var(--gray-400)', cursor: 'pointer',
                                            }}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
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

                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-5)' }}>
                                    <button type="button" style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontSize: 'var(--font-sm)', fontWeight: 600, cursor: 'pointer' }}>
                                        Esqueceu a senha?
                                    </button>
                                </div>

                                <button 
                                    type="submit" 
                                    className="btn btn-glass-primary btn-lg btn-block" 
                                    style={{ borderRadius: 'var(--radius-xl)', fontWeight: 700 }}
                                    disabled={loading}
                                >
                                    {loading ? 'Entrando...' : 'Entrar na Plataforma'}
                                </button>
                            </form>

                            {/* Sign up prompt */}
                            <div style={{ marginTop: 'var(--space-6)', textAlign: 'center', paddingTop: 'var(--space-4)', borderTop: '1px solid rgba(226, 232, 240, 0.8)' }}>
                                <span style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-600)' }}>
                                    Ainda não possui conta?{' '}
                                </span>
                                <button
                                    onClick={() => navigate('/register', { state: { type } })}
                                    style={{ background: 'none', border: 'none', color: 'var(--primary-700)', fontWeight: 700, cursor: 'pointer', fontSize: 'var(--font-sm)' }}
                                >
                                    Criar conta grátis
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
