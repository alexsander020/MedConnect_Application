import { createContext, useContext, useState, useEffect } from 'react';
import { mockUser, mockPharmacy } from '../data/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userType, setUserType] = useState(null); // 'user' or 'pharmacy'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock session check
        const storedSession = localStorage.getItem('@MedConnect:session');
        if (storedSession) {
            try {
                const session = JSON.parse(storedSession);
                setCurrentUser(session.user);
                setUserType(session.type);
            } catch (e) {
                console.error('Failed to parse session', e);
            }
        }
        setLoading(false);
    }, []);

    const register = async (email, password, type) => {
        // Simula delay de rede
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockNewUser = type === 'pharmacy' ? mockPharmacy : mockUser;
        const sessionData = {
            user: { ...mockNewUser, email, id: Math.random().toString(36).substr(2, 9) },
            type: type
        };
        
        // Simula o registro, mas não loga automaticamente (como no fluxo original)
        return sessionData;
    };

    const login = async (email, password) => {
        // Simula delay de rede
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Define o tipo baseado em uma string no email ou fallback
        let type = 'user';
        if (email.includes('farma') || email.includes('farmacia')) {
            type = 'pharmacy';
        }

        const mockLoggedUser = type === 'pharmacy' ? mockPharmacy : mockUser;
        const sessionData = {
            user: { ...mockLoggedUser, email, id: Math.random().toString(36).substr(2, 9) },
            type: type
        };

        localStorage.setItem('@MedConnect:session', JSON.stringify(sessionData));
        setCurrentUser(sessionData.user);
        setUserType(sessionData.type);

        return sessionData;
    };

    const logout = async () => {
        localStorage.removeItem('@MedConnect:session');
        setCurrentUser(null);
        setUserType(null);
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
