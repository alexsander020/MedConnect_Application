import LegalDocument from './components/LegalDocument';
import { privacyPolicy } from '@/content/legal/privacyPolicy';

/** /privacy — Política de Privacidade (versão preliminar em revisão jurídica) */
export default function PrivacyPolicy() {
  return <LegalDocument doc={privacyPolicy} />;
}
