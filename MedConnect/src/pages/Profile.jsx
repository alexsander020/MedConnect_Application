import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePublicConfig } from '../hooks/usePublicConfig';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import {
    User, Mail, Phone, MapPin, Shield, Bell, HelpCircle,
    FileText, LogOut, ChevronRight, Building2, Star,
    Download, Trash2, AlertTriangle, CheckCircle, RefreshCw, PawPrint
} from 'lucide-react';
import { api } from '../services/api';

export default function Profile() {
    const navigate = useNavigate();
    const { currentUser, userType, logout } = useAuth();
    const { data: publicConfig } = usePublicConfig();

    const [consentStatus, setConsentStatus] = useState(null);
    const [lgpdLoading, setLgpdLoading] = useState(false);
    const [lgpdMessage, setLgpdMessage] = useState(null);

    const initials = currentUser?.name
        ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)
        : '?';

    const handleLogout = () => {
        logout();
        navigate('/', { replace: true });
    };

    useEffect(() => {
        if (currentUser && userType !== 'admin') {
            api.get('/consent/status')
                .then(res => setConsentStatus(res.data))
                .catch(() => {});
        }
    }, [currentUser, userType]);

    const handleExportData = async () => {
        setLgpdLoading(true);
        setLgpdMessage(null);
        try {
            const res = await api.get('/lgpd/export');
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute('href', dataStr);
            downloadAnchor.setAttribute('download', `meus-dados-medconnect-${currentUser?.id || 'titular'}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            setLgpdMessage({ type: 'success', text: 'Dados exportados com sucesso em arquivo JSON!' });
        } catch (err) {
            setLgpdMessage({ type: 'error', text: err.response?.data?.error?.message || 'Erro ao exportar dados.' });
        } finally {
            setLgpdLoading(false);
        }
    };

    const handleRevokeConsent = async () => {
        if (!window.confirm('Atenção: Revogar o consentimento bloqueará novos envios de receitas e iniciará o fluxo de exclusão/anonimização. Deseja prosseguir?')) {
            return;
        }

        setLgpdLoading(true);
        setLgpdMessage(null);
        try {
            const res = await api.post('/consent/revoke', { reason: 'Revogado pelo titular nas configurações' });
            setLgpdMessage({ type: 'warning', text: res.data.message || 'Consentimento revogado. Novos usos foram bloqueados.' });
            const updated = await api.get('/consent/status');
            setConsentStatus(updated.data);
        } catch (err) {
            setLgpdMessage({ type: 'error', text: err.response?.data?.error?.message || 'Erro ao revogar consentimento.' });
        } finally {
            setLgpdLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm('Aviso Crítico: Deseja solicitar a exclusão e anonimização definitiva da sua conta? Registros regulatórios mínimos exigidos por lei sanitária serão preservados.')) {
            return;
        }

        setLgpdLoading(true);
        setLgpdMessage(null);
        try {
            const res = await api.post('/lgpd/anonymize');
            setLgpdMessage({ type: 'success', text: res.data.mensagem || 'Conta e dados anonimizados com sucesso.' });
            setTimeout(() => {
                logout();
                navigate('/', { replace: true });
            }, 2500);
        } catch (err) {
            setLgpdMessage({ type: 'error', text: err.response?.data?.error?.message || 'Erro ao processar anonimização.' });
            setLgpdLoading(false);
        }
    };

    const menuItems = [
        ...(publicConfig?.vetEnabled && userType === 'patient' ? [{
            icon: <PawPrint size={20} />,
            label: 'Meus Pets',
            color: '#0d9488',
            onClick: () => navigate('/my-pets')
        }] : []),
        { icon: <User size={20} />, label: 'Editar Perfil', color: 'var(--primary-500)' },
        { icon: <Bell size={20} />, label: 'Notificações', color: 'var(--info)' },
        { icon: <Shield size={20} />, label: 'Privacidade & Termos', color: 'var(--success)' },
        { icon: <HelpCircle size={20} />, label: 'Ajuda & Suporte', color: 'var(--warning)' },
    ];

    return (
        <div className="app-container">
            <Header title="Perfil" />

            <div className="page">
                {/* Profile card */}
                <div className="card-dark animate-scale-in" style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="avatar avatar-xl" style={{
                            margin: '0 auto var(--space-3)',
                            background: userType === 'pharmacy' ? 'var(--gradient-secondary)' : 'var(--gradient-primary)',
                            border: '3px solid rgba(255,255,255,0.2)',
                        }}>
                            {initials}
                        </div>
                        <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginBottom: '2px' }}>
                            {currentUser?.name}
                        </h2>
                        <p style={{ fontSize: 'var(--font-sm)', opacity: 0.7 }}>
                            {currentUser?.email}
                        </p>
                        {userType === 'pharmacy' && currentUser?.rating && (
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <Star size={14} fill="#fbbf24" color="#fbbf24" />
                                <span className="font-semibold text-sm">{currentUser.rating}</span>
                                <span style={{ fontSize: 'var(--font-xs)', opacity: 0.6 }}>
                                    ({currentUser.totalReviews} avaliações)
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info cards */}
                <div className="stagger" style={{
                    display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
                    marginBottom: 'var(--space-6)',
                }}>
                    <div className="card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                            background: 'var(--primary-50)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            color: 'var(--primary-600)',
                        }}>
                            <Mail size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-gray">E-mail</p>
                            <p className="text-sm font-semibold">{currentUser?.email}</p>
                        </div>
                    </div>

                    <div className="card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                            background: 'var(--success-light)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            color: 'var(--success)',
                        }}>
                            <Phone size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-gray">Telefone</p>
                            <p className="text-sm font-semibold">{currentUser?.phone}</p>
                        </div>
                    </div>

                    <div className="card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                            background: 'var(--info-light)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            color: 'var(--info)',
                        }}>
                            <MapPin size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-gray">Endereço</p>
                            <p className="text-sm font-semibold">{currentUser?.address}</p>
                        </div>
                    </div>

                    {userType === 'pharmacy' && (
                        <div className="card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: 'var(--radius-lg)',
                                background: 'var(--warning-light)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                color: 'var(--warning)',
                            }}>
                                <Building2 size={18} />
                            </div>
                            <div>
                                <p className="text-xs text-gray">CNPJ</p>
                                <p className="text-sm font-semibold">{currentUser?.cnpj}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Menu */}
                <div style={{ marginBottom: 'var(--space-6)' }}>
                    {menuItems.map((item, i) => (
                        <button
                            key={i}
                            onClick={item.onClick}
                            className="animate-slide-up"
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center',
                                gap: 'var(--space-3)', padding: 'var(--space-4)',
                                borderBottom: '1px solid var(--gray-100)',
                                background: 'none', cursor: 'pointer',
                                transition: 'background var(--transition-fast)',
                                animationDelay: `${i * 60}ms`,
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                            <div style={{
                                width: '36px', height: '36px', borderRadius: 'var(--radius-lg)',
                                background: `${item.color}15`, display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                color: item.color,
                            }}>
                                {item.icon}
                            </div>
                            <span className="text-sm font-semibold" style={{ flex: 1, textAlign: 'left' }}>
                                {item.label}
                            </span>
                            <ChevronRight size={16} color="var(--gray-400)" />
                        </button>
                    ))}
                </div>

                {/* Painel de Privacidade e Direitos do Titular (LGPD Art. 18) */}
                <div className="card animate-slide-up" style={{
                    marginBottom: 'var(--space-6)',
                    padding: 'var(--space-5)',
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid rgba(13, 148, 136, 0.2)',
                    borderRadius: 'var(--radius-xl)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-3)' }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 'var(--radius-md)',
                            background: 'rgba(13, 148, 136, 0.1)', color: 'var(--primary-600)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Shield size={18} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700, margin: 0, color: 'var(--gray-900)' }}>
                                Privacidade e Seus Dados (LGPD)
                            </h3>
                            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)', margin: 0 }}>
                                Gerencie seus consentimentos e direitos de titular (incluindo dados dos seus pets)
                            </p>
                        </div>
                    </div>

                    {/* Status do consentimento */}
                    <div style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: consentStatus?.hasActiveHealthConsent ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        border: `1px solid ${consentStatus?.hasActiveHealthConsent ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                        marginBottom: 'var(--space-4)',
                        fontSize: 'var(--font-xs)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <span>Consentimento de Saúde:</span>
                        <strong style={{ color: consentStatus?.hasActiveHealthConsent ? '#059669' : '#dc2626' }}>
                            {consentStatus?.hasActiveHealthConsent ? '✓ Ativo (v1.0.0)' : '✕ Revogado / Ausente'}
                        </strong>
                    </div>

                    {lgpdMessage && (
                        <div style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-4)',
                            fontSize: 'var(--font-xs)',
                            background: lgpdMessage.type === 'error' ? '#fef2f2' : lgpdMessage.type === 'warning' ? '#fffbeb' : '#ecfdf5',
                            color: lgpdMessage.type === 'error' ? '#b91c1c' : lgpdMessage.type === 'warning' ? '#b45309' : '#047857',
                            border: `1px solid ${lgpdMessage.type === 'error' ? '#fecaca' : lgpdMessage.type === 'warning' ? '#fde68a' : '#a7f3d0'}`
                        }}>
                            {lgpdMessage.text}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button
                            type="button"
                            onClick={handleExportData}
                            disabled={lgpdLoading}
                            style={{
                                width: '100%', padding: '10px', borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--primary-600)', background: 'rgba(13, 148, 136, 0.05)',
                                color: 'var(--primary-700)', fontWeight: 600, fontSize: 'var(--font-xs)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                cursor: 'pointer'
                            }}
                        >
                            <Download size={14} />
                            Exportar Meus Dados (JSON - Art. 18 LGPD)
                        </button>

                        {consentStatus?.hasActiveHealthConsent && (
                            <button
                                type="button"
                                onClick={handleRevokeConsent}
                                disabled={lgpdLoading}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: 'var(--radius-md)',
                                    border: '1px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)',
                                    color: '#b45309', fontWeight: 600, fontSize: 'var(--font-xs)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    cursor: 'pointer'
                                }}
                            >
                                <AlertTriangle size={14} />
                                Revogar Consentimento de Saúde
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleDeleteAccount}
                            disabled={lgpdLoading}
                            style={{
                                width: '100%', padding: '10px', borderRadius: 'var(--radius-md)',
                                border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.05)',
                                color: '#b91c1c', fontWeight: 600, fontSize: 'var(--font-xs)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                cursor: 'pointer'
                            }}
                        >
                            <Trash2 size={14} />
                            Solicitar Exclusão da Conta e Anonimização
                        </button>
                    </div>
                </div>

                {/* Logout */}
                <button className="btn btn-block animate-slide-up" style={{
                    color: 'var(--error)', border: '2px solid var(--error-light)',
                    borderRadius: 'var(--radius-xl)', padding: 'var(--space-3)',
                    fontWeight: 600,
                }} onClick={handleLogout}>
                    <LogOut size={18} />
                    Sair da Conta
                </button>

                {/* Version */}
                <p className="text-xs text-gray text-center mt-6">
                    MedConnect v1.0.0
                </p>
            </div>

            <BottomNav />
        </div>
    );
}
