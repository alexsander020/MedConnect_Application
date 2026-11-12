import { useQuery } from '@tanstack/react-query';
import { pharmacyApi } from '@/services/endpoints';

/**
 * Vertical veterinária na área da farmácia (VET_ENABLED) — helpers sem React.
 * A API devolve o animal como `animal` (mural e detalhe) ou `pet` (pedidos); o prescritor como objeto
 * `prescriber` ou como campos soltos `prescriberName/Crmv/Uf` — os helpers aceitam os dois formatos.
 */

export { isVetPrescription } from '@/lib/vet';

export const TUTOR_RELEASE_NOTICE = 'A receita completa e o contato do tutor são liberados após o aceite da sua proposta.';

export const animalOf = (p) => p?.animal || p?.pet || null;

export function prescriberOf(p) {
  if (p?.prescriber?.name || p?.prescriber?.crmv) return p.prescriber;
  if (p?.prescriberName || p?.prescriberCrmv) {
    return { name: p.prescriberName, crmv: p.prescriberCrmv, uf: p.prescriberUf };
  }
  return null;
}

/** "Dra. Luiza Castro · CRMV-SP 12345" */
export function prescriberLabel(prescriber) {
  if (!prescriber) return null;
  const crmv = prescriber.crmv ? `CRMV-${prescriber.uf || '—'} ${prescriber.crmv}` : null;
  return [prescriber.name, crmv].filter(Boolean).join(' · ');
}

/** Capacidades regulatórias da farmácia (GET /pharmacy/capabilities) — só consultadas com VET_ENABLED */
export function usePharmacyCapabilities(enabled) {
  const query = useQuery({
    queryKey: ['pharmacyCapabilities'],
    queryFn: pharmacyApi.capabilities,
    enabled: !!enabled,
    staleTime: 60_000,
  });
  const list = Array.isArray(query.data) ? query.data : [];
  const vetCapability = list.find((c) => c.type === 'VETERINARY_COMPOUNDING') || null;
  return { ...query, capabilities: list, vetCapability, vetVerified: vetCapability?.status === 'VERIFIED' };
}
