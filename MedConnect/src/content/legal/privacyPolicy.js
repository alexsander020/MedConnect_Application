import { LEGAL_VERSION, LEGAL_UPDATED_AT } from './meta';

/**
 * Política de Privacidade — conversão estruturada de docs/lgpd/politica-de-privacidade.md.
 * Removidos do texto exibido: o aviso interno aos revisores e as marcações de pendência jurídica
 * (a página exibe, no topo, o aviso de versão preliminar em revisão).
 *
 * Formatação inline aceita nos textos: **negrito** e [rótulo](/rota).
 */
export const privacyPolicy = {
  key: 'privacy',
  eyebrow: 'Privacidade e LGPD',
  title: 'Política de Privacidade e Proteção de Dados Pessoais',
  summary:
    'Como a MedConnect coleta, usa, guarda, compartilha e protege os seus dados — em especial os dados de saúde que aparecem nas receitas.',
  version: LEGAL_VERSION,
  updatedAt: LEGAL_UPDATED_AT,
  sections: [
    {
      id: 'apresentacao',
      title: '1. Apresentação e quem somos',
      blocks: [
        {
          type: 'p',
          text:
            'A **MedConnect Intermediação de Serviços Farmacêuticos Ltda.** (sociedade em estruturação, doravante "MedConnect", "nós" ou "Plataforma") tem como missão conectar pacientes a farmácias de manipulação legalmente regularizadas, simplificando o processo de cotação de receitas médicas, aceitação de propostas e acompanhamento da manipulação e entrega de medicamentos magistrais.',
        },
        {
          type: 'p',
          text:
            'Reconhecemos a extrema sensibilidade das informações que você compartilha conosco, em especial **dados pessoais sobre sua saúde** contidos em receitas médicas. Esta Política explica com clareza como coletamos, usamos, armazenamos, compartilhamos e protegemos seus dados, nos termos da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD).',
        },
      ],
    },
    {
      id: 'conceitos',
      title: '2. Conceitos importantes (art. 5º da LGPD)',
      blocks: [
        {
          type: 'ul',
          items: [
            '**Titular**: você, pessoa natural a quem se referem os dados pessoais tratados na plataforma (pacientes ou representantes de farmácias).',
            '**Dado pessoal**: qualquer informação relacionada a pessoa natural identificada ou identificável (ex.: nome, CPF, e-mail, endereço).',
            '**Dado pessoal sensível**: dado sobre saúde, vida sexual, dado genético ou biométrico, convicção religiosa etc. No caso da MedConnect, as **receitas médicas** e os tratamentos nelas prescritos constituem dados pessoais sensíveis de saúde.',
            '**Controlador**: pessoa física ou jurídica a quem competem as decisões sobre o tratamento de dados pessoais.',
            '**Operador**: pessoa física ou jurídica que realiza o tratamento de dados em nome do controlador.',
            '**Encarregado (DPO)**: canal de comunicação entre o controlador, os titulares e a Autoridade Nacional de Proteção de Dados (ANPD).',
          ],
        },
      ],
    },
    {
      id: 'dados-coletados',
      title: '3. Dados que coletamos e suas finalidades',
      blocks: [
        { type: 'h3', id: 'dados-cadastrais', text: '3.1 Dados cadastrais e de identificação' },
        {
          type: 'ul',
          items: [
            '**Dados coletados**: nome completo, endereço de e-mail, número de telefone celular, endereço completo para entrega e CPF (criptografado em repouso).',
            '**Finalidade**: criar e autenticar sua conta, viabilizar a entrega dos medicamentos manipulados em sua residência e permitir a emissão de notas fiscais pela farmácia.',
            '**Base legal sugerida**: execução de contrato ou de procedimentos preliminares (art. 7º, V) e cumprimento de obrigação legal ou fiscal (art. 7º, II).',
          ],
        },
        { type: 'h3', id: 'dados-de-saude', text: '3.2 Dados de saúde (receitas médicas) — dados sensíveis' },
        {
          type: 'ul',
          items: [
            '**Dados coletados**: arquivo digitalizado ou foto da receita médica, nome do médico prescritor, registro no CRM, medicamentos, ativos, posologia e instruções de uso.',
            '**Finalidade**: permitir que farmácias credenciadas avaliem a viabilidade técnica da manipulação, calculem o orçamento e manipulem o medicamento com base na prescrição.',
            '**Base legal sugerida**: consentimento específico e destacado do titular para finalidades determinadas (art. 11, I), cumulado com a tutela da saúde (art. 11, II, "f").',
          ],
        },
        {
          type: 'callout',
          title: 'Proibição de comercialização',
          text:
            'A MedConnect **nunca vende, licencia ou comercializa dados de saúde** para indústrias farmacêuticas, empresas de marketing ou seguradoras. É vedada qualquer prática contrária ao art. 11, § 4º, da LGPD.',
        },
        { type: 'h3', id: 'dados-tecnicos', text: '3.3 Dados técnicos de navegação e auditoria' },
        {
          type: 'ul',
          items: [
            '**Dados coletados**: endereço IP, data e hora de acessos, registros de acesso e download de receitas, histórico de alterações cadastrais e registros de segurança (trilha de auditoria).',
            '**Finalidade**: proteger a plataforma contra fraudes e invasões, cumprir a obrigação legal de guarda de registros de conexão e manter a rastreabilidade de quem acessou cada prescrição.',
            '**Base legal sugerida**: cumprimento de obrigação legal (Marco Civil da Internet, Lei nº 12.965/2014, art. 15) e legítimo interesse de segurança (art. 7º, IX).',
          ],
        },
      ],
    },
    {
      id: 'compartilhamento',
      title: '4. Com quem compartilhamos seus dados',
      blocks: [
        { type: 'p', text: 'Seus dados são compartilhados apenas na medida estritamente necessária para a prestação dos serviços:' },
        {
          type: 'ol',
          items: [
            '**Farmácias de manipulação credenciadas** — **na fase de cotação**, a farmácia acessa a receita médica para analisar a fórmula e informar o preço; o acesso é monitorado e registrado em auditoria. **Após o aceite do orçamento**, a farmácia escolhida recebe seu nome, telefone e endereço para fins de rotulagem regulatória do medicamento, faturamento e entrega.',
            '**Provedores de infraestrutura e tecnologia (operadores)** — serviços de hospedagem em nuvem, bancos de dados em nuvem e provedores de envio de e-mails transacionais, todos vinculados a cláusulas contratuais de sigilo e de proteção de dados.',
            '**Autoridades governamentais e regulatórias** — ANVISA, vigilâncias sanitárias locais, conselhos de classe (CRF/CFM) e Poder Judiciário, mediante ordem judicial ou determinação legal expressa.',
          ],
        },
      ],
    },
    {
      id: 'seguranca',
      title: '5. Medidas de segurança e criptografia',
      blocks: [
        { type: 'p', text: 'Adotamos as seguintes medidas de segurança da informação (art. 46 da LGPD):' },
        {
          type: 'ul',
          items: [
            '**Criptografia em repouso**: campos sensíveis como CPF, telefone e endereço residencial são armazenados criptografados com o algoritmo **AES-256-GCM**, com chaves de 256 bits segregadas em variáveis protegidas e rotacionadas periodicamente.',
            '**Criptografia em trânsito**: as comunicações entre o seu navegador e nossos servidores ocorrem sob protocolo criptográfico TLS 1.3 (HTTPS).',
            '**Trilha de auditoria imutável**: mantemos um registro de auditoria protegido contra alterações ou exclusões, que documenta os acessos operacionais a prescrições e a dados de contato de pacientes.',
            '**Controle de acesso baseado em perfis**: somente usuários autenticados e autorizados têm acesso pontual aos dados indispensáveis para o exercício de suas funções.',
          ],
        },
      ],
    },
    {
      id: 'direitos',
      title: '6. Seus direitos como titular (art. 18 da LGPD)',
      blocks: [
        {
          type: 'p',
          text:
            'Você tem os seguintes direitos, que podem ser exercidos diretamente no [Centro de Privacidade](/privacy-center) da sua conta ou pelo nosso [canal de atendimento](/help?category=PRIVACY#contato):',
        },
        {
          type: 'ol',
          items: [
            '**Confirmação e acesso**: saber se tratamos seus dados e quais dados mantemos a seu respeito.',
            '**Exportação e portabilidade**: obter uma cópia estruturada, em formato interoperável (JSON), dos seus dados cadastrais, receitas enviadas e pedidos realizados, pela opção de exportação do Centro de Privacidade.',
            '**Correção**: corrigir dados incompletos, inexatos ou desatualizados nas opções da sua conta.',
            '**Revogação do consentimento**: revogar a qualquer momento a autorização para o tratamento dos seus dados de saúde, pelo Centro de Privacidade. A revogação bloqueia imediatamente novos envios de receitas.',
            '**Eliminação e anonimização**: solicitar a exclusão definitiva ou a anonimização dos seus dados pessoais cadastrais.',
          ],
        },
        {
          type: 'callout',
          title: 'Ressalva de conservação sanitária e legal',
          text:
            'Conforme o art. 16, I, da LGPD, a MedConnect e as farmácias parceiras poderão ser obrigadas por lei a conservar determinadas informações (como cópias de receitas já dispensadas e notas fiscais de pedidos concluídos) pelo prazo mínimo de 5 (cinco) anos, para atendimento à fiscalização sanitária da ANVISA (RDC nº 67/2007) e defesa em processos, mesmo após a solicitação de exclusão da conta.',
        },
      ],
    },
    {
      id: 'retencao',
      title: '7. Retenção e descarte de dados',
      blocks: [
        { type: 'p', text: 'Os dados pessoais são conservados enquanto você mantiver uma conta ativa na MedConnect. Após o encerramento da conta:' },
        {
          type: 'ul',
          items: [
            'dados cadastrais diretos são anonimizados de forma irreversível;',
            'registros de acesso ao sistema são guardados pelo prazo mínimo de 6 (seis) meses (Marco Civil da Internet);',
            'documentos fiscais e registros de fórmulas já dispensadas são mantidos em arquivo seguro pelo prazo legal de 5 (cinco) anos, findo o qual são destruídos com segurança.',
          ],
        },
      ],
    },
    {
      id: 'encarregado',
      title: '8. Contato do encarregado pelo tratamento de dados (DPO)',
      blocks: [
        {
          type: 'p',
          text:
            'Para exercer seus direitos, esclarecer dúvidas sobre esta Política ou relatar qualquer preocupação de privacidade, entre em contato com o nosso encarregado de dados:',
        },
        {
          type: 'ul',
          items: [
            '**Encarregado (DPO)**: [Nome a designar]',
            '**E-mail de contato**: dpo@medconnect.com.br',
            '**Formulário de atendimento**: [fale com a gente](/help?category=PRIVACY#contato) escolhendo o assunto "Privacidade e dados (LGPD)" — cada solicitação recebe um número de protocolo.',
            '**Endereço**: [Endereço da sede a preencher]',
          ],
        },
      ],
    },
    {
      id: 'atualizacoes',
      title: '9. Atualizações desta Política',
      blocks: [
        {
          type: 'p',
          text:
            'Esta Política de Privacidade poderá ser atualizada periodicamente para refletir melhorias no sistema ou exigências regulatórias da ANPD. Sempre que houver alteração material relevante, você será notificado com destaque em sua próxima visita à plataforma.',
        },
      ],
    },
  ],
};
