import { createContext, useContext, useState, useEffect } from 'react';
import { api, getSocket } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userType, setUserType] = useState(null); // 'PATIENT' or 'PHARMACY'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('@MedConnect:token');
        const user = localStorage.getItem('@MedConnect:user');
        
        if (token && user) {
            try {
                const parsedUser = JSON.parse(user);
                setCurrentUser(parsedUser);
                setUserType(parsedUser.role);
            } catch (e) {
                console.error('Failed to parse session', e);
            }
        }
        setLoading(false);
    }, []);

    // Gerencia o ciclo de vida do WebSocket com base no usuário logado
    useEffect(() => {
        if (!currentUser) return;

        const socket = getSocket();
        socket.connect();
        socket.emit('join_room', currentUser.id);

        const handleNewQuote = (data) => {
            alert(`Notificação em Tempo Real! ${data.message} Preço: R$${data.quote.price}`);
        };

        socket.on('new_quote', handleNewQuote);

        return () => {
            socket.off('new_quote', handleNewQuote);
            socket.disconnect();
        };
    }, [currentUser]);

    const register = async (userData, type) => {
        const endpoint = type === 'pharmacy' ? '/pharmacies' : '/users';
        const payload = { ...userData, role: type === 'pharmacy' ? 'PHARMACY' : 'PATIENT' };
        
        const response = await api.post(endpoint, payload);
        return response.data;
    };

    const login = async (email, password, type = 'user') => {
        try {
            const response = await api.post('/auth/login', { email, password, type });
            const { token, user } = response.data;

            localStorage.setItem('@MedConnect:token', token);
            localStorage.setItem('@MedConnect:user', JSON.stringify(user));

            setCurrentUser(user);
            setUserType(user.role);

            return { user, token };
        } catch (error) {
            console.error('Login error', error);
            throw error;
        }
    };

    const logout = async () => {
        localStorage.removeItem('@MedConnect:token');
        localStorage.removeItem('@MedConnect:user');
        setCurrentUser(null);
        setUserType(null);
        getSocket().disconnect();
    };

    const isAuthenticated = !!currentUser;

    return (
        <AuthContext.Provider value={{ currentUser, userType, isAuthenticated, login, register, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
