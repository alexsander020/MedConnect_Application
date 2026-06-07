import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, ArrowLeft, LogOut } from 'lucide-react';

export default function Header({ title, showBack, showNotification = true }) {
    const { currentUser, userType, logout } = useAuth();
    const navigate = useNavigate();

    const displayName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Usuário';
    const initials = displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <header className="page-header animate-slide-down">
            <div className="flex items-center gap-3">
                {showBack && (
                    <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} />
                    </button>
                )}
                {title ? (
                    <h1 className="page-title">{title}</h1>
                ) : (
                    <div>
                        <p className="text-sm text-gray">Olá, 👋</p>
                        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>
                            {displayName.split(' ')[0]}
                        </h1>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2">
                {showNotification && (
                    <button className="btn btn-ghost btn-icon" style={{ position: 'relative' }}>
                        <Bell size={20} />
                        <span className="notification-dot"></span>
                    </button>
                )}
                <div
                    className="avatar"
                    title="Sair"
                    style={{ width: 36, height: 36, fontSize: 'var(--font-xs)', cursor: 'pointer' }}
                    onClick={() => {
                        logout();
                        navigate('/');
                    }}
                >
                    {initials}
                </div>
            </div>
        </header>
    );
}
