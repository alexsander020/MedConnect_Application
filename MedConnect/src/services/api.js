import axios from 'axios';
import { io } from 'socket.io-client';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@MedConnect:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let socket;
export const getSocket = () => {
    if (!socket) {
        socket = io(baseURL.replace('/api', ''), {
            autoConnect: false
        });
    }
    return socket;
};
