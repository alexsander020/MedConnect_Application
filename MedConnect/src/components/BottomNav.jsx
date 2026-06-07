import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, ClipboardList, User, LayoutDashboard, FileText, Package, Star, PlusCircle } from 'lucide-react';

export default function BottomNav() {
    const { userType } = useAuth();

    if (userType === 'PHARMACY') {
        return (
            <nav className="bottom-nav">
                <NavLink to="/pharmacy" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                    <LayoutDashboard size={22} />
                    <span>Início</span>
                </NavLink>
                <NavLink to="/pharmacy/requests" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                    <FileText size={22} />
                    <span>Solicitações</span>
                </NavLink>
                <NavLink to="/pharmacy/orders" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                    <Package size={22} />
                    <span>Pedidos</span>
                </NavLink>
                <NavLink to="/pharmacy/reviews" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                    <Star size={22} />
                    <span>Avaliações</span>
                </NavLink>
                <NavLink to="/profile" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                    <User size={22} />
                    <span>Perfil</span>
                </NavLink>
            </nav>
        );
    }

    // Menu do Paciente
    return (
        <nav className="bottom-nav">
            <NavLink to="/dashboard" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                <Home size={22} />
                <span>Início</span>
            </NavLink>
            <NavLink to="/new-quote" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                <PlusCircle size={22} />
                <span>Nova Cotação</span>
            </NavLink>
            <NavLink to="/orders" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                <ClipboardList size={22} />
                <span>Pedidos</span>
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
                <User size={22} />
                <span>Perfil</span>
            </NavLink>
        </nav>
    );
}

