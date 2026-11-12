# RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA
# Termos e Condições Gerais de Uso para Pacientes e Tutores — Plataforma MedConnect

> **AVISO LEGAL OBRIGATÓRIO:**
> **RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA.**
> Este documento é uma minuta de natureza técnica e operacional elaborada pela equipe de engenharia de software da MedConnect, contemplando os fluxos para pacientes humanos e tutores de animais (vertical veterinária). Os autores **NÃO são advogados**. Todas as cláusulas, limitações de responsabilidade, regras de medicamentos veterinários controlados e fluxos comerciais devem ser submetidos à **REVISÃO E HOMOLOGAÇÃO JURÍDICA FORMAL** por advogado especializado em Direito Sanitário, Direito do Consumidor, Direito Digital e Legislação do MAPA/CRMV antes de entrarem em vigor.

---

## 1. Natureza do Serviço e Papel da MedConnect

1.1. A **MedConnect** é uma plataforma tecnológica de intermediação digital que aproxima:
- Pacientes portadores de receitas médicas a farmácias de manipulação humana autorizadas pela ANVISA e pelos Conselhos Regionais de Farmácia (CRF);
- Tutores de animais portadores de receitas veterinárias a farmácias de manipulação veterinária legalmente registradas perante o Ministério da Agricultura e Pecuária (MAPA) e os Conselhos Regionais de Medicina Veterinária (CRMV).

1.2. **A MEDCONNECT NÃO É UMA FARMÁCIA DE MANIPULAÇÃO NEM UMA CLÍNICA VETERINÁRIA**. A plataforma não fabrica, não manipula, não altera fórmulas, não armazena medicamentos físicos e não prescreve qualquer substância terapêutica. A responsabilidade técnica pela avaliação da receita, farmacotécnica, controle de qualidade dos insumos e dispensação é **exclusiva da farmácia de manipulação credenciada** e de seu Responsável Técnico legalmente habilitado.

1.3. **NÃO SUBSTITUIÇÃO DE CONSULTA MÉDICA OU VETERINÁRIA**: O uso da MedConnect não substitui, em hipótese alguma, o diagnóstico clínico, a prescrição médica ou o atendimento veterinário presencial. O tutor ou paciente deve sempre consultar profissionais de saúde habilitados antes de administrar qualquer preparação.

---

## 2. Cadastro e Segurança da Conta do Usuário (Paciente ou Tutor)

2.1. O cadastro na plataforma exige o fornecimento de dados verdadeiros, exatos e atualizados (nome completo, e-mail, telefone, endereço residencial para entrega e CPF).

2.2. A guarda da senha de acesso é de inteira responsabilidade do usuário. Em caso de extravio ou suspeita de uso indevido da conta, o usuário deve comunicar imediatamente o suporte da MedConnect e redefinir suas credenciais.

2.3. Não é permitida a criação de múltiplas contas pelo mesmo titular com CPFs divergentes.

---

## 3. Envio de Receitas Médicas e Consentimento de Saúde

3.1. Ao submeter uma cópia ou foto de receita médica na plataforma, o paciente declara sob as penas da lei que o documento é autêntico, íntegro e foi emitido por profissional de saúde legalmente habilitado (médico ou cirurgião-dentista).

3.2. **Consentimento Específico e Destacado (LGPD Art. 11, I)**:
O paciente deve manifestar consentimento específico informando que compreende e autoriza que a receita médica (dado sensível de saúde) seja disponibilizada para visualização pelas farmácias credenciadas exclusivamente para fins de cotação e manipulação. Sem este consentimento ativo, o sistema bloqueia tecnicamente o envio da prescrição.

3.3. **Medicamentos Controlados Humanos (Portaria SVS/MS nº 344/1998)**:
A cotação inicial pela plataforma não dispensa a apresentação e retenção física da via original da Notificação de Receita no ato da entrega, conforme determinação da ANVISA.

---

## 4. Regras Especiais para a Vertical Veterinária (Tutores e Animais)

4.1. **Declaração de Tutoria Legal**:
Ao cadastrar um animal na seção "Meus Pets" (`/my-pets`), o usuário declara ser o proprietário, guardião ou tutor legal do animal, respondendo civil e administrativamente pela veracidade das informações fornecidas (nome, espécie, raça, idade e peso exato em gramas).

