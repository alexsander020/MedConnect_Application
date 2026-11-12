import { LEGAL_VERSION, LEGAL_UPDATED_AT } from './meta';

/**
 * Termos de Uso para Pacientes — conversão estruturada de docs/lgpd/termos-de-uso-pacientes.md.
 * Removidos do texto exibido: o aviso interno aos revisores, marcações de pendência jurídica
 * e nomes internos de sistema (códigos HTTP, enums). O conteúdo das cláusulas foi mantido.
 */
export const termsOfUse = {
  key: 'terms',
  eyebrow: 'Termos de Uso',
  title: 'Termos e Condições Gerais de Uso para Pacientes',
  summary:
    'As regras de uso da MedConnect por pacientes: o papel da plataforma e das farmácias, o envio de receitas, as cotações, os pedidos e os seus direitos.',
  version: LEGAL_VERSION,
  updatedAt: LEGAL_UPDATED_AT,
  sections: [
    {
      id: 'natureza-do-servico',
      title: '1. Natureza do serviço e papel da MedConnect',
      blocks: [
        {
          type: 'p',
          text:
            '**1.1.** A **MedConnect** é uma plataforma tecnológica de intermediação digital que aproxima pacientes portadores de receitas médicas de farmácias de manipulação legalmente constituídas, autorizadas pela ANVISA e pelos respectivos Conselhos Regionais de Farmácia (CRF).',
        },
        {
          type: 'p',
          text:
            '**1.2. A MedConnect não é uma farmácia de manipulação.** A plataforma não fabrica, não manipula, não altera fórmulas, não armazena medicamentos físicos e não prescreve qualquer substância terapêutica. A responsabilidade técnica pela avaliação da receita, farmacotécnica, controle de qualidade dos insumos e dispensação é **exclusiva da farmácia de manipulação credenciada** e de seu farmacêutico responsável técnico.',
        },
      ],
    },
    {
      id: 'cadastro',
      title: '2. Cadastro e segurança da conta do paciente',
      blocks: [
        {
          type: 'p',
          text:
            '**2.1.** O cadastro na plataforma exige o fornecimento de dados verdadeiros, exatos e atualizados (nome completo, e-mail, telefone, endereço residencial para entrega e CPF).',
        },
        {
          type: 'p',
          text:
            '**2.2.** A guarda da senha de acesso é de inteira responsabilidade do paciente. Em caso de extravio ou suspeita de uso indevido da conta, o paciente deve comunicar imediatamente o [atendimento da MedConnect](/help#contato) e redefinir suas credenciais.',
        },
        {
          type: 'p',
          text: '**2.3.** Não é permitida a criação de múltiplas contas pelo mesmo titular com CPFs divergentes.',
        },
      ],
    },
    {
      id: 'envio-de-receitas',
      title: '3. Envio de receitas médicas e consentimento de saúde',
      blocks: [
        {
          type: 'p',
          text:
            '**3.1.** Ao enviar uma cópia ou foto de receita médica na plataforma, o paciente declara, sob as penas da lei, que o documento é autêntico, íntegro e foi emitido por profissional de saúde legalmente habilitado (médico, médico veterinário ou cirurgião-dentista).',
        },
        {
          type: 'p',
          text:
            '**3.2. Consentimento específico e destacado (LGPD, art. 11, I).** O paciente deve marcar expressamente a caixa de consentimento informando que compreende e autoriza que a receita médica (dado sensível de saúde) seja disponibilizada para visualização pelas farmácias credenciadas exclusivamente para fins de cotação e manipulação. Sem esse consentimento ativo, o sistema recusa tecnicamente o envio da prescrição.',
        },
        {
          type: 'p',
          text:
            '**3.3. Medicamentos controlados (Portaria SVS/MS nº 344/1998).** A plataforma e as farmácias parceiras devem seguir rigorosamente as determinações da ANVISA sobre notificações de receita física retida (receitas azul, amarela ou de controle especial). A cotação inicial pela plataforma não dispensa a apresentação e a retenção física da via original da receita pelo portador ou mensageiro no ato da entrega, conforme orientação do farmacêutico responsável.',
        },
      ],
    },
    {
      id: 'cotacoes',
      title: '4. Cotações, propostas e contratação',
      blocks: [
        {
          type: 'p',
          text:
            '**4.1.** As propostas enviadas pelas farmácias na plataforma são ofertas vinculantes durante o prazo de sua validade, contemplando o preço total (em moeda corrente nacional) e o prazo estimado de manipulação e entrega em dias úteis.',
        },
        {
          type: 'p',
          text:
            '**4.2.** O paciente é livre para comparar as cotações com base em critérios de preço, prazo de entrega, proximidade e avaliações de outros usuários, selecionando a farmácia de sua conveniência.',
        },
        {
          type: 'p',
          text:
            '**4.3.** Ao aceitar um orçamento, é gerado um pedido vinculante, cujas obrigações de produção, manipulação de acordo com o Formulário Nacional e a Farmacopeia Brasileira e entrega em domicílio passam a ser assumidas pela farmácia escolhida.',
        },
      ],
    },
    {
      id: 'responsabilidade-tecnica',
      title: '5. Responsabilidade técnica, garantias e devoluções',
      blocks: [
        { type: 'p', text: '**5.1.** A farmácia de manipulação parceira é integralmente responsável por:' },
        {
          type: 'ul',
          items: [
            'avaliar a compatibilidade farmacotécnica e as dosagens da prescrição;',
            'contatar o prescritor em caso de dúvida técnica ou incompatibilidade química;',
            'embalar e rotular o produto manipulado com a identificação do paciente, número do lote, data de fabricação, prazo de validade e CRF do responsável técnico (RDC ANVISA nº 67/2007);',
            'cumprir o Código de Defesa do Consumidor (Lei nº 8.078/1990) no tocante a prazos, avarias no transporte ou desconformidade com a fórmula prescrita.',
          ],
        },
        {
          type: 'p',
          text:
            '**5.2.** Em razão da natureza personalizada do medicamento magistral (manipulado exclusivamente para o quadro clínico individual do paciente), regras especiais de direito de arrependimento podem se aplicar, conforme o entendimento da ANVISA e dos órgãos de defesa do consumidor (PROCON).',
        },
      ],
    },
    {
      id: 'privacidade',
      title: '6. Privacidade, auditoria e direitos do titular',
      blocks: [
        {
          type: 'p',
          text:
            '**6.1.** O tratamento de dados pessoais no âmbito da plataforma obedece à [Política de Privacidade](/privacy) da MedConnect e à LGPD.',
        },
        { type: 'p', text: '**6.2.** O paciente pode, a qualquer momento, pelo [Centro de Privacidade](/privacy-center):' },
        {
          type: 'ul',
          items: [
            '**Exportar seus dados**: gerar arquivo estruturado em JSON com seu histórico cadastral, prescrições e pedidos;',
            '**Revogar o consentimento**: a revogação do consentimento bloqueia o envio de novas prescrições e as cotações ativas;',
            '**Solicitar a exclusão ou anonimização**: a exclusão anonimiza os dados cadastrais, ressalvada a obrigação legal da plataforma e das farmácias de reter documentos fiscais e prescrições já dispensadas por 5 (cinco) anos, para cumprimento de dever sanitário (LGPD, art. 16, I).',
          ],
        },
      ],
    },
    {
      id: 'penalidades',
      title: '7. Penalidades e suspensão de conta',
      blocks: [
        { type: 'p', text: 'A MedConnect reserva-se o direito de suspender ou cancelar o acesso de usuários que:' },
        {
          type: 'ul',
          items: [
            'inserirem receitas médicas sabidamente falsificadas, adulteradas ou de terceiros sem autorização;',
            'utilizarem a plataforma para fins ilícitos, desvio de medicamentos controlados ou revenda de manipulados;',
            'praticarem ofensas, assédio ou condutas incompatíveis nos campos de avaliação ou na comunicação com as farmácias.',
          ],
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
            'Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de domicílio do consumidor ou a comarca da capital do estado para dirimir eventuais litígios oriundos deste instrumento.',
        },
      ],
    },
  ],
};
