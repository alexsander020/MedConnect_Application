import { formatWeight, speciesLabel } from '@/lib/vet';

/** "Thor · Cão · 15,5 kg" — resumo do animal para listas e cabeçalhos */
export function petSummary(pet) {
  if (!pet) return '';
  return [pet.name, speciesLabel(pet.species), formatWeight(pet.weightGrams)].filter(Boolean).join(' · ');
}

/** Formas farmacêuticas veterinárias (mesmos códigos usados pelas farmácias na cotação) */
export const PHARMACEUTICAL_FORM_LABELS = {
  BISCOITO_MEDICAMENTOSO: 'Biscoito medicamentoso',
  PASTA_ORAL: 'Pasta oral',
  SUSPENSAO: 'Suspensão líquida',
  CAPSULA: 'Cápsula',
  GEL_TRANSDERMICO: 'Gel transdérmico',
};

export const pharmaceuticalFormLabel = (code) => (code ? PHARMACEUTICAL_FORM_LABELS[code] || code : null);
