import LegalDocument from './components/LegalDocument';
import { termsOfUse } from '@/content/legal/termsOfUse';

/** /terms — Termos de Uso para pacientes (versão preliminar em revisão jurídica) */
export default function TermsOfUse() {
  return <LegalDocument doc={termsOfUse} />;
}
