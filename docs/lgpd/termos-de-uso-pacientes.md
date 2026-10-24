# RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA
# Termos e Condições Gerais de Uso para Pacientes — Plataforma MedConnect

> **AVISO LEGAL OBRIGATÓRIO:**
> Este documento é uma minuta de natureza técnica e operacional elaborada pela equipe de engenharia de software da MedConnect. Os autores **NÃO são advogados**. Todas as cláusulas, limitações de responsabilidade, regras de medicamentos controlados e fluxos comerciais devem ser submetidos à **REVISÃO E HOMOLOGAÇÃO JURÍDICA FORMAL** por advogado especializado em Direito Sanitário, Direito do Consumidor e Direito Digital antes de entrarem em vigor.

---

## 1. Natureza do Serviço e Papel da MedConnect

1.1. A **MedConnect** é uma plataforma tecnológica de intermediação digital que aproxima pacientes portadores de receitas médicas a farmácias de manipulação legalmente constituídas, autorizadas pela ANVISA e pelos respectivos Conselhos Regionais de Farmácia (CRF).

1.2. **A MEDCONNECT NÃO É UMA FARMÁCIA DE MANIPULAÇÃO**. A plataforma não fabrica, não manipula, não altera fórmulas, não armazena medicamentos físicos e não prescreve qualquer substância terapêutica. A responsabilidade técnica pela avaliação da receita, farmacotécnica, controle de qualidade dos insumos e dispensação é **exclusiva da farmácia de manipulação credenciada** e de seu Farmacêutico Responsável Técnico.

---

## 2. Cadastro e Segurança da Conta do Paciente

2.1. O cadastro na plataforma exige o fornecimento de dados verdadeiros, exatos e atualizados (nome completo, e-mail, telefone, endereço residencial para entrega e CPF).

2.2. A guarda da senha de acesso é de inteira responsabilidade do paciente. Em caso de extravio ou suspeita de uso indevido da conta, o paciente deve comunicar imediatamente o suporte da MedConnect e redefinir suas credenciais.

2.3. Não é permitida a criação de múltiplas contas pelo mesmo titular com CPFs divergentes.

---

## 3. Envio de Receitas Médicas e Consentimento de Saúde

3.1. Ao submeter uma cópia ou foto de receita médica na plataforma, o paciente declara sob as penas da lei que o documento é autêntico, íntegro e foi emitido por profissional de saúde legalmente habilitado (médico, médico veterinário ou cirurgião-dentista).

3.2. **Consentimento Específico e Destacado (LGPD Art. 11, I)**:
O paciente deve marcar expressamente a caixa de consentimento informando que compreende e autoriza que a receita médica (dado sensível de saúde) seja disponibilizada para visualização pelas farmácias credenciadas exclusivamente para fins de cotação e manipulação.
Sem este consentimento ativo, o sistema recusa tecnicamente o upload da prescrição (`HTTP 403 CONSENT_REQUIRED`).

3.3. **Medicamentos Controlados (Portaria SVS/MS nº 344/1998) `[PENDENTE DE VALIDAÇÃO JURÍDICA]`**:
A plataforma e as farmácias parceiras devem seguir rigorosamente as determinações da ANVISA sobre notificações de receita física retida (Receitas Azul, Amarela ou de Controle Especial). A cotação inicial pela plataforma não dispensa a apresentação e retenção física da via original da receita pelo portador ou mensageiro no ato da entrega, conforme orientação do Farmacêutico Responsável.

---

## 4. Cotações, Propostas e Contratação

4.1. As propostas orçamentárias enviadas pelas farmácias na plataforma são ofertas vinculantes durante o prazo de sua validade, contemplando o preço total (em moeda corrente nacional) e o prazo estimado de manipulação e entrega em dias úteis.

4.2. O paciente é livre para comparar as cotações com base em critérios de preço, prazo de entrega, raio de proximidade e avaliações de outros usuários, selecionando a farmácia de sua conveniência.

4.3. Ao aceitar um orçamento, é gerado um pedido vinculante (`Order`), cujas obrigações de produção, manipulação de acordo com o Formulário Nacional/Farmacopeia Brasileira e entrega em domicílio passam a ser assumidas pela farmácia aceita.

---

## 5. Responsabilidade Técnica, Garantias e Devoluções

5.1. A farmácia de manipulação parceira é integralmente responsável por:
- Avaliar a compatibilidade farmacotécnica e dosagens da prescrição;
- Contatar o prescritor em caso de dúvida técnica ou incompatibilidade química;
- Embalar e rotular o produto manipulado com a identificação do paciente, número do lote, data de fabricação, prazo de validade e CRF do Responsável Técnico (RDC ANVISA nº 67/2007);
- Cumprir o Código de Defesa do Consumidor (Lei nº 8.078/1990) no tocante a prazos, avarias no transporte ou desconformidade com a fórmula prescrita.

5.2. Em razão da natureza personalizada e sob medida do medicamento magistral (manipulado exclusivamente para o quadro clínico individual do paciente), regras especiais de direito de arrependimento podem se aplicar conforme entendimento da ANVISA e do PROCON `[PENDENTE DE VALIDAÇÃO JURÍDICA]`.

---

## 6. Privacidade, Auditoria e Direitos do Titular

6.1. O tratamento de dados pessoais no âmbito da plataforma obedece estritamente à Política de Privacidade da MedConnect e à LGPD.

6.2. O paciente pode a qualquer momento:
- **Exportar seus dados**: Gerar arquivo estruturado em JSON contendo seu histórico cadastral, prescrições e pedidos;
- **Revogar o consentimento**: A revogação do consentimento nas configurações bloqueia o envio de novas prescrições e cotações ativas;
- **Solicitar a exclusão/anonimização**: A exclusão anonimiza os dados cadastrais, ressalvada a obrigação legal da plataforma e das farmácias de reter documentos fiscais e prescrições já dispensadas por 5 anos para cumprimento de dever sanitário (LGPD Art. 16, I) `[PENDENTE DE VALIDAÇÃO JURÍDICA]`.

---

## 7. Penalidades e Suspensão de Conta

A MedConnect reserva-se o direito de suspender ou cancelar o acesso de usuários que:
- Inserirem receitas médicas sabidamente falsificadas, adulteradas ou de terceiros sem autorização;
- Utilizarem a plataforma para fins ilícitos, desvios de medicamentos controlados ou revenda de manipulados;
- Praticarem ofensas, assédio ou condutas incompatíveis nos campos de avaliação ou comunicação com as farmácias.

---

## 8. Foro de Eleição `[PENDENTE DE VALIDAÇÃO JURÍDICA]`

Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de domicílio do consumidor ou a comarca da capital do estado para dirimir eventuais litígios oriundos deste instrumento.

*Versão: 1.0.0 (Rascunho Técnico)*  
*Última atualização: 24 de Outubro de 2026*
