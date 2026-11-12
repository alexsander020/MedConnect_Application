import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getSocket, realtimeEnabled, setAccessToken } from '../services/api';

const AuthContext = createContext(null);

/** Exibida enquanto a sessão é restaurada pelo cookie (evita tela em branco) */
function SessionSplash() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 bg-background">
      <svg viewBox="0 0 40 40" aria-hidden="true" className="size-12 animate-pulse-soft">
        <rect width="40" height="40" rx="12" fill="var(--primary)" />
        <g transform="rotate(-45 20 20)">
          <rect x="9" y="14.5" width="22" height="11" rx="5.5" fill="white" />
        </g>
      </svg>
      <span className="text-sm text-muted-foreground">Carregando o MedConnect…</span>
    </div>
  );
}

/** Tela inicial de cada papel */
export const ROLE_HOME = {
  PATIENT: '/dashboard',
  PHARMACY: '/pharmacy',
  ADMIN: '/admin',
};

export function homeFor(role) {
  return ROLE_HOME[role] || '/';
}

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
      } catch {
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
    if (!currentUser || !realtimeEnabled) return;

    const socket = getSocket();
    socket.connect();
    socket.emit('join_room', currentUser.id);

    const handleNewQuote = (data) => {
      const price = data?.quote?.price
        ? Number(data.quote.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : null;
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: {
            type: 'success',
            title: 'Nova cotação recebida',
            message:
              [data?.message, price && `Valor: ${price}`].filter(Boolean).join(' · ') ||
              'Uma farmácia respondeu à sua receita.',
          },
        })
      );
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

  // Erros sobem para a tela tratar (sem log no console: o erro do axios carrega o e-mail digitado)
  const login = async (email, password, type = 'patient') => {
    const response = await api.post('/auth/login', { email, password, type });
    const { token, accessToken, user } = response.data;
    const activeToken = accessToken || token;

    setAccessToken(activeToken);
    setCurrentUser(user);
    setUserType(user.role);

    return { user, token: activeToken };
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignora erro no logout
    } finally {
      setAccessToken(null);
      setCurrentUser(null);
      setUserType(null);
      getSocket().disconnect();
    }
  };

  /** Atualiza nome/e-mail exibidos após edição de perfil */
  const updateCurrentUser = useCallback((patch) => {
    setCurrentUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

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
        loading,
        updateCurrentUser
      }}
    >
      {loading ? <SessionSplash /> : children}
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
