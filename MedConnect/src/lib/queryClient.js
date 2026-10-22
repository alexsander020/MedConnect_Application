import { QueryClient } from '@tanstack/react-query';
import { getSocket } from '../services/api';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 2, // 2 minutos de cache fresco
            gcTime: 1000 * 60 * 10,   // 10 minutos de permanência em memória
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

/**
 * Conecta os eventos do Socket.IO para invalidar automaticamente as consultas do TanStack Query
 * e notificar a interface em tempo real.
 */
export function setupSocketQueryInvalidation() {
    try {
        const socket = getSocket();
        if (!socket) return;

        socket.on('notification', (payload) => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['myPrescriptions'] });
            queryClient.invalidateQueries({ queryKey: ['myOrders'] });
            queryClient.invalidateQueries({ queryKey: ['pharmacyStats'] });

            // Dispara toast acessível no navegador
            if (payload?.title && payload?.message) {
                window.dispatchEvent(
                    new CustomEvent('app:toast', {
                        detail: {
                            type: 'info',
                            title: payload.title,
                            message: payload.message
                        }
                    })
                );
            }
        });

        socket.on('new_quote', () => {
            queryClient.invalidateQueries({ queryKey: ['myPrescriptions'] });
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        });

        socket.on('quote_accepted', () => {
            queryClient.invalidateQueries({ queryKey: ['myOrders'] });
            queryClient.invalidateQueries({ queryKey: ['pharmacyStats'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        });

        socket.on('order_status_updated', () => {
            queryClient.invalidateQueries({ queryKey: ['myOrders'] });
            queryClient.invalidateQueries({ queryKey: ['order'] });
            queryClient.invalidateQueries({ queryKey: ['pharmacyStats'] });
        });
    } catch (err) {
        console.warn('Erro ao configurar invalidadores de query do Socket.IO:', err);
    }
}
