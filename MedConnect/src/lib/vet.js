/**
 * Vertical veterinária: rótulos e formatações compartilhadas pelas telas de tutor, farmácia e administração.
 * A vertical inteira fica atrás da flag VET_ENABLED (GET /api/config → usePublicConfig().vetEnabled).
 */

export const SPECIES_LABELS = {
  DOG: 'Cão',
  CAT: 'Gato',
  BIRD: 'Ave',
  REPTILE: 'Réptil',
  SMALL_MAMMAL: 'Pequeno mamífero',
  EQUINE: 'Equino',
  OTHER: 'Outra espécie',
};

/** Rótulo longo, usado em seletores (ajuda o tutor a escolher a categoria certa) */
export const SPECIES_OPTION_LABELS = {
  DOG: 'Cão',
  CAT: 'Gato',
  BIRD: 'Ave',
  REPTILE: 'Réptil',
  SMALL_MAMMAL: 'Pequeno mamífero (roedor, coelho)',
  EQUINE: 'Equino (cavalo)',
  OTHER: 'Outra espécie',
};

export const speciesLabel = (species) => (species ? SPECIES_LABELS[species] || species : null);

export const VET_DOCUMENT_LABELS = {
  MAGISTRAL: 'Receita veterinária (magistral)',
  CONTROLLED_NOTIFICATION: 'Notificação de receita controlada',
};

export const CAPABILITY_TYPE_LABELS = {
  HUMAN_COMPOUNDING: 'Manipulação humana',
  VETERINARY_COMPOUNDING: 'Manipulação veterinária',
};

export const CAPABILITY_STATUS_LABELS = {
  PENDING_VERIFICATION: 'Em análise',
  VERIFIED: 'Habilitada',
  REJECTED: 'Recusada',
  SUSPENDED: 'Suspensa',
};

/** Peso em gramas → "31,5 kg" (ou "850 g" abaixo de 1 kg) */
export function formatWeight(grams) {
  if (grams === null || grams === undefined || Number.isNaN(Number(grams))) return null;
  const g = Number(grams);
  if (g < 1000) return `${g.toLocaleString('pt-BR')} g`;
  return `${(g / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
}

/** Idade aproximada a partir da data de nascimento (ou de meses já calculados pela API) */
export function formatAnimalAge({ birthDate, approximateAgeMonths } = {}) {
  let months = approximateAgeMonths;
  if ((months === null || months === undefined) && birthDate) {
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    const now = new Date();
    months = Math.max(0, (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth()));
  }
  if (months === null || months === undefined) return null;
  if (months < 12) return months === 1 ? '1 mês' : `${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 ano' : `${years} anos`;
}

export const isVetPrescription = (p) => p?.kind === 'VETERINARY';
