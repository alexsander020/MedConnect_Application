# RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA
# Consulta Regulatória e Jurídica: Vertical de Manipulação Veterinária — MedConnect

> **AVISO IMPORTANTE / DISCLAIMER LEGAL:**
> **RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA.**
> Este questionário foi formulado exclusivamente pela equipe técnica de engenharia de software da MedConnect. Os autores **NÃO são advogados**. As perguntas a seguir são estritamente objetivas e **NÃO são respondidas neste documento**, servindo como pauta formal de consulta direcionada à assessoria jurídica especializada em Direito Sanitário, Direito Regulatório Agropecuário (MAPA/CFMV/CFF) e Direito Digital. As respostas do advogado constituem **REQUISITO BLOQUEANTE** para a entrada em produção e homologação final da vertical veterinária.

---

## 1. Intermediação Digital e Modelo de Negócio

### (a) Legalidade e Condições da Intermediação de Cotações Veterinárias
1. A legislação federal brasileira (especialmente a Lei nº 5.991/1973, o Decreto nº 5.053/2004 e as normas do MAPA e CFMV) permite a intermediação digital de orçamentos e cotações de medicamentos manipulados veterinários entre tutores e farmácias de manipulação?
2. Quais são os limites legais estritos da atuação da plataforma para que ela não seja caracterizada como estabelecimento farmacêutico, distribuidora de medicamentos ou intermediária ilícita de produtos de uso veterinário?
3. O modelo de cobrança de taxa de conveniência/serviço da plataforma sobre o valor da cotação intermediada possui algum impedimento ético ou regulatório perante o MAPA, CRMV ou CFF?

---

## 2. Prescrição, Receitas e Documentos Oficiais

### (b) Validade, Formato e Retenção de Receitas e Notificações de Receita
1. Qual é o prazo legal de validade de uma receita veterinária magistral comum e de uma Notificação de Receita Veterinária perante as normas do MAPA?
2. O upload digitalizado de uma receita veterinária física (foto ou PDF) é legalmente suficiente para autorizar o início da manipulação pela farmácia, ou é indispensável a posse prévia da via física original?
3. Para receitas emitidas em formato digital com assinatura eletrônica qualificada (ICP-Brasil) pelo médico veterinário, quais são os requisitos de validação obrigatórios que a plataforma ou a farmácia devem aplicar?
4. Qual é o prazo obrigatório de retenção de cópias de receitas veterinárias que a farmácia e a plataforma devem observar perante a fiscalização do MAPA e do CRMV?

---

## 3. Substâncias e Medicamentos Sujeitos a Controle Especial

### (c) Tratamento de Medicamentos Controlados na Plataforma
1. A plataforma digital pode intermediar cotações de medicamentos veterinários contendo substâncias sujeitas a controle especial (psicotrópicos, entorpecentes, antimicrobianos sujeitos a controle especial do MAPA)?
2. A tramitação de Notificações de Receita Veterinária geradas via SIPEAGRO (Sistema Integrado de Produtos e Estabelecimentos Agropecuários do MAPA) impõe alguma responsabilidade solidária à plataforma caso a farmácia dispense o produto sem a retenção física da via oficial?
3. Caso a legislação vede a intermediação de controlados pela internet, a plataforma deve manter a flag `VET_CONTROLLED_ENABLED=false` permanentemente travada em produção?

---

## 4. Animais de Produção e Cadeia de Consumo Humano

### (d) Manipulação para Animais de Produção e Período de Carência
1. É juridicamente permitido a farmácias de manipulação prepararem fórmulas para animais destinados à produção de alimentos (bovinos de corte/leite, suínos, aves de postura/corte, peixes de piscicultura) a partir de solicitações intermediadas por aplicativo?
2. Quais são os riscos de responsabilização civil, sanitária e criminal (inclusive por crime contra a saúde pública — Art. 272 do Código Penal) caso um medicamento manipulado gere resíduos tóxicos em alimentos humanos devido a erro na indicação ou cálculo do período de carência (*withdrawal period*)?
3. É recomendável do ponto de vista de gestão de riscos jurídicos manter o bloqueio técnico absoluto de animais de produção (`VET_ALLOW_FOOD_PRODUCING=false`)?

---

## 5. Produtos Biológicos, Fitoterápicos e Substâncias Vedadas

