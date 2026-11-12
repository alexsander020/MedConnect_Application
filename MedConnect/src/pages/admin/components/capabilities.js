import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/services/endpoints';

/** Tom do selo de situação de cada habilitação regulatória (PharmacyCapability) */
export const CAPABILITY_TONES = {
  PENDING_VERIFICATION: 'warning',
  VERIFIED: 'success',
  REJECTED: 'error',
  SUSPENDED: 'neutral',
};

export const CAPABILITIES_QUERY_KEY = ['adminCapabilities'];

/** Todas as habilitações (a lista é pequena no piloto; filtros aplicados na tela) */
export function useAdminCapabilities() {
  return useQuery({ queryKey: CAPABILITIES_QUERY_KEY, queryFn: () => adminApi.capabilities() });
}
