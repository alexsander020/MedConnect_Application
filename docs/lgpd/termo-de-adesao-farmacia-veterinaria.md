# RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA
# Termo de Adesão e Compromisso Técnico-Regulatório para a Atividade de Manipulação Veterinária — Plataforma MedConnect

> **AVISO LEGAL OBRIGATÓRIO:**
> **RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA.**
> Este documento é uma minuta de natureza técnica, regulatória e contratual elaborada pela equipe de engenharia da MedConnect. Os autores **NÃO são advogados**. Todas as cláusulas, obrigações sanitárias perante o MAPA, repartição de responsabilidade civil e administrativa, penalidades e procedimentos de auditoria devem ser submetidos à **REVISÃO E HOMOLOGAÇÃO JURÍDICA FORMAL** por advogado especializado em Direito Regulatório Agropecuário (MAPA/CRMV/CFF) antes de sua aplicação a qualquer estabelecimento parceiro. Nenhuma disposição aqui representa garantia ou atestado de conformidade legal definitiva.

---

## 1. Das Partes e do Objeto

1.1. O presente Termo de Adesão e Compromisso Técnico-Regulatório é celebrado entre a **MedConnect Intermediação de Serviços Farmacêuticos Ltda.** (doravante "MEDCONNECT") e a **FARMÁCIA DE MANIPULAÇÃO PARCEIRA** devidamente qualificada no cadastro eletrônico da plataforma (doravante "FARMÁCIA"), tendo por objeto regular as condições técnicas, operacionais e sanitárias para a disponibilização, cotação e manipulação de fórmulas magistrais e oficinais de uso veterinário (`VETERINARY_COMPOUNDING`).

---

## 2. Requisitos Regulatórios e Habilitação Obrigatória perante o MAPA e CRMV

2.1. **Comprovação Documental Prévia**:
Para solicitar e manter ativa a capacidade de manipulação veterinária (`VETERINARY_COMPOUNDING`) na plataforma MedConnect, a FARMÁCIA deve apresentar cópia digitalizada válida, autêntica e legível dos seguintes documentos:
1. **Registro do Estabelecimento no MAPA**: Certidão de registro emitida pelo Ministério da Agricultura e Pecuária (MAPA) autorizando a manipulação de produtos de uso veterinário, nos termos do Decreto Federal nº 5.053/2004 e normas complementares;
2. **Inscrição de Pessoa Jurídica no CRMV**: Certidão de registro e regularidade da empresa perante o Conselho Regional de Medicina Veterinária da respectiva Unidade Federativa;
3. **Responsabilidade Técnica Habilitada**: Indicação formal do Farmacêutico ou Médico Veterinário Responsável Técnico (RT), com apresentação de Certidão de Regularidade Técnica emitida pelo Conselho Regional de Farmácia (CRF) ou CRMV competente.

2.2. **Upload Privado e Segurança das Evidências**:
As evidências documentais submetidas serão armazenadas em repositório privado sob chaves criptográficas (`evidenceFileKeys`), acessíveis exclusivamente por administradores e analistas de compliance da MEDCONNECT por meio de URLs assinadas e temporárias, com registro inalterável de acesso na trilha de auditoria (`AuditLog`).

---

## 3. Responsabilidade Técnica Exclusiva e Dever de Conferência da Receita

3.1. **Responsabilidade Sanitária e Farmacotécnica Indelegável**:
- A FARMÁCIA e seu Responsável Técnico assumem **exclusiva e integral responsabilidade técnica, sanitária, civil e penal** pela:
  a) Verificação da autenticidade da prescrição veterinária, habilitação do médico veterinário prescritor perante o CRMV/CFMV e regularidade formal da receita;
  b) Avaliação de compatibilidade farmacotécnica, cálculo de doses em relação à espécie e peso do animal (em gramas), interações medicamentosas e toxicidade potencial de excipientes específicos para cada espécie animal (ex: toxicidade de xilitol, teobromina ou propilenoglicol para cães e gatos);
  c) Aquisição, controle de qualidade, fracionamento, manipulação e acondicionamento de matérias-primas de grau farmacêutico;
  d) Rotulagem das preparações de acordo com as exigências do MAPA, constando expressamente: nome do tutor, identificação do animal, data de manipulação, prazo de validade, posologia, fórmula detalhada, número de lote interno e identificação do Responsável Técnico com seu registro no conselho de classe.

