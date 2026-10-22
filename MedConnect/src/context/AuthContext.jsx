import { createContext, useContext, useState, useEffect } from 'react';
import { api, getSocket, setAccessToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  // Inicialização da sessão: tenta renovar token via cookie HttpOnly silenciosamente
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const response = await api.post('/auth/refresh');
        const { user, accessToken, token } = response.data;
        if (isMounted) {
          setAccessToken(accessToken || token);
          setCurrentUser(user);
          setUserType(user.role);
        }
      } catch (err) {
        // Sessão não ativa ou cookie expirado
        if (isMounted) {
          setAccessToken(null);
          setCurrentUser(null);
          setUserType(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    const handleSessionExpired = () => {
      setAccessToken(null);
      setCurrentUser(null);
      setUserType(null);
      getSocket().disconnect();
    };

    window.addEventListener('auth:session_expired', handleSessionExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:session_expired', handleSessionExpired);
    };
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
      const { token, accessToken, user } = response.data;
      const activeToken = accessToken || token;

      setAccessToken(activeToken);
      setCurrentUser(user);
      setUserType(user.role);

      return { user, token: activeToken };
    } catch (error) {
      console.error('Login error', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignora erro no logout
    } finally {
      setAccessToken(null);
      setCurrentUser(null);
      setUserType(null);
      getSocket().disconnect();
    }
  };

  const isAuthenticated = !!currentUser;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userType,
        isAuthenticated,
        login,
        register,
        logout,
        loading
      }}
    >
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
