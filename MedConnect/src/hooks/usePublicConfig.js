import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function usePublicConfig() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['publicConfig'],
    queryFn: async () => {
      try {
        const res = await api.get('/config');
        return res.data;
      } catch {
        // Fallback seguro: se endpoint falhar ou não responder, mantém desligado
        return {
          vetEnabled: false,
          vetAllowFoodProducing: false,
          vetControlledEnabled: false
        };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 min
    gcTime: 1000 * 60 * 15
  });

  return {
    config: data || {
      vetEnabled: false,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false
    },
    vetEnabled: !!data?.vetEnabled,
    vetAllowFoodProducing: !!data?.vetAllowFoodProducing,
    vetControlledEnabled: !!data?.vetControlledEnabled,
    isLoading,
    isError
  };
}
