import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Pill, ArrowLeft, User, Mail, Lock, Phone, MapPin,
    Building2, FileText, CheckCircle2, Eye, EyeOff,
    Shield, Star, Clock, Truck, BadgeCheck
} from 'lucide-react';
import { ehEmailValido, ehSenhaForte } from '../utils/validacoes';

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
    const colors = ['var(--gray-200)', 'var(--error)', 'var(--warning)', '#3b82f6', 'var(--success)'];
    const labels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];

    if (!password) return null;
    return (
        <div style={{ marginTop: 'var(--space-2)' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: score >= i ? colors[score] : 'var(--gray-200)',
                        transition: 'background 0.3s',
                    }} />
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                {checks.map(c => (
                    <span key={c.label} style={{
                        fontSize: 11, color: c.ok ? 'var(--success)' : 'var(--gray-400)',
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
    { icon: <Clock size={18} />, text: 'Gerencie pedidos em tempo real' },
    { icon: <Truck size={18} />, text: 'Configure seu raio de entrega' },
    { icon: <BadgeCheck size={18} />, text: 'Construa sua reputação com avaliações' },
];

const userBenefits = [
    { icon: <Star size={18} />, text: 'Compare preços de múltiplas farmácias' },
    { icon: <Clock size={18} />, text: 'Receba cotações em minutos' },
    { icon: <Shield size={18} />, text: 'Seus dados médicos protegidos' },
    { icon: <BadgeCheck size={18} />, text: 'Farmácias certificadas e confiáveis' },
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
    const [deliveryArea, setDeliveryArea] = useState('');
    const [specialties, setSpecialties] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const specialtyOptions = [
        'Dermato', 'Hormonal', 'Pediátrica', 'Oncológica',
        'Veterinária', 'Nutrição', 'Neurológica', 'Geriátrica',
    ];

    const toggleSpecialty = (s) => {
        setSpecialties(prev =>
            prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
        );
    };

    const handleNextStep = (e) => {
        e.preventDefault();
        setError('');
        if (!name.trim()) { setError('Informe o nome.'); return; }
        if (!ehEmailValido(email)) { setError('E-mail inválido.'); return; }
        if (!ehSenhaForte(password)) {
            setError('Senha deve ter 8+ caracteres, maiúscula, número e especial.');
            return;
        }
        setStep(2);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (type === 'pharmacy') {
            if (!cnpj || cnpj.replace(/\D/g, '').length < 14) {
                setError('CNPJ inválido. Informe os 14 dígitos.');
                return;
            }
            if (!deliveryArea) {
                setError('Selecione o raio de atendimento.');
                return;
            }
        }

        if (!phone) { setError('Informe o telefone.'); return; }
        if (!address.trim()) { setError('Informe o endereço.'); return; }

        setLoading(true);
        try {
            const userData = {
                name, email, password, phone, address,
                ...(type === 'pharmacy' && { cnpj: cnpj.replace(/\D/g, ''), deliveryArea }),
            };
            await register(userData, type);
            setStep(3);
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Erro ao criar conta.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const isPharmacy = type === 'pharmacy';
    const benefits = isPharmacy ? pharmacyBenefits : userBenefits;

    // ── Tela de Sucesso ──
    if (step === 3) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh', background: 'white', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)' }}>
                <div style={{ textAlign: 'center', maxWidth: 480 }} className="animate-scale-in">
                    <div style={{
                        width: 100, height: 100, borderRadius: '50%',
                        background: 'var(--success-light)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto var(--space-6)',
                    }}>
                        <CheckCircle2 size={56} color="var(--success)" />
                    </div>
                    <h2 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
                        {isPharmacy ? 'Farmácia Cadastrada!' : 'Conta Criada!'}
                    </h2>
                    <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-8)', fontSize: 'var(--font-lg)', lineHeight: 1.7 }}>
                        {isPharmacy
                            ? 'Sua farmácia foi cadastrada com sucesso no MedConnect. Faça login para começar a receber cotações!'
                            : 'Sua conta foi criada com sucesso. Faça login para buscar farmácias e enviar suas receitas!'}
                    </p>
                    <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/login', { state: { type } })}>
                        Ir para o Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'white' }}>

            {/* ── Painel Esquerdo ── */}
            <div style={{
                flex: 1, background: 'var(--gradient-hero)',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center',
                color: 'white', position: 'relative',
                overflow: 'hidden', padding: 'var(--space-8)',
            }}>
                {/* Blobs decorativos */}
                <div style={{ position: 'absolute', top: '5%', left: '-15%', width: 380, height: 380, borderRadius: '50%', background: 'rgba(13,148,136,0.15)', filter: 'blur(70px)' }} />
                <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: 280, height: 280, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', filter: 'blur(60px)' }} />

                <div style={{ position: 'relative', zIndex: 1, maxWidth: 420 }}>
                    {/* Logo */}
                    <div style={{
                        width: 72, height: 72, borderRadius: 'var(--radius-xl)',
                        background: 'rgba(255,255,255,0.1)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        marginBottom: 'var(--space-6)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                    }}>
                        <Pill size={36} color="white" />
                    </div>

                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2, marginBottom: 'var(--space-3)' }}>
                        {isPharmacy ? 'Sua farmácia no' : 'Junte-se ao'}{' '}
                        <br /><span style={{ color: 'var(--primary-300)' }}>MedConnect</span>
                    </h2>
                    <p style={{ fontSize: 'var(--font-base)', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 'var(--space-8)' }}>
                        {isPharmacy
                            ? 'Cadastre sua farmácia de manipulação e conecte-se com pacientes que precisam dos seus serviços.'
                            : 'A plataforma que conecta você às melhores farmácias de manipulação do Brasil.'}
                    </p>

                    {/* Benefícios */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        {benefits.map((b, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 'var(--radius-lg)',
                                    background: 'rgba(255,255,255,0.1)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                    {b.icon}
                                </div>
                                <span style={{ fontSize: 'var(--font-sm)', color: 'rgba(255,255,255,0.85)' }}>{b.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Painel Direito (Formulário) ── */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                justifyContent: 'center', padding: 'var(--space-8)',
                overflowY: 'auto',
            }}>
                <div style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>

                    {/* Voltar */}
                    <button
                        className="btn btn-ghost"
                        onClick={() => step === 1 ? navigate(-1) : setStep(1)}
                        style={{ marginBottom: 'var(--space-6)', paddingLeft: 0 }}
                    >
                        <ArrowLeft size={18} /> Voltar
                    </button>

                    {/* Título */}
                    <div className="animate-scale-in" style={{ marginBottom: 'var(--space-5)' }}>
                        <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>
                            {step === 1 ? 'Criar Conta' : isPharmacy ? 'Dados da Farmácia' : 'Dados Pessoais'}
                        </h1>
                        <p className="text-gray" style={{ marginTop: 'var(--space-1)', fontSize: 'var(--font-sm)' }}>
                            Passo {step} de 2
                        </p>
                    </div>

                    {/* Barra de progresso */}
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
                        {[1, 2].map(i => (
                            <div key={i} style={{
                                flex: 1, height: 4, borderRadius: 2,
                                background: step >= i ? 'var(--gradient-primary)' : 'var(--gray-200)',
                                transition: 'background 0.4s',
                            }} />
                        ))}
                    </div>

                    {/* Toggle tipo (só no passo 1) */}
                    {step === 1 && (
                        <div className="toggle-group animate-slide-up" style={{ marginBottom: 'var(--space-5)' }}>
                            <div
                                className={`toggle-option ${type === 'user' ? 'active' : ''}`}
                                onClick={() => setType('user')}
                            >
                                🧑 Paciente
                            </div>
                            <div
                                className={`toggle-option ${type === 'pharmacy' ? 'active' : ''}`}
                                onClick={() => setType('pharmacy')}
                            >
                                🏥 Farmácia
                            </div>
                        </div>
                    )}

                    {/* Erro */}
                    {error && (
                        <div style={{
                            marginBottom: 'var(--space-4)', padding: 'var(--space-3)',
                            background: 'var(--error-light)', borderRadius: 'var(--radius-md)',
                            color: 'var(--error)', fontSize: 'var(--font-sm)', fontWeight: 500,
                            borderLeft: '4px solid var(--error)',
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* ──── PASSO 1 ──── */}
                    {step === 1 && (
                        <form onSubmit={handleNextStep} className="animate-slide-up stagger">
                            {/* Nome */}
                            <div className="form-group">
                                <label className="form-label">
                                    {isPharmacy ? 'Nome da Farmácia' : 'Nome Completo'}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    {isPharmacy
                                        ? <Building2 size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                        : <User size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />}
                                    <input
                                        className="form-input"
                                        placeholder={isPharmacy ? 'FarmaMix Manipulação Ltda.' : 'João da Silva'}
                                        style={{ paddingLeft: 42 }}
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* E-mail */}
                            <div className="form-group">
                                <label className="form-label">E-mail {isPharmacy && <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(será seu login)</span>}</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder={isPharmacy ? 'contato@suafarmacia.com.br' : 'seu@email.com'}
                                        style={{ paddingLeft: 42 }}
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Senha */}
                            <div className="form-group">
                                <label className="form-label">Senha</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-input"
                                        placeholder="••••••••"
                                        style={{ paddingLeft: 42, paddingRight: 42 }}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}
                                    >
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                                <PasswordStrength password={password} />
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg btn-block" style={{ marginTop: 'var(--space-4)' }}>
                                Continuar →
                            </button>
                        </form>
                    )}

                    {/* ──── PASSO 2 ──── */}
                    {step === 2 && (
                        <form onSubmit={handleRegister} className="animate-slide-up stagger">

                            {/* Telefone */}
                            <div className="form-group">
                                <label className="form-label">Telefone / WhatsApp</label>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    <input
                                        className="form-input"
                                        placeholder="(11) 99999-9999"
                                        style={{ paddingLeft: 42 }}
                                        value={phone}
                                        onChange={e => setPhone(maskPhone(e.target.value))}
                                    />
                                </div>
                            </div>

                            {/* CNPJ — só para farmácia */}
                            {isPharmacy && (
                                <div className="form-group">
                                    <label className="form-label">CNPJ</label>
                                    <div style={{ position: 'relative' }}>
                                        <FileText size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                        <input
                                            className="form-input"
                                            placeholder="00.000.000/0001-00"
                                            style={{ paddingLeft: 42 }}
                                            value={cnpj}
                                            onChange={e => setCnpj(maskCNPJ(e.target.value))}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Endereço */}
                            <div className="form-group">
                                <label className="form-label">{isPharmacy ? 'Endereço da Farmácia' : 'Endereço'}</label>
                                <div style={{ position: 'relative' }}>
                                    <MapPin size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                                    <input
                                        className="form-input"
                                        placeholder="Rua, número - Bairro, Cidade - UF"
                                        style={{ paddingLeft: 42 }}
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Raio de atendimento — só para farmácia */}
                            {isPharmacy && (
                                <div className="form-group">
                                    <label className="form-label">Raio de Atendimento</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-2)' }}>
                                        {['5', '10', '15', '20', '30'].map(km => (
                                            <button
                                                key={km}
                                                type="button"
                                                onClick={() => setDeliveryArea(km)}
                                                style={{
                                                    padding: 'var(--space-3)',
                                                    borderRadius: 'var(--radius-lg)',
                                                    border: `2px solid ${deliveryArea === km ? 'var(--primary-500)' : 'var(--gray-200)'}`,
                                                    background: deliveryArea === km ? 'var(--primary-50)' : 'white',
                                                    color: deliveryArea === km ? 'var(--primary-700)' : 'var(--gray-600)',
                                                    fontWeight: deliveryArea === km ? 700 : 500,
                                                    fontSize: 'var(--font-sm)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                {km}km
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Especialidades — só para farmácia */}
                            {isPharmacy && (
                                <div className="form-group">
                                    <label className="form-label">
                                        Especialidades <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(opcional)</span>
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                        {specialtyOptions.map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => toggleSpecialty(s)}
                                                style={{
                                                    padding: '6px 14px',
                                                    borderRadius: 'var(--radius-full)',
                                                    border: `1.5px solid ${specialties.includes(s) ? 'var(--primary-500)' : 'var(--gray-200)'}`,
                                                    background: specialties.includes(s) ? 'var(--primary-50)' : 'var(--gray-50)',
                                                    color: specialties.includes(s) ? 'var(--primary-700)' : 'var(--gray-500)',
                                                    fontWeight: specialties.includes(s) ? 600 : 400,
                                                    fontSize: 'var(--font-xs)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                {specialties.includes(s) ? '✓ ' : ''}{s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resumo do passo 1 */}
                            <div style={{
                                padding: 'var(--space-4)',
                                background: 'var(--gray-50)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--gray-200)',
                                marginBottom: 'var(--space-5)',
                                fontSize: 'var(--font-sm)',
                            }}>
                                <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--gray-700)' }}>✅ Dados do Passo 1</p>
                                <p style={{ color: 'var(--gray-500)' }}>{name} · {email}</p>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg btn-block"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                                        Criando conta...
                                    </span>
                                ) : (
                                    isPharmacy ? '🏥 Cadastrar Farmácia' : '✓ Finalizar Cadastro'
                                )}
                            </button>
                        </form>
                    )}

                    <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--font-sm)' }}>
                        <span style={{ color: 'var(--gray-500)' }}>Já tem conta? </span>
                        <button
                            onClick={() => navigate('/login', { state: { type } })}
                            style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--font-sm)' }}
                        >
                            Entrar na Plataforma
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
