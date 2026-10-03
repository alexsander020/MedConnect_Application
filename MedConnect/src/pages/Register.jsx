import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Pill, ArrowLeft, User, Mail, Lock, Phone, MapPin,
    Building2, FileText, CheckCircle2, Eye, EyeOff,
    Shield, Star, Clock, Truck, BadgeCheck, Sparkles
} from 'lucide-react';
import { ehEmailValido, ehSenhaForte, ehCNPJValido } from '../utils/validacoes';

// ── Máscara de CNPJ: 00.000.000/0001-00
function maskCNPJ(v) {
    return v.replace(/\D/g, '').slice(0, 14)
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}

// ── Máscara de telefone: (11) 99999-9999
function maskPhone(v) {
    return v.replace(/\D/g, '').slice(0, 11)
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
}

// ── Indicador de força da senha
function PasswordStrength({ password }) {
    const checks = [
        { label: '8+ caracteres', ok: password.length >= 8 },
        { label: 'Letra maiúscula', ok: /[A-Z]/.test(password) },
        { label: 'Número', ok: /\d/.test(password) },
        { label: 'Caractere especial', ok: /[^a-zA-Z0-9]/.test(password) },
    ];
    const score = checks.filter(c => c.ok).length;
    const colors = ['rgba(226, 232, 240, 0.8)', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
    const labels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];

    if (!password) return null;
    return (
        <div style={{ marginTop: 'var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 500 }}>Segurança da senha</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors[score] }}>{labels[score]}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: score >= i ? colors[score] : 'rgba(226, 232, 240, 0.7)',
                        transition: 'background 0.3s ease',
                    }} />
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                {checks.map(c => (
                    <span key={c.label} style={{
                        fontSize: 11, color: c.ok ? '#059669' : 'var(--gray-400)',
                        fontWeight: c.ok ? 600 : 400,
                        display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                        {c.ok ? '✓' : '○'} {c.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ── Benefícios da farmácia (painel lateral)
const pharmacyBenefits = [
    { icon: <Star size={18} />, text: 'Receba cotações de pacientes na sua região' },
    { icon: <Clock size={18} />, text: 'Gerencie pedidos e status em tempo real' },
    { icon: <Truck size={18} />, text: 'Configure seu raio de entrega personalizado' },
    { icon: <BadgeCheck size={18} />, text: 'Construa sua reputação com avaliações 5 estrelas' },
];

const userBenefits = [
    { icon: <Star size={18} />, text: 'Compare preços de múltiplas farmácias parceiras' },
    { icon: <Clock size={18} />, text: 'Receba propostas detalhadas em poucos minutos' },
    { icon: <Shield size={18} />, text: 'Receitas e dados de saúde 100% protegidos' },
    { icon: <BadgeCheck size={18} />, text: 'Farmácias certificadas pela ANVISA e CRF' },
];

export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const { register } = useAuth();

    const [type, setType] = useState(location.state?.type || 'user');
    const [step, setStep] = useState(1);

    // Campos comuns
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');

    // Campos exclusivos de farmácia
    const [cnpj, setCnpj] = useState('');
    const [deliveryArea, setDeliveryArea] = useState('10');
    const [specialties, setSpecialties] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const specialtyOptions = [
        'Dermatologia', 'Hormonal', 'Pediatria', 'Oncologia',
        'Veterinária', 'Nutracêuticos', 'Neurologia', 'Geriátrica',
    ];

    const toggleSpecialty = (s) => {
        setSpecialties(prev =>
            prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
        );
    };

    const handleNextStep = (e) => {
        e.preventDefault();
        setError('');
        if (!name.trim()) { setError('Informe seu nome ou razão social.'); return; }
        if (!ehEmailValido(email)) { setError('Informe um e-mail válido.'); return; }
        if (!ehSenhaForte(password)) {
            setError('A senha deve ter 8+ caracteres, com ao menos uma maiúscula, número e caractere especial.');
            return;
        }
        setStep(2);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (type === 'pharmacy') {
            if (!ehCNPJValido(cnpj)) {
                setError('CNPJ inválido. Verifique os números digitados.');
                return;
            }
            if (!deliveryArea) {
                setError('Selecione o raio de atendimento.');
                return;
            }
        }

        if (!phone) { setError('Informe o número de telefone ou WhatsApp.'); return; }
        if (!address.trim()) { setError('Informe o endereço completo.'); return; }

        setLoading(true);
        try {
            const userData = {
                name, email, password, phone, address,
                ...(type === 'pharmacy' && { cnpj: cnpj.replace(/\D/g, ''), deliveryArea }),
            };
            await register(userData, type);
            setStep(3);
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Erro ao criar conta. Tente novamente.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const isPharmacy = type === 'pharmacy';
    const benefits = isPharmacy ? pharmacyBenefits : userBenefits;

    // ── Tela de Sucesso (Passo 3) ──
    if (step === 3) {
        return (
            <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
                <div className="aurora-blob aurora-blob-1" />
                <div className="aurora-blob aurora-blob-2" />
                <div className="aurora-blob aurora-blob-3" />

                <div className="glass-panel animate-scale-in" style={{
                    maxWidth: 520, width: '100%', padding: 'var(--space-10) var(--space-8)',
                    textAlign: 'center', position: 'relative', zIndex: 1, borderRadius: 'var(--radius-2xl)'
                }}>
                    <div style={{
                        width: 90, height: 90, borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(13, 148, 136, 0.2))',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto var(--space-6)',
                        boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)'
                    }}>
                        <CheckCircle2 size={50} color="#10b981" />
                    </div>

                    <h2 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, color: 'var(--gray-900)', marginBottom: 'var(--space-3)' }}>
                        {isPharmacy ? 'Farmácia Cadastrada!' : 'Conta Criada com Sucesso!'}
                    </h2>

                    <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-8)', fontSize: 'var(--font-base)', lineHeight: 1.7 }}>
                        {isPharmacy
                            ? 'Sua farmácia foi registrada no MedConnect. Agora você já pode acessar o painel e receber cotações de pacientes!'
                            : 'Bem-vindo(a) ao MedConnect! Faça login para começar a comparar orçamentos e economizar nas suas fórmulas manipuladas.'}
                    </p>

                    <button
                        className="btn btn-primary btn-glass-primary btn-shimmer btn-lg btn-block"
                        onClick={() => navigate('/login', { state: { type } })}
                    >
                        Acessar Conta Agora →
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="aurora-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
            {/* Aurora Background Blobs */}
            <div className="aurora-blob aurora-blob-1" />
            <div className="aurora-blob aurora-blob-2" />
            <div className="aurora-blob aurora-blob-3" />

            <div style={{ width: '100%', maxWidth: '1080px', position: 'relative', zIndex: 1 }}>
                {/* Back button */}
                <button
                    className="btn btn-ghost"
                    onClick={() => step === 1 ? navigate('/') : setStep(1)}
                    style={{ marginBottom: 'var(--space-4)', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--gray-700)' }}
                >
                    <ArrowLeft size={18} />
                    {step === 1 ? 'Voltar ao Início' : 'Voltar ao Passo 1'}
                </button>

                <div className="glass-panel" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
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
                        {/* Glow circles */}
                        <div style={{
                            position: 'absolute', top: '-10%', right: '-10%',
                            width: '320px', height: '320px', borderRadius: '50%',
                            background: 'rgba(94, 234, 212, 0.25)', filter: 'blur(55px)'
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
                                Cadastro Rápido & Sem Taxas
                            </span>

                            <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.2rem)', fontWeight: 800, lineHeight: 1.2, marginBottom: 'var(--space-4)', color: 'white' }}>
                                {isPharmacy ? 'Expanda a sua farmácia de manipulação.' : 'A melhor forma de economizar em manipulação.'}
                            </h2>

                            <p style={{ color: 'rgba(204, 251, 241, 0.9)', fontSize: 'var(--font-base)', lineHeight: 1.6, maxWidth: '400px' }}>
                                {isPharmacy
                                    ? 'Conecte-se diretamente com centenas de pacientes que enviam receitas diárias e acelere seu faturamento.'
                                    : 'Envie sua receita médica, receba propostas detalhadas de farmácias credenciadas e compre pelo melhor preço.'}
                            </p>
                        </div>

                        {/* Benefits list */}
                        <div style={{ marginTop: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', position: 'relative', zIndex: 1 }}>
                            {benefits.map((b, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 'var(--radius-lg)',
                                        background: 'rgba(255, 255, 255, 0.12)',
                                        backdropFilter: 'blur(8px)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#5eead4', flexShrink: 0
                                    }}>
                                        {b.icon}
                                    </div>
                                    <span style={{ fontSize: 'var(--font-sm)', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500 }}>
                                        {b.text}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Register Form */}
                    <div style={{ padding: 'var(--space-8)', background: 'rgba(255, 255, 255, 0.85)', overflowY: 'auto' }}>
                        <div style={{ maxWidth: '420px', margin: '0 auto' }}>

                            {/* Header */}
                            <div style={{ marginBottom: 'var(--space-5)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--gray-900)' }}>
                                        {step === 1 ? 'Criar Conta' : isPharmacy ? 'Dados da Farmácia' : 'Dados de Entrega'}
                                    </h1>
                                    <span className="glass-pill" style={{ fontSize: 12, padding: '4px 10px', background: 'rgba(13, 148, 136, 0.1)', color: 'var(--primary-700)', fontWeight: 700 }}>
                                        Passo {step} de 2
                                    </span>
                                </div>
                                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)', marginTop: 4 }}>
                                    {step === 1 ? 'Preencha suas informações de login' : 'Complete os detalhes para finalizar'}
                                </p>
                            </div>

                            {/* Progress bar */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-6)' }}>
                                <div style={{
                                    flex: 1, height: 5, borderRadius: 4,
                                    background: 'var(--gradient-primary)',
                                    boxShadow: '0 0 10px rgba(13, 148, 136, 0.3)'
                                }} />
                                <div style={{
                                    flex: 1, height: 5, borderRadius: 4,
                                    background: step >= 2 ? 'var(--gradient-primary)' : 'rgba(226, 232, 240, 0.8)',
                                    boxShadow: step >= 2 ? '0 0 10px rgba(13, 148, 136, 0.3)' : 'none',
                                    transition: 'all 0.3s ease'
                                }} />
                            </div>

                            {/* Profile Type Toggle (Step 1 only) */}
                            {step === 1 && (
                                <div className="glass-tab-container" style={{ marginBottom: 'var(--space-6)' }}>
                                    <div
                                        className={`glass-tab ${type === 'user' ? 'active' : ''}`}
                                        onClick={() => setType('user')}
                                    >
                                        <User size={16} />
                                        <span>Sou Paciente</span>
                                    </div>
                                    <div
                                        className={`glass-tab ${type === 'pharmacy' ? 'active' : ''}`}
                                        onClick={() => setType('pharmacy')}
                                    >
                                        <Building2 size={16} />
                                        <span>Sou Farmácia</span>
                                    </div>
                                </div>
                            )}

                            {/* Error alert */}
                            {error && (
                                <div style={{
                                    marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)',
                                    background: 'rgba(254, 242, 242, 0.95)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: 'var(--radius-lg)',
                                    color: '#b91c1c', fontSize: 'var(--font-sm)', fontWeight: 500,
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
                                }}>
                                    <span>⚠️</span> {error}
                                </div>
                            )}

                            {/* ──── PASSO 1 ──── */}
                            {step === 1 && (
                                <form onSubmit={handleNextStep} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                    {/* Nome */}
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
                                            {isPharmacy ? 'Nome Fantasia da Farmácia' : 'Nome Completo'}
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            {isPharmacy
                                                ? <Building2 size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                                : <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />}
                                            <input
                                                className="form-input"
                                                placeholder={isPharmacy ? 'Ex: Farmácia Essencial Manipulação' : 'Ex: Carlos Alberto Silva'}
                                                style={{ paddingLeft: 42, background: 'rgba(255, 255, 255, 0.7)' }}
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* E-mail */}
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
                                            E-mail {isPharmacy && <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(acesso da farmácia)</span>}
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                            <input
                                                type="email"
                                                className="form-input"
                                                placeholder={isPharmacy ? 'contato@farmacia.com.br' : 'seu@email.com'}
                                                style={{ paddingLeft: 42, background: 'rgba(255, 255, 255, 0.7)' }}
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Senha */}
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
                                            Criar Senha de Acesso
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                className="form-input"
                                                placeholder="••••••••"
                                                style={{ paddingLeft: 42, paddingRight: 42, background: 'rgba(255, 255, 255, 0.7)' }}
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        <PasswordStrength password={password} />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-glass-primary btn-shimmer btn-lg btn-block"
                                        style={{ marginTop: 'var(--space-3)' }}
                                    >
                                        Continuar para o Passo 2 →
                                    </button>
                                </form>
                            )}

                            {/* ──── PASSO 2 ──── */}
                            {step === 2 && (
                                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                    {/* Resumo do passo 1 */}
                                    <div style={{
                                        padding: 'var(--space-3) var(--space-4)',
                                        background: 'rgba(240, 253, 250, 0.8)',
                                        borderRadius: 'var(--radius-lg)',
                                        border: '1px solid rgba(13, 148, 136, 0.2)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        fontSize: 'var(--font-xs)'
                                    }}>
                                        <div>
                                            <span style={{ fontWeight: 700, color: 'var(--primary-800)' }}>{name}</span>
                                            <div style={{ color: 'var(--primary-600)' }}>{email}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            style={{ background: 'none', border: 'none', color: 'var(--primary-700)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                            Editar
                                        </button>
                                    </div>

                                    {/* Telefone */}
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
                                            Telefone / WhatsApp
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <Phone size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                            <input
                                                className="form-input"
                                                placeholder="(11) 98765-4321"
                                                style={{ paddingLeft: 42, background: 'rgba(255, 255, 255, 0.7)' }}
                                                value={phone}
                                                onChange={e => setPhone(maskPhone(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    {/* CNPJ — só farmácia */}
                                    {isPharmacy && (
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label" style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
                                                CNPJ da Farmácia
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <FileText size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                                <input
                                                    className="form-input"
                                                    placeholder="00.000.000/0001-00"
                                                    style={{ paddingLeft: 42, background: 'rgba(255, 255, 255, 0.7)' }}
                                                    value={cnpj}
                                                    onChange={e => setCnpj(maskCNPJ(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Endereço */}
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
                                            {isPharmacy ? 'Endereço da Farmácia (Rua, Nº, Bairro, Cidade)' : 'Endereço de Entrega Principal'}
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <MapPin size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                            <input
                                                className="form-input"
                                                placeholder="Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                                                style={{ paddingLeft: 42, background: 'rgba(255, 255, 255, 0.7)' }}
                                                value={address}
                                                onChange={e => setAddress(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Raio de Atendimento — só farmácia */}
                                    {isPharmacy && (
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label" style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
                                                Raio de Atendimento e Entrega
                                            </label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                                                {['5', '10', '15', '20', '30'].map(km => (
                                                    <button
                                                        key={km}
                                                        type="button"
                                                        onClick={() => setDeliveryArea(km)}
                                                        style={{
                                                            padding: '8px 4px',
                                                            borderRadius: 'var(--radius-md)',
                                                            border: `1.5px solid ${deliveryArea === km ? 'var(--primary-500)' : 'rgba(226, 232, 240, 0.8)'}`,
                                                            background: deliveryArea === km ? 'rgba(13, 148, 136, 0.12)' : 'rgba(255, 255, 255, 0.6)',
                                                            color: deliveryArea === km ? 'var(--primary-700)' : 'var(--gray-600)',
                                                            fontWeight: deliveryArea === km ? 700 : 500,
                                                            fontSize: 'var(--font-xs)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                        }}
                                                    >
                                                        {km} km
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Especialidades — só farmácia */}
                                    {isPharmacy && (
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label" style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
                                                Especialidades de Manipulação
                                            </label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {specialtyOptions.map(s => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => toggleSpecialty(s)}
                                                        style={{
                                                            padding: '5px 12px',
                                                            borderRadius: 'var(--radius-full)',
                                                            border: `1.5px solid ${specialties.includes(s) ? 'var(--primary-500)' : 'rgba(226, 232, 240, 0.8)'}`,
                                                            background: specialties.includes(s) ? 'rgba(13, 148, 136, 0.12)' : 'rgba(255, 255, 255, 0.6)',
                                                            color: specialties.includes(s) ? 'var(--primary-700)' : 'var(--gray-600)',
                                                            fontWeight: specialties.includes(s) ? 600 : 500,
                                                            fontSize: 11,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                        }}
                                                    >
                                                        {specialties.includes(s) ? '✓ ' : '+ '}{s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-glass-primary btn-shimmer btn-lg btn-block"
                                        disabled={loading}
                                        style={{ marginTop: 'var(--space-3)' }}
                                    >
                                        {loading ? (
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                                                Finalizando Cadastro...
                                            </span>
                                        ) : (
                                            isPharmacy ? '🏥 Cadastrar Minha Farmácia' : '✓ Finalizar Cadastro'
                                        )}
                                    </button>
                                </form>
                            )}

                            {/* Footer link to login */}
                            <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--font-sm)', color: 'var(--gray-500)' }}>
                                Já possui uma conta?{' '}
                                <button
                                    onClick={() => navigate('/login', { state: { type } })}
                                    style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontWeight: 700, cursor: 'pointer', fontSize: 'var(--font-sm)', textDecoration: 'none' }}
                                >
                                    Fazer Login
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
