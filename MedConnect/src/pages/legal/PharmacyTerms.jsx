import LegalDocument from './components/LegalDocument';
import { pharmacyTerms } from '@/content/legal/pharmacyTerms';

/** /pharmacy-terms — Termo de Adesão de farmácias (versão preliminar em revisão jurídica) */
export default function PharmacyTerms() {
  return <LegalDocument doc={pharmacyTerms} />;
}
