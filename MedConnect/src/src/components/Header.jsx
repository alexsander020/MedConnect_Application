import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, ArrowLeft } from 'lucide-react';

export default function Header({ title, showBack, showNotification = true }) {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const initials = currentUser?.name
        ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)
        : '?';

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
                            {currentUser?.name?.split(' ')[0]}
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
                <div className="avatar" style={{ width: 36, height: 36, fontSize: 'var(--font-xs)' }}>
                    {initials}
                </div>
            </div>
        </header>
    );
}
