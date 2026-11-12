/**
 * Perguntas frequentes da Central de Ajuda (/help).
 * Respostas fiéis ao funcionamento atual do produto. Onde algo depende da farmácia
 * ou ainda está em definição, a resposta diz isso claramente.
 *
 * Cada resposta é uma lista de parágrafos; formatação inline: **negrito** e [rótulo](/rota).
 */
export const HELP_TOPICS = [
  {
    id: 'pacientes',
    label: 'Pacientes',
    description: 'Envio da receita, cotações, escolha e avaliação.',
    items: [
      {
        q: 'Como envio minha receita?',
        a: [
          '[Crie sua conta](/register), autorize o uso da receita para cotação e envie uma foto ou o PDF da receita. Aceitamos arquivos **JPG, PNG ou PDF de até 10 MB**.',
          'Antes de enviar, confira se a imagem está legível e completa — com o nome do prescritor, a data e a assinatura. Os metadados da foto (como localização) são removidos automaticamente.',
        ],
      },
      {
        q: 'A MedConnect é uma farmácia?',
        a: [
          'Não. A MedConnect é uma plataforma que conecta você a farmácias de manipulação credenciadas. A avaliação técnica da receita, a manipulação, a rotulagem e a entrega são responsabilidade da farmácia escolhida e do farmacêutico responsável técnico dela.',
        ],
      },
      {
        q: 'Quanto tempo leva para receber cotações?',
        a: [
          'Depende das farmácias: cada uma analisa a receita no seu ritmo e dentro do próprio horário de funcionamento. Você recebe uma notificação a cada nova cotação.',
          'Fora do horário comercial, as respostas costumam chegar quando as farmácias abrem. No [diretório](/pharmacies) você vê quem está aberto agora.',
        ],
      },
      {
        q: 'Como escolho a melhor cotação?',
        a: [
          'Compare o preço total, o prazo de entrega, as observações da farmácia e as avaliações de outros pacientes. Ao aceitar uma cotação, o pedido é criado e as demais cotações daquela receita são encerradas automaticamente.',
        ],
      },
      {
        q: 'Minha receita é de medicamento controlado. Posso usar a MedConnect?',
        a: [
          'Você pode enviar a receita para cotação, mas as regras da ANVISA continuam valendo: para receitas de controle especial (azul, amarela ou de controle especial), a farmácia pode exigir a **via original** no momento da entrega. Siga a orientação do farmacêutico da farmácia escolhida.',
        ],
      },
      {
        q: 'Como avalio a farmácia?',
        a: [
          'Depois que o pedido é marcado como entregue, você pode dar uma nota de 1 a 5 e deixar um comentário. As avaliações ajudam outros pacientes a escolher.',
        ],
      },
    ],
  },
  {
    id: 'farmacias',
    label: 'Farmácias',
    description: 'Credenciamento, perfil público e gestão de pedidos.',
    items: [
      {
        q: 'Como credencio minha farmácia?',
        a: [
          '[Crie a conta da farmácia](/register?type=pharmacy) com o CNPJ e informe a licença sanitária, a autorização de funcionamento (AFE) e os dados do farmacêutico responsável técnico (nome, CRF e UF). Também é preciso aceitar o [Termo de Adesão](/pharmacy-terms).',
          'A equipe da MedConnect confere os documentos e aprova o credenciamento ou informa o motivo da recusa.',
        ],
      },
      {
        q: 'Quando posso começar a cotar?',
        a: [
          'Somente depois que o credenciamento for aprovado. Até lá, a farmácia não vê as receitas disponíveis para cotação.',
        ],
      },
      {
        q: 'Como informo horários, área de entrega e serviços?',
        a: [
          'No painel da farmácia, em Configurações: horários por dia da semana (com mais de um intervalo, se houver pausa), fuso horário, área de entrega, descrição e serviços. Essas informações aparecem no [diretório público](/pharmacies) e alimentam o indicador "aberta agora".',
        ],
      },
      {
        q: 'Como atualizo o andamento de um pedido?',
        a: [
          'No painel, em Pedidos: marque **Em manipulação**, **Saiu para entrega** e **Entregue** conforme o pedido avança. O paciente acompanha cada mudança ao vivo e recebe uma notificação.',
        ],
      },
      {
        q: 'Quanto custa para a farmácia participar?',
        a: [
          'As condições comerciais ainda estão em definição para a fase de piloto. Se quiser conversar sobre isso, [fale com a gente](/help?category=PHARMACY_ONBOARDING#contato) escolhendo o assunto "Credenciamento de farmácia".',
        ],
      },
    ],
  },
  {
    id: 'privacidade',
    label: 'Privacidade e LGPD',
    description: 'Quem vê seus dados, como exportar, corrigir ou apagar.',
    items: [
      {
        q: 'Quem consegue ver minha receita?',
        a: [
          'A receita é usada apenas para cotação e manipulação, por farmácias credenciadas. Depois que você aceita uma cotação, a farmácia escolhida recebe também seu nome, telefone e endereço, para rotular, faturar e entregar o pedido.',
          'O arquivo fica em armazenamento privado e é aberto por links temporários, que expiram em poucos minutos. Cada acesso fica registrado.',
        ],
      },
      {
        q: 'Que dados a MedConnect coleta?',
        a: [
          'Dados de cadastro (nome, e-mail, telefone, endereço de entrega e CPF — guardado criptografado), a receita que você envia (dado sensível de saúde) e registros técnicos de acesso, usados para segurança e auditoria. Os detalhes estão na [Política de Privacidade](/privacy).',
        ],
      },
      {
        q: 'Vocês vendem ou compartilham meus dados de saúde?',
        a: [
          'Não. A MedConnect não vende, não licencia e não comercializa dados de saúde para indústrias, empresas de marketing ou seguradoras.',
        ],
      },
      {
        q: 'Como exporto, corrijo ou apago meus dados?',
        a: [
          'Com a conta de paciente, use o [Centro de Privacidade](/privacy-center): lá você exporta seus dados em JSON, revoga consentimentos e pode pedir a anonimização da conta. Nome, telefone e endereço podem ser corrigidos no seu perfil.',
          'Algumas informações — como receitas já dispensadas e documentos fiscais — podem precisar ser guardadas pelo prazo exigido pela legislação sanitária, mesmo após o pedido de exclusão.',
        ],
      },
      {
        q: 'O que acontece se eu revogar o consentimento?',
        a: [
          'A partir da revogação, o envio de novas receitas fica bloqueado. Conforme o termo de consentimento, a revogação também dá início ao fluxo de exclusão ou anonimização dos seus dados, respeitados os prazos legais de guarda.',
        ],
      },
      {
        q: 'Como falo com o encarregado de dados (LGPD)?',
        a: [
          'Pelo [formulário de contato](/help?category=PRIVACY#contato), escolhendo o assunto "Privacidade e dados (LGPD)". Sua solicitação recebe um número de protocolo.',
        ],
      },
    ],
  },
  {
    id: 'pagamento-e-entrega',
    label: 'Pagamento e entrega',
    description: 'Como pagar, prazos, áreas atendidas e acompanhamento.',
    items: [
      {
        q: 'Como faço o pagamento?',
        a: [
          'Nesta fase do piloto, a MedConnect **não processa pagamentos** pela plataforma. A forma e o momento do pagamento são definidos pela farmácia escolhida — confirme com ela antes de pagar.',
          'Desconfie de pedidos de pagamento feitos em nome de farmácias por canais que você não reconhece e, na dúvida, [fale com a gente](/help?category=ORDER#contato).',
        ],
      },
      {
        q: 'O valor da cotação pode mudar depois que eu aceito?',
        a: [
          'O valor da cotação é o valor total proposto pela farmácia. As regras de adesão das farmácias proíbem cobrar valores adicionais ou reajustar o preço depois do aceite. Se isso acontecer, [avise o atendimento](/help?category=ORDER#contato).',
        ],
      },
      {
        q: 'O frete está incluído?',
        a: [
          'Depende da farmácia. Confira o valor total e as observações da cotação — é ali que a farmácia informa frete e embalagens especiais, quando houver.',
        ],
      },
      {
        q: 'Onde as farmácias entregam e em quanto tempo?',
        a: [
          'Cada farmácia define a própria área de entrega, que aparece no [diretório](/pharmacies). O prazo vem em cada cotação, em dias, e pode variar conforme a fórmula.',
        ],
      },
      {
        q: 'Como acompanho meu pedido?',
        a: [
          'Em [Meus pedidos](/orders) você vê cada etapa — em manipulação, saiu para entrega e entregue — atualizada ao vivo pela farmácia, e recebe uma notificação a cada mudança.',
        ],
      },
      {
        q: 'Tive um problema com a entrega ou com o produto. E agora?',
        a: [
          'Fale primeiro com a farmácia: ela é a responsável pela manipulação, pela entrega e pelo atendimento ao consumidor. Se não resolver, [abra um atendimento](/help?category=ORDER#contato) com o número do pedido.',
        ],
      },
    ],
  },
];
