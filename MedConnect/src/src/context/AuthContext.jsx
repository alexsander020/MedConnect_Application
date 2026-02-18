import { createContext, useContext, useState } from 'react';
import { mockUser, mockPharmacy } from '../data/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userType, setUserType] = useState(null); // 'user' or 'pharmacy'

    const login = (type) => {
        setUserType(type);
        if (type === 'user') {
            setCurrentUser(mockUser);
        } else {
            setCurrentUser(mockPharmacy);
        }
    };

    const logout = () => {
        setCurrentUser(null);
        setUserType(null);
    };

    const isAuthenticated = !!currentUser;

    return (
        <AuthContext.Provider value={{ currentUser, userType, isAuthenticated, login, logout }}>
            {children}
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
