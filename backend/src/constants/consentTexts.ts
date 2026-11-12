import crypto from 'crypto';

/**
 * Textos e versões oficiais de termos de consentimento para dados de saúde (LGPD Art. 11) e vertical veterinária.
 * Todos os textos possuem versionamento semântico e hash SHA-256 para garantia de integridade.
 * AVISO: Textos marcados com draft dependem de revisão jurídica obrigatória.
 */

export interface ConsentDefinition {
  type: string;
  version: string;
  title: string;
  text: string;
  hash: string;
}

const HEALTH_DATA_TEXT_V1 = 
  'Autorizo expressamente a plataforma MedConnect e as farmácias de manipulação credenciadas a realizarem o ' +
  'tratamento de meus dados pessoais sensíveis de saúde, incluindo prescrições médicas, componentes farmacêuticos, ' +
  'posologias e informações clínicas anexas, com a finalidade estrita de obtenção de cotações de preços, ' +
  'avaliação técnica de viabilidade de manipulação e execução da ordem de manipulação e entrega, em conformidade com ' +
  'o Artigo 11, inciso I da Lei Geral de Proteção de Dados (Lei 13.709/2018). Estou ciente de que posso revogar ' +
  'este consentimento a qualquer tempo na seção de privacidade do meu perfil, hipótese em que novos usos serão ' +
  'bloqueados e o fluxo de exclusão/anonimização será iniciado, respeitados os prazos regulatórios de retenção sanitária.';

const REGISTRATION_TERMS_TEXT_V1 =
  'Declaro ter lido, compreendido e aceitado os Termos de Uso e a Política de Privacidade da MedConnect, ' +
  'autorizando a criação da minha conta de usuário e o tratamento dos meus dados cadastrais necessários à execução do serviço.';

const VET_DATA_TEXT_DRAFT_V1 =
  '[RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA] Declaro ser o tutor e responsável legal pelo animal informado e autorizo ' +
  'expressamente a MedConnect e as farmácias de manipulação habilitadas pelo MAPA/CRMV a realizarem o tratamento de ' +
  'meus dados cadastrais e das receitas veterinárias de meu animal para fins de cotação de preços, análise farmacotécnica ' +
  'e entrega de formulações magistrais, em conformidade com as diretrizes da LGPD e regulamentos do MAPA. Estou ciente de que ' +
  'posso revogar este consentimento a qualquer momento no meu perfil, respeitados os prazos regulatórios de retenção de receitas.';

function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export const CONSENT_DEFINITIONS: Record<string, ConsentDefinition> = {
  HEALTH_DATA_PROCESSING: {
    type: 'HEALTH_DATA_PROCESSING',
    version: 'v1.0.0',
    title: 'Consentimento para Tratamento de Dados Pessoais Sensíveis de Saúde',
    text: HEALTH_DATA_TEXT_V1,
    hash: computeHash(HEALTH_DATA_TEXT_V1)
  },
  PRESCRIPTION_UPLOAD: {
    type: 'PRESCRIPTION_UPLOAD',
    version: 'v1.0.0',
    title: 'Consentimento Específico para Envio e Análise de Receita Médica',
    text: HEALTH_DATA_TEXT_V1,
    hash: computeHash(HEALTH_DATA_TEXT_V1)
  },
  TERMS_AND_PRIVACY: {
    type: 'TERMS_AND_PRIVACY',
    version: 'v1.0.0',
    title: 'Termos de Uso e Política de Privacidade da Plataforma',
    text: REGISTRATION_TERMS_TEXT_V1,
    hash: computeHash(REGISTRATION_TERMS_TEXT_V1)
  },
  VET_DATA_PROCESSING: {
    type: 'VET_DATA_PROCESSING',
    version: 'v1.0.0-draft',
    title: 'Consentimento para Tratamento de Dados de Prescrições Veterinárias e Animais [RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA]',
    text: VET_DATA_TEXT_DRAFT_V1,
    hash: computeHash(VET_DATA_TEXT_DRAFT_V1)
  }
};

export const CURRENT_HEALTH_CONSENT = CONSENT_DEFINITIONS.HEALTH_DATA_PROCESSING;
export const CURRENT_VET_CONSENT = CONSENT_DEFINITIONS.VET_DATA_PROCESSING;
