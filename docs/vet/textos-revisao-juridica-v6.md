# Levantamento de Pontos Pendentes de Validação Jurídica e Regulatória — Vertical Veterinária

**Documento elaborado na Etapa V6 — Qualidade e Documentação**  
**Data:** 31/10/2026  
**Status:** Submetido para Parecer do Departamento Jurídico / DPO  

---

## 1. Contexto Regulatório

A vertical veterinária do MedConnect opera na intersecção de múltiplas esferas regulatórias:
- **MAPA (Ministério da Agricultura e Pecuária)**: Decreto Federal nº 5.053/2004 e Instruções Normativas correlatas (registro de estabelecimentos fabricantes/manipuladores de produtos de uso veterinário).
- **CFMV / CRMVs**: Resoluções sobre prescrição veterinária, identificação profissional do médico veterinário e responsabilidade técnica.
- **CFF / CRFs**: Resolução CFF nº 516/2009 e correlatas sobre manipulação de fórmulas veterinárias em farmácias magistrais humanas.
- **ANVISA**: RDC nº 67/2007 (Boas Práticas de Manipulação).
- **LGPD (Lei nº 13.709/2018)**: Proteção de dados cadastrais, financeiros e de localização de tutores, além de dados profissionais dos prescritores.

---

## 2. Itens que Dependem de Validação Jurídica

### 2.1 Animais de Produção e Cadeia de Consumo Humano (`VET_ALLOW_FOOD_PRODUCING`)
- **Situação Atual**: Mantida **desligada por padrão** (`false`), bloqueando manipulação com `422 Unprocessable Entity` (`ANIMAL_FOOD_PRODUCING_NOT_SUPPORTED`).
- **Ponto para Validação**:
  - Para atender animais de produção (bovinos de leite/corte, aves, suínos), a legislação do MAPA exige rigoroso controle de período de carência (*withdrawal period*) para evitar resíduos em alimentos destinados ao consumo humano.
  - **Ação Jurídica**: Avaliar os riscos de responsabilidade solidária da plataforma caso uma fórmula manipulada gere resíduos em alimentos. Recomendação técnica: manter desativado até celebração de seguro de responsabilidade sanitária e consultoria especializada.

### 2.2 Notificações de Receita de Controle Especial Veterinário (`VET_CONTROLLED_ENABLED`)
- **Situação Atual**: Suporte a Notificação de Receita Veterinária (SIPEAGRO) com número da notificação e exigência de conferência manual documental (`requiresManualDocumentCheck = true`).
- **Ponto para Validação**:
  - Pelo MAPA, determinadas substâncias psicotrópicas ou entorpecentes de uso veterinário exigem a retenção da via física da Notificação de Receita no momento da entrega do medicamento ao tutor.
  - **Ação Jurídica**: Validar a redação da cláusula que impõe à farmácia a obrigação de recolher a notificação física original antes da entrega do produto manipulado ao tutor.

### 2.3 Termo de Consentimento para Tratamento de Dados do Tutor e do Pet
- **Situação Atual**: O consentimento do titular é versionado (`ConsentService`) e abrange dados cadastrais do tutor e das receitas veterinárias de seus animais.
- **Ponto para Validação**:
  - Validação do texto específico:
    > *"Declaro ser o tutor legal do animal informado e autorizo o MedConnect e as farmácias credenciadas a tratarem meus dados pessoais e as receitas veterinárias do animal estritamente para fins de cotação, manipulação e entrega de medicamentos, em conformidade com a LGPD e normativas sanitárias."*
  - **Ação Jurídica**: Homologar a redação final e os prazos de guarda previstos na política de retenção para receitas veterinárias (recomendado: 2 anos conforme MAPA).

### 2.4 Responsabilidade Técnica e Duplo Registro (MAPA + CRF)
- **Situação Atual**: A plataforma exige que a farmácia comprove:
  1. Registro no MAPA (Decreto 5.053/2004).
  2. Registro da Pessoa Jurídica no CRMV da Unidade da Federação.
  3. Nome e CRF/UF do Responsável Técnico farmacêutico habilitado.
- **Ponto para Validação**:
  - Em algumas UFs, há litígios entre CRMV e CRF sobre a obrigatoriedade de inscrição de farmácias magistrais no CRMV (Precedentes do STJ dispensando inscrição quando a farmácia já possui CRF e registro no MAPA).
  - **Ação Jurídica**: Confirmar se a exigência simultânea de CRMV-PJ deve ser mantida como requisito obrigatório ou alternativo em estados onde há decisões judiciais específicas transitadas em julgado.

### 2.5 Cláusula de Isenção de Diagnóstico e Orientação Clínica
- **Situação Atual**: Aviso explícito na tela de cotação de que o MedConnect é uma plataforma de conexão e tecnologia e não substitui o diagnóstico, prognóstico ou orientação do médico veterinário.
- **Ponto para Validação**:
  - Redação da cláusula de não-interferência no ato médico-veterinário e exclusão de responsabilidade por posologia ou indicação terapêutica prescrita pelo profissional.