3.2. **Isenção Técnica da Plataforma**:
A MEDCONNECT atua estritamente como provedora de infraestrutura de tecnologia e canal eletrônico de aproximação, **não possuindo responsabilidade técnica farmacêutica ou veterinária** sobre as fórmulas cotadas, preparadas ou dispensadas.

---

## 4. Medicamentos Veterinários de Controle Especial e Animais de Produção

4.1. **Substâncias Sujeitas a Controle Especial (SIPEAGRO/MAPA)**:
- Em relação a formulações contendo substâncias sujeitas a Notificação de Receita Veterinária do MAPA (anestésicos, sedativos, psicotrópicos, antimicrobianos sujeitos a controle):
  a) A FARMÁCIA obriga-se a realizar a conferência manual rigorosa da notificação antes de iniciar a manipulação (`requiresManualDocumentCheck = true`);
  b) É **expressamente vedada** a entrega do medicamento veterinário manipulado ao tutor sem a **recolha e retenção física da via original da Notificação de Receita Veterinária**, cumprindo rigorosamente os lançamentos no sistema SIPEAGRO e guarda pelo prazo legal estipulado pelo MAPA.

4.2. **Animais Destinados à Cadeia de Consumo Humano (Pecuária / Produção)**:
- A manipulação de fórmulas destinadas a animais de produção de alimentos (bovinos, ovinos, caprinos, suínos, aves de corte/postura, peixes de piscicultura) exige o cumprimento rigoroso de **período de carência sanitária (*withdrawal period*)** para evitar contaminação alimentar por resíduos medicamentosos.
- Salvo ativação explícita da funcionalidade pela MEDCONNECT (`VET_ALLOW_FOOD_PRODUCING=true`), é terminantemente vedada a cotação de fórmulas para animais declarados como de produção, sendo a FARMÁCIA passível de descredenciamento imediato e denúncia ao MAPA em caso de descumprimento.

---

## 5. Proteção de Dados, Privacidade e Sigilo (LGPD)

5.1. **Compromisso de Sigilo e Privacidade por Design**:
- A FARMÁCIA compromete-se a tratar todos os dados de tutores e animais estritamente para os fins de cotação e execução do pedido de manipulação contratado.
- É expressamente vedado o uso de dados de contato do tutor (obtidos após o aceite da cotação) para envio de mensagens promocionais não autorizadas, marketing direto ou compartilhamento com terceiros.
- Antes da aceitação formal da cotação pelo tutor, a FARMÁCIA não tem acesso aos dados de contato (telefone, e-mail e endereço) e compromete-se a não tentar contornar a plataforma para contato direto com o tutor.

---

## 6. Auditoria, Suspensão e Descredenciamento

6.1. **Auditoria Contínua**:
A MEDCONNECT reserva-se o direito de auditar a qualquer momento a regularidade dos documentos comprobatórios das farmácias credenciadas.

6.2. **Suspensão Preventiva**:
- A MEDCONNECT poderá, a seu exclusivo critério ou mediante determinação de autoridades sanitárias (MAPA/CRMV/ANVISA), suspender preventivamente a capacidade veterinária (`status = SUSPENDED`) da FARMÁCIA caso constate:
  a) Vencimento do registro no MAPA, CRMV ou licença sanitária sem tempestiva comprovação de renovação;
  b) Denúncias consistentes de erros posológicos, reações adversas graves em animais ou desvio de substâncias controladas;
  c) Recusa injustificada ou descumprimento reiterado de prazos de entrega acordados.

6.3. **Efeito da Suspensão com Preservação de Direitos**:
A suspensão da capacidade veterinária impede novas cotações e bloqueia a visualização do mural de receitas veterinárias, **mas obriga a FARMÁCIA a concluir com zelo e perfeição todos os pedidos já aceitos e em manipulação**, salvo determinação contrária emanada de autoridade sanitária.
