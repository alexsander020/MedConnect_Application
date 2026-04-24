import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { mockUser, mockPharmacy } from '../data/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userType, setUserType] = useState(null); // 'user' or 'pharmacy'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                // For simplicity, we are defaulting to 'user'. In a real app, you'd fetch this from a profiles table.
                const type = session.user.user_metadata?.user_type || 'user';
                setUserType(type);
                setCurrentUser({ ...mockUser, email: session.user.email, id: session.user.id });
            }
            setLoading(false);
        });

        // Listen for changes on auth state (sign in, sign out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                const type = session.user.user_metadata?.user_type || 'user';
                setUserType(type);
                setCurrentUser({ ...mockUser, email: session.user.email, id: session.user.id });
            } else {
                setCurrentUser(null);
                setUserType(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const register = async (email, password, type) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    user_type: type
                }
            }
        });
        if (error) throw error;
        return data;
    };

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    };

    const logout = async () => {
        await supabase.auth.signOut();
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
