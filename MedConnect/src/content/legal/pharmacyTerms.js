import { LEGAL_VERSION, LEGAL_UPDATED_AT } from './meta';

/**
 * Termo de Adesão e Credenciamento de Farmácias — conversão estruturada de
 * docs/lgpd/termo-de-adesao-farmacias.md. Removidos do texto exibido: o aviso interno aos
 * revisores, marcações de pendência jurídica e nomes internos de sistema (enums de status).
 * Placeholders do rascunho permanecem entre colchetes.
 */
export const pharmacyTerms = {
  key: 'pharmacy-terms',
  eyebrow: 'Para farmácias',
  title: 'Termo de Adesão e Credenciamento de Farmácias de Manipulação',
  summary:
    'As condições para credenciar e operar uma farmácia de manipulação na MedConnect: requisitos sanitários, responsabilidade técnica, prazos, preço, entrega e proteção de dados.',
  version: LEGAL_VERSION,
  updatedAt: LEGAL_UPDATED_AT,
  sections: [
    {
      id: 'partes-e-objeto',
      title: '1. Das partes e do objeto',
      blocks: [
        {
          type: 'p',
          text:
            '**1.1.** O presente instrumento regula as condições de credenciamento, adesão e operação de **farmácias de manipulação** (doravante "FARMÁCIA PARCEIRA") na plataforma digital gerida pela **MedConnect** (doravante "MEDCONNECT").',
        },
        {
          type: 'p',
          text:
            '**1.2.** O objeto consiste na disponibilização de canal eletrônico para recepção de receitas médicas enviadas por pacientes cadastrados, emissão de orçamentos competitivos, celebração de pedidos de manipulação magistral e acompanhamento logístico.',
        },
      ],
    },
    {
      id: 'requisitos-regulatorios',
      title: '2. Requisitos regulatórios e responsabilidade técnica',
      blocks: [
        {
          type: 'p',
          text:
            '**2.1. Habilitação sanitária prévia e obrigatória.** A FARMÁCIA PARCEIRA declara e comprova documentalmente, no ato do credenciamento:',
        },
        {
          type: 'ul',
          items: [
            'CNPJ ativo com CNAE compatível com comércio varejista de produtos farmacêuticos com manipulação de fórmulas;',
            'Autorização de Funcionamento de Empresa (AFE) expedida pela ANVISA;',
            'Licença ou alvará sanitário vigente, emitido pela autoridade sanitária local (VISA municipal ou estadual);',
            'Certidão de Regularidade Técnica (CRT) emitida pelo Conselho Regional de Farmácia (CRF) competente.',
          ],
        },
        { type: 'p', text: '**2.2. Responsabilidade técnica farmacêutica exclusiva.**' },
        {
          type: 'ul',
          items: [
            'A FARMÁCIA PARCEIRA e seu farmacêutico responsável técnico (RT) respondem com exclusividade pela avaliação farmacotécnica da prescrição médica, análise de dosagens máximas, interações medicamentosas, cálculo de quantidades de insumos ativos e controle de qualidade da matéria-prima utilizada (RDC ANVISA nº 67/2007).',
            'A MEDCONNECT atua estritamente como provedora de serviços de tecnologia da informação e intermediação digital, **não assumindo responsabilidade técnica farmacêutica sobre a fórmula manipulada**.',
          ],
        },
      ],
    },
    {
      id: 'niveis-de-servico',
      title: '3. Acordos de nível de serviço',
      blocks: [
        { type: 'h3', id: 'tempo-de-resposta', text: '3.1 Tempo de resposta para orçamentos' },
        {
          type: 'ul',
          items: [
            'A FARMÁCIA PARCEIRA compromete-se a analisar a receita e emitir a cotação no prazo de até **4 (quatro) horas úteis** a partir da disponibilização da receita na fila de cotação da sua área geográfica.',
            'Os orçamentos emitidos devem informar com precisão o valor total e o prazo de manipulação em dias úteis.',
          ],
        },
        { type: 'h3', id: 'prazo-de-manipulacao', text: '3.2 Prazo de manipulação e despacho' },
        {
          type: 'ul',
          items: [
            'Uma vez aceita a cotação pelo paciente, a FARMÁCIA PARCEIRA deve iniciar a manipulação no mesmo dia útil ou no dia útil subsequente.',
            'A atualização do status do pedido na plataforma (Em manipulação → Saiu para entrega → Entregue) é **obrigatória e em tempo real**, sob pena de redução da pontuação de reputação na plataforma.',
          ],
        },
        { type: 'h3', id: 'indice-de-entrega', text: '3.3 Índice mínimo de cumprimento de entrega' },
        {
          type: 'ul',
          items: [
            'A FARMÁCIA PARCEIRA deve manter uma taxa de entrega no prazo acordado igual ou superior a **95% (noventa e cinco por cento)**, calculada sobre a média móvel de 30 dias.',
          ],
        },
      ],
    },
    {
      id: 'regras-comerciais',
      title: '4. Regras comerciais, formação de preço e transparência',
      blocks: [
        {
          type: 'p',
          text:
            '**4.1. Caráter vinculante do orçamento.** O preço cadastrado na proposta é fixo, irreajustável e vinculante perante o paciente consumidor. É vedada a cobrança posterior de qualquer valor adicional, taxa de urgência não informada ou reajuste de insumo após a aceitação do orçamento.',
        },
        { type: 'p', text: '**4.2. Composição transparente do preço.** O orçamento deve discriminar claramente:' },
        {
          type: 'ul',
          items: [
            'o valor da formulação manipulada;',
            'o valor do frete ou da entrega domiciliar (quando não for frete grátis);',
            'quaisquer embalagens especiais exigidas pela natureza do produto (ex.: frascos âmbar, embalagens airless).',
          ],
        },
      ],
    },
    {
      id: 'logistica',
      title: '5. Regras logísticas, transporte e guarda sanitária',
      blocks: [
        { type: 'p', text: '**5.1. Boas práticas de transporte (RDC ANVISA nº 430/2020 e RDC nº 67/2007).**' },
        {
          type: 'ul',
          items: [
            'O transporte dos medicamentos até o domicílio do paciente deve assegurar a integridade físico-química dos produtos, protegidos de umidade, luz solar direta e variações de temperatura.',
            'Fórmulas termolábeis devem ser transportadas em embalagens térmicas com controle e monitoramento de temperatura.',
          ],
        },
        {
          type: 'p',
          text:
            '**5.2. Entrega de medicamentos sujeitos a controle especial.** Caso a formulação contenha substâncias sujeitas à Portaria SVS/MS nº 344/1998, a entrega do medicamento manipulado somente poderá ser concluída pelo entregador credenciado após:',
        },
        {
          type: 'ul',
          items: [
            'a conferência da identidade do recebedor (comprovada por documento oficial com foto);',
            'a **recolha física da via original da notificação de receita** retida (caso não se trate de prescrição eletrônica com assinatura ICP-Brasil validável).',
          ],
        },
      ],
    },
    {
      id: 'protecao-de-dados',
      title: '6. Proteção de dados pessoais (LGPD) e sigilo farmacêutico',
      blocks: [
        {
          type: 'p',
          text:
            '**6.1. Qualificação no tratamento de dados.** Ao receber dados de saúde e cadastrais de pacientes via plataforma, a FARMÁCIA PARCEIRA atua como controladora independente no tocante aos deveres sanitários e de dispensação do medicamento, e como operadora em conjunto nos termos do Contrato de Operador de Dados firmado com a MEDCONNECT.',
        },
        {
          type: 'p',
          text:
            '**6.2. Dever de sigilo e não divulgação.** A FARMÁCIA PARCEIRA obriga-se a manter absoluto sigilo médico e farmacêutico sobre as receitas médicas às quais tiver acesso, sendo proibido:',
        },
        {
          type: 'ul',
          items: [
            'utilizar a receita médica para qualquer fim estranho à cotação e à manipulação do pedido;',
            'contatar o paciente por meios externos para tentar captar o pedido "por fora" da plataforma (prática sujeita a descredenciamento sumário e multa compensatória);',
            'compartilhar receitas ou contatos de pacientes com terceiros, distribuidores ou agências de publicidade.',
          ],
        },
        {
          type: 'p',
          text:
            '**6.3. Guarda probatória sanitária (5 anos).** A FARMÁCIA PARCEIRA compromete-se a arquivar os registros das receitas manipuladas pelo prazo mínimo regulatório de 5 (cinco) anos, conforme determinado pela legislação sanitária em vigor.',
        },
      ],
    },
    {
      id: 'descredenciamento',
      title: '7. Descredenciamento, suspensão e penalidades',
      blocks: [
        {
          type: 'p',
          text:
            '**7.1.** O descumprimento das cláusulas sanitárias, a perda da regularidade no CRF ou a constatação de adulteração de matérias-primas implicará a **rescisão imediata e motivada** deste Termo, com bloqueio cautelar de acessos à plataforma e comunicação de ofício à Vigilância Sanitária e ao Ministério Público.',
        },
      ],
    },
    {
      id: 'foro',
      title: '8. Foro de eleição',
      blocks: [
        {
          type: 'p',
          text:
            'As partes elegem o foro da Comarca de [Cidade sede da MedConnect] para dirimir eventuais controvérsias decorrentes deste Termo de Adesão, com renúncia expressa a qualquer outro.',
        },
      ],
    },
  ],
};