4.2. **Receita Veterinária e Prescritor Habilitado**:
- Toda solicitação de cotação veterinária exige o envio de receita assinada por Médico Veterinário com inscrição ativa no Conselho Regional de Medicina Veterinária (CRMV) da Unidade da Federação competente.
- O tutor deve informar com exatidão o nome do prescritor, número do CRMV e UF, os quais serão validados formalmente pelo sistema e pela farmácia manipuladora.

4.3. **Animais de Produção e Destinados à Alimentação Humana**:
- O tutor deve declarar expressamente se o animal se destina à produção pecuária, consumo de carne, leite, ovos ou subprodutos alimentares (`isFoodProducing`).
- Caso a funcionalidade de animais de produção esteja desativada na plataforma (`VET_ALLOW_FOOD_PRODUCING=false`), a solicitação será automaticamente rejeitada pelo sistema, a fim de mitigar riscos sanitários de resíduos em alimentos e observância obrigatória de período de carência do MAPA.

4.4. **Medicamentos Veterinários de Controle Especial (SIPEAGRO/MAPA)**:
- Prescrições sujeitas a Notificação de Receita Veterinária do MAPA exigem o preenchimento do número oficial da notificação e serão sinalizadas com alerta de **conferência manual obrigatória**.
- A cotação e aceite eletrônico não dispensam a **retenção física da via original da Notificação de Receita Veterinária** pela farmácia manipuladora no ato da entrega do medicamento ao tutor.

---

## 5. Cotações, Propostas e Contratação

5.1. As propostas orçamentárias enviadas pelas farmácias na plataforma são ofertas vinculantes durante o prazo de sua validade, contemplando o preço total (em centavos de real), forma farmacêutica (quando vet: biscoito, pasta, suspensão), aroma/sabor e prazo estimado de manipulação e entrega em dias úteis.

5.2. O paciente ou tutor é livre para comparar as cotações com base em critérios de preço, prazo de entrega, proximidade e avaliações de outros usuários, selecionando a farmácia de sua conveniência.

5.3. Ao aceitar um orçamento, é gerado um pedido vinculante (`Order`), cujas obrigações de manipulação magistral e entrega em domicílio passam a ser assumidas pela farmácia aceita.

---

## 6. Responsabilidade Técnica, Garantias e Devoluções

6.1. A farmácia de manipulação parceira é integralmente responsável por:
- Avaliar a compatibilidade farmacotécnica e dosagens da prescrição humana ou veterinária;
- Contatar o médico ou médico veterinário prescritor em caso de dúvida técnica ou incompatibilidade química;
- Embalar e rotular o produto manipulado com a identificação do paciente ou do pet/tutor, número do lote, data de fabricação, prazo de validade e registro profissional do Responsável Técnico (ANVISA RDC nº 67/2007 ou MAPA Decreto nº 5.053/2004);
- Cumprir o Código de Defesa do Consumidor (Lei nº 8.078/1990) no tocante a prazos, avarias no transporte ou desconformidade com a fórmula prescrita.

6.2. Em razão da natureza personalizada e sob medida do medicamento magistral, regras especiais de direito de arrependimento podem se aplicar conforme entendimento sanitário `[PENDENTE DE VALIDAÇÃO JURÍDICA]`.

---

## 7. Privacidade, Auditoria e Direitos do Titular

7.1. O tratamento de dados pessoais no âmbito da plataforma obedece estritamente à Política de Privacidade da MedConnect e à LGPD.

7.2. O titular pode a qualquer momento:
- **Exportar seus dados**: Gerar arquivo estruturado em JSON contendo seu histórico cadastral, dados dos pets cadastrados, prescrições e pedidos;
- **Revogar o consentimento**: A revogação do consentimento bloqueia o envio de novas prescrições e cotações ativas;
- **Solicitar a exclusão/anonimização**: A exclusão anonimiza os dados cadastrais e os animais a eles vinculados, ressalvada a obrigação legal da plataforma e das farmácias de reter documentos fiscais e prescrições já dispensadas por 5 anos para cumprimento de dever sanitário perante ANVISA e MAPA (LGPD Art. 16, I) `[PENDENTE DE VALIDAÇÃO JURÍDICA]`.
