import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, ClipboardList, User, LayoutDashboard, FileText, Package, Star } from 'lucide-react';

export default function BottomNav() {
    const { userType } = useAuth();
    const location = useLocation();

    if (userType === 'pharmacy') {
        return (
            <nav className="bottom-nav">
                <NavLink to="/pharmacy" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                    <LayoutDashboard />
                    <span>Início</span>
                </NavLink>
                <NavLink to="/pharmacy/requests" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                    <FileText />
                    <span>Solicitações</span>
                </NavLink>
                <NavLink to="/pharmacy/orders" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                    <Package />
                    <span>Pedidos</span>
                </NavLink>
                <NavLink to="/pharmacy/reviews" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                    <Star />
                    <span>Avaliações</span>
                </NavLink>
                <NavLink to="/profile" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                    <User />
                    <span>Perfil</span>
                </NavLink>
            </nav>
        );
    }

    return (
        <nav className="bottom-nav">
            <NavLink to="/dashboard" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                <Home />
                <span>Início</span>
            </NavLink>
            <NavLink to="/orders" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                <ClipboardList />
                <span>Pedidos</span>
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                <User />
                <span>Perfil</span>
            </NavLink>
        </nav>
    );
}
