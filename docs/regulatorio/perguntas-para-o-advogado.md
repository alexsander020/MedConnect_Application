# Perguntas para o Parecer Jurídico Especializado (Saúde, Regulação Sanitária e Proteção de Dados)

> **DIRETRIZ EDITORIAL E DISCLAIMER:**
> Este documento organiza exclusivamente **perguntas objetivas e estruturadas** a serem submetidas a um advogado especialista em Direito Sanitário, Farmacêutico e Regulatório (ANVISA / CFM / CFF) e Direito Digital.
> Conforme orientação expressa, **a equipe técnica NÃO respondeu a nenhuma dessas perguntas**, abstendo-se de fazer juízos de valor legais. O objetivo deste questionário é municiar a assessoria jurídica externa com todos os cenários operacionais e tecnológicos reais da plataforma MedConnect.

---

## Bloco 1: Validade Jurídica e Formatos de Receitas Médicas (Física vs. Digital)

1.1. **Receita Digitalizada (Foto/Scan) vs. Receita Nativa Digital**:
- Qual é o valor probatório e a validade jurídica de um upload feito pelo paciente contendo foto (JPEG/PNG) ou PDF simples de uma receita emitida originalmente em papel físico (sem assinatura digital ICP-Brasil)?
- A farmácia de manipulação credenciada pode manipular o medicamento com base apenas na imagem digitalizada da receita comum enviada pela plataforma, ou há obrigatoriedade legal de exigir e recolher a via física original antes ou no momento da entrega?

1.2. **Receitas Digitais com Assinatura Eletrônica (ICP-Brasil)**:
- Para receitas emitidas em plataformas de telemedicina assinadas com certificado digital ICP-Brasil (padrão ITI): qual é o procedimento sanitário e regulatório exigido para que a farmácia valide a integridade, dispense a fórmula e realize a respectiva "baixa" ou anotação de dispensação no arquivo digital, impedindo que o paciente envie a mesma receita digital para múltiplas farmácias simultaneamente?
- A MedConnect pode (ou deve) integrar validadores oficiais (ex: validador.iti.gov.br) em seu backend para checagem automatizada no ato do upload?

1.3. **Prazos e Guarda Sanitária de Receitas**:
- Qual é o prazo exato de retenção legal obrigatória de receitas médicas manipuladas perante a ANVISA e o CFF (RDC 67/2007 fixa 5 anos)?
- Como conciliar formalmente esse dever de guarda sanitária de 5 anos com a requisição de exclusão de dados pelo titular com base no Art. 18, VI da LGPD? A ressalva do Art. 16, I da LGPD (cumprimento de obrigação legal/regulatória) blinda a plataforma e a farmácia contra reclamações de retenção indevida?

---

## Bloco 2: Medicamentos Sujeitos a Controle Especial (Portaria SVS/MS nº 344/1998)

2.1. **Viabilidade de Intermediação Online de Substâncias Controladas**:
- É juridicamente permitida a intermediação de orçamentos e cotações online para fórmulas manipuladas contendo substâncias sujeitas a controle especial (listas A1, A2, A3, B1, B2, C1, C2, etc. da Portaria SVS/MS 344/1998 e RDC 44/2009)?
- A mera exibição da receita na tela da farmácia para fins de cálculo de orçamento caracteriza infração sanitária se a fórmula for de controle especial?

2.2. **Logística e Recolhimento de Notificações de Receita (Azul / Amarela / Branca Especial)**:
- Diante da exigência regulatória da retenção física da Notificação de Receita / Receita de Controle Especial pelo estabelecimento farmacêutico, qual é o fluxo juridicamente seguro para a entrega domiciliar:
  a) O entregador terceirizado pode conferir a identidade do paciente e recolher a receita física no ato da entrega?
  b) É indispensável que a farmácia recolha a via física antes de iniciar a pesagem e manipulação no laboratório?
  c) A intermediação de controlados pela plataforma deve ser temporariamente desabilitada por prudência regulatória?

---

## Bloco 3: Intermediação Online de Medicamentos Manipulados e Resoluções da ANVISA

