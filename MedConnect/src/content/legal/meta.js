/**
 * Metadados comuns dos documentos legais públicos.
 *
 * A versão PRECISA acompanhar a versão do consentimento registrado no backend
 * (backend/src/constants/consentTexts.ts → CONSENT_DEFINITIONS.TERMS_AND_PRIVACY.version)
 * e a versão gravada no aceite do termo de adesão das farmácias (Pharmacy.termsVersion).
 *
 * Fonte dos textos: docs/lgpd/*.md (rascunhos marcados "RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA").
 */
export const LEGAL_VERSION = 'v1.0.0';

/** Data da última atualização dos rascunhos (docs/lgpd/*.md) */
export const LEGAL_UPDATED_AT = '2026-10-24';

export const LEGAL_DOCUMENTS = [
  { to: '/privacy', label: 'Política de Privacidade' },
  { to: '/terms', label: 'Termos de Uso' },
  { to: '/pharmacy-terms', label: 'Termo de Adesão de Farmácias' },
];
