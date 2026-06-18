import { useState } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from './BottomNav';

export default function PharmacyLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser, logout } = useAuth();
    const [search, setSearch] = useState('');

    const displayName = currentUser?.name || currentUser?.email?.split('@')[0] || 'HealthLink Pharmacy';

    const menuItems = [
        { path: '/pharmacy', icon: 'dashboard', label: 'Dashboard', exact: true },
        { path: '/pharmacy/requests', icon: 'request_quote', label: 'Quotes' },
        { path: '/pharmacy/orders', icon: 'factory', label: 'Production' },
        { path: '/pharmacy/reviews', icon: 'star', label: 'Reviews' },
        { path: '/profile', icon: 'person', label: 'Profile' },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
            {/* SideNavBar */}
            <aside className="hidden md:flex flex-col h-full py-lg px-md w-64 flex-shrink-0 bg-surface border-r border-outline-variant font-body-sm text-body-sm">
                <div className="mb-xl px-sm">
                    <h1 className="text-headline-md font-headline-md text-primary font-bold">MedConnect</h1>
                    <p className="text-on-surface-variant font-label-md">{displayName}</p>
                </div>
                
                <button 
                    onClick={() => navigate('/pharmacy/requests')}
                    className="mb-lg mx-sm bg-primary text-on-primary py-sm px-md rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:opacity-80"
                >
                    <span className="material-symbols-outlined">add</span>
                    New Prescription
                </button>
                
                <nav className="flex-1 space-y-1">
                    {menuItems.map((item) => {
                        const isActive = item.exact 
                            ? location.pathname === item.path
                            : location.pathname.startsWith(item.path);

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={`w-full flex items-center gap-md px-md py-sm rounded-lg font-bold transition-colors duration-200 ${
                                    isActive 
                                        ? 'text-primary border-r-4 border-primary bg-primary-container/10' 
                                        : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low font-normal'
                                }`}
                            >
                                <span className="material-symbols-outlined">{item.icon}</span>
                                {item.label}
                            </NavLink>
                        );
                    })}
                </nav>
                
                <div className="mt-auto space-y-1">
                    <button onClick={() => { logout(); navigate('/'); }} className="w-full flex items-center gap-md px-md py-sm rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors">
                        <span className="material-symbols-outlined">logout</span>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* TopNavBar */}
                <header className="flex justify-between items-center w-full px-gutter py-sm bg-surface border-b border-outline-variant z-10">
                    <div className="flex items-center gap-lg">
                        <h2 className="font-headline-md text-headline-md font-bold text-on-surface whitespace-nowrap">Pharmacy Control Center</h2>
                        <div className="relative hidden lg:block">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                            <input 
                                className="pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-full text-label-md w-64 focus:outline-none focus:border-primary" 
                                placeholder="Pesquisar..." 
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-lg">
                        <div className="flex items-center gap-sm">
                            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                                <span className="material-symbols-outlined">notifications</span>
                            </button>
                            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-outline-variant">
                                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
                                    {displayName.substring(0, 2).toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Canvas -> Renders the specific page */}
                <main className="flex-1 overflow-y-auto p-lg bg-background relative">
                    <Outlet />
                </main>
            </div>
            
            {/* Mobile Bottom Nav */}
            <div className="md:hidden">
                <BottomNav />
            </div>
        </div>
    );
}
