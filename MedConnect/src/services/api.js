import axios from 'axios';
import { io } from 'socket.io-client';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Armazena o access token exclusivamente em memória (NUNCA no localStorage)
let inMemoryAccessToken = null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;
};

export const getAccessToken = () => {
  return inMemoryAccessToken;
};

export const api = axios.create({
  baseURL,
  withCredentials: true // Permite o envio automático de cookies HttpOnly (refreshToken)
});

// Interceptor de requisição: injeta o access token em memória
api.interceptors.request.use((config) => {
  if (inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  return config;
});

// Fila para requisições concorrentes aguardando a renovação do token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor de resposta: gerencia renovação transparente do token sem loops
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se for erro 401 e não for requisição de login/refresh/logout e ainda não tiver tentado retry
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/logout')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        const newAccessToken = data.accessToken || data.token;
        setAccessToken(newAccessToken);

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        window.dispatchEvent(new CustomEvent('auth:session_expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

let socket;
export const getSocket = () => {
  if (!socket) {
    socket = io(baseURL.replace('/api', ''), {
      autoConnect: false,
      auth: { token: inMemoryAccessToken }
    });
  } else {
    socket.auth = { token: inMemoryAccessToken };
  }
  return socket;
};