### (e) Restrições Materiais e Substâncias Proibidas pelo MAPA
1. Quais categorias de substâncias são terminantemente vedadas para manipulação veterinária no Brasil (ex: produtos biológicos, vacinas, hormônios promotores de crescimento, antibióticos com restrição de uso pela Organização Mundial da Saúde Animal - OMSA)?
2. A plataforma tem o dever legal de implementar filtros de palavras-chave no backend para rejeitar uploads de receitas que contenham substâncias vedadas pelo MAPA, ou essa responsabilidade é estritamente da farmácia manipuladora?

---

## 6. Repartição de Responsabilidade Civil e Administrativa

### (f) Responsabilidade da Plataforma versus Farmácia versus Médico Veterinário
1. Em caso de evento adverso grave, intoxicação ou óbito de animal decorrente de erro de manipulação, dose tóxica prescrita ou matéria-prima contaminada, qual é o limite de responsabilização da MedConnect perante o tutor (sob a ótica do Código de Defesa do Consumidor - CDC)?
2. É juridicamente válida perante o Poder Judiciário e os órgãos de defesa do consumidor a cláusula de não-responsabilidade técnica que isenta a plataforma e atribui 100% da responsabilidade farmacotécnica à farmácia credenciada?
3. Como deve ser estruturada a responsabilidade solidária da plataforma frente à legislação consumerista brasileira quando o tutor contrata o serviço por meio de seu ambiente digital?

---

## 7. Requisitos Institucionais e Registros perante Órgãos de Fiscalização

### (g) Exigências de MAPA, CRMV e CFF Aplicáveis à Plataforma
1. A MedConnect, na qualidade de intermediadora digital e empresa de software (CNAE de tecnologia/portais), precisa possuir registro ou inscrição perante o Ministério da Agricultura e Pecuária (MAPA) ou perante o Conselho Regional de Medicina Veterinária (CRMV)?
2. O Conselho Federal de Farmácia (CFF) ou os CRFs exigem que plataformas de cotação de manipulados possuam responsável técnico farmacêutico inscrito no quadro societário da empresa desenvolvedora?
3. Quais são as penalidades administrativas cabíveis caso algum dos órgãos fiscalizadores entenda que a plataforma atua clandestinamente na cadeia farmacêutica veterinária?

---

## 8. Publicidade, Propaganda e Captação de Receitas

### (h) Publicidade e Exposição de Preparações Magistrais Veterinárias
1. A exibição de orçamentos comparativos com preços e prazos entre diferentes farmácias de manipulação veterinária viola as vedações éticas de captação de clientela do Código de Ética Farmacêutica (Resoluções CFF) ou do Código de Deontologia Veterinária (CFMV)?
2. É permitida a divulgação em redes sociais ou campanhas de marketing mencionando a possibilidade de manipulação de formas palatáveis (biscoitos de carne, pastas) sem menção a fórmulas específicas?
3. O ranking ou ordenação de propostas orçamentárias (por preço, prazo ou avaliação) pode ser caracterizado como direcionamento ilícito de receitas pelo Procon ou Vigilância Sanitária?

---

## 9. Gestão de Riscos e Cobertura Securitária

### (i) Seguro de Responsabilidade Civil Profissional e Operacional
1. É recomendável ou obrigatória a contratação de apólice de Seguro de Responsabilidade Civil Geral e de Operações (E&O - Errors and Omissions) para cobrir eventuais sinistros sanitários na vertical veterinária?
2. A MedConnect deve exigir que as farmácias credenciadas comprovem cobertura securitária própria contra acidentes farmacotécnicos antes da homologação de sua capacidade veterinária?

---

## 10. Privacidade, Governança e Retenção de Dados (LGPD)

### (j) Retenção, Compartilhamento e Exclusão de Dados
1. O enquadramento dos dados de receitas veterinárias e do animal de estimação deve se dar formalmente sob qual base legal da LGPD: Execução de Contrato (Art. 7º, V) ou Consentimento Específico (Art. 11, I) por equiparação reflexa a dados de saúde humana?
2. Em caso de solicitação de exclusão de dados pelo tutor (LGPD Art. 18, VI), qual é o prazo que a plataforma e a farmácia têm o dever de manter as receitas veterinárias armazenadas para fins de fiscalização do MAPA (Art. 16, I da LGPD)?
3. A sistemática adotada de ocultar telefone, e-mail e endereço do tutor no mural até que a cotação seja formalmente aceita atende satisfatoriamente aos princípios de necessidade, minimização e segurança da LGPD?
