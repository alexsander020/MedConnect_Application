import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import {
    User, Mail, Phone, MapPin, Shield, Bell, HelpCircle,
    FileText, LogOut, ChevronRight, Building2, Star
} from 'lucide-react';

export default function Profile() {
    const navigate = useNavigate();
    const { currentUser, userType, logout } = useAuth();

    const initials = currentUser?.name
        ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)
        : '?';

    const handleLogout = () => {
        logout();
        navigate('/', { replace: true });
    };

    const menuItems = [
        { icon: <User size={20} />, label: 'Editar Perfil', color: 'var(--primary-500)' },
        { icon: <Bell size={20} />, label: 'Notificações', color: 'var(--info)' },
        { icon: <Shield size={20} />, label: 'Privacidade', color: 'var(--success)' },
        { icon: <FileText size={20} />, label: 'Termos de Uso', color: 'var(--gray-500)' },
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