3.1. **Interpretação da RDC ANVISA nº 67/2007 (Anexo I, item 5.14)**:
- O item 5.14 do Anexo I da RDC 67/2007 veda a "captação de receitas contendo prescrições magistrais e oficinais em drogarias, ervanárias e postos de medicamentos, ainda que filiais da mesma empresa". Sob a ótica jurisprudencial e das manifestações mais recentes da ANVISA, a atividade de uma plataforma digital/marketplace de intermediação de cotações entre paciente e farmácia enquadra-se ou é equiparável a essa vedação de "posto de captação"?
- Quais precedentes dos Tribunais Regionais Federais (TRFs) e do Superior Tribunal de Justiça (STJ) tratam da intermediação digital de medicamentos manipulados à luz do princípio constitucional da livre iniciativa e do direito de escolha do consumidor?

3.2. **Comércio Eletrônico de Medicamentos (RDC ANVISA nº 44/2009)**:
- A RDC 44/2009 restringe a venda de medicamentos por meio remoto (internet, telefone) exclusivamente a farmácias ou drogarias abertas ao público, com alvará sanitário e com domínio de site registrado no Brasil. Como a MedConnect se posiciona juridicamente: como mera fornecedora de software/tecnologia (SaaS) ou como agente da cadeia de fornecimento/venda?

---

## Bloco 4: Matriz de Responsabilidade Civil e Consumidor (Plataforma vs. Farmácia)

4.1. **Responsabilidade pelo Produto e Defeito Farmacotécnico**:
- Caso um paciente sofra danos à saúde em decorrência de:
  a) Erro de pesagem ou contaminação microbiológica do manipulado no laboratório da farmácia parceira;
  b) Interação medicamentosa adversa não detectada pelo Farmacêutico Responsável;
  c) Atraso na entrega de medicamento de uso contínuo essencial;
  Qual é a extensão da responsabilidade civil da MedConnect perante o Código de Defesa do Consumidor (CDC, Art. 14, 18 e 34)?
- A plataforma pode ser considerada integrante da cadeia de consumo e responder de forma solidária com a farmácia perante o consumidor final?

4.2. **Eficácia de Cláusulas de Exoneração e Limitação de Responsabilidade**:
- Em que medida as cláusulas de limitação de responsabilidade constantes nos Termos de Uso do Paciente e no Termo de Adesão da Farmácia são juridicamente válidas perante o CDC e a jurisprudência das Câmaras de Direito Privado?

4.3. **Direito de Arrependimento (Art. 49 do CDC) em Medicamentos Manipulados**:
- O direito de arrependimento (devolução em até 7 dias para compras online) aplica-se a formulações magistrais personalizadas que não podem ser reaproveitadas para outros consumidores? Qual a orientação jurídica para a política de cancelamento após o início da manipulação?

---

## Bloco 5: Exigências dos Conselhos Profissionais (ANVISA, CFF e CFM)

5.1. **Conselho Federal de Farmácia (CFF)**:
- Quais resoluções do CFF regulamentam a prestação de serviços farmacêuticos remotos, a teleorientação farmacêutica e o uso de plataformas digitais por estabelecimentos sob jurisdição dos Conselhos Regionais (CRFs)?
- O cadastro e a atuação do Farmacêutico Responsável Técnico na plataforma para fornecer orçamentos e orientações exigem comunicação ou registro prévio junto ao CRF local?

5.2. **Conselho Federal de Medicina (CFM)**:
- Há alguma vedação expressa do CFM (ex: Código de Ética Médica ou Resoluções sobre Telemedicina) que proíba ou limite o compartilhamento de receitas médicas eletrônicas emitidas por médicos em plataformas de cotação por iniciativa do próprio paciente?

---

## Bloco 6: Seguros de Responsabilidade Civil e Riscos Cibernéticos

6.1. **Seguro de Responsabilidade Civil Profissional da Farmácia**:
- É recomendável ou juridicamente prudente exigir que a farmácia de manipulação credenciada comprove a contratação de apólice de Seguro de Responsabilidade Civil Profissional para operações magistrais como requisito de credenciamento na plataforma?

6.2. **Seguro de Riscos Cibernéticos (Cyber Risk) da Plataforma**:
- Considerando o volume de dados pessoais sensíveis de saúde (receitas médicas) tratados e armazenados no banco de dados da MedConnect, qual é a recomendação de cobertura para apólices de seguro contra incidentes de segurança da informação, vazamento de dados (LGPD) e custos de remediação regulatória perante a ANPD?
