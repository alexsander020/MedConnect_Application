# Textos da Aplicação que Requerem Revisão Jurídica (Etapa V4)

**Documento**: Levantamento de Textos Regulatórios e Termos de Uso  
**Módulos Envolvidos**: Frontend do Tutor, Cadastro de Animais, Cotação Veterinária, Consentimento LGPD  
**Legislação de Referência**: Lei Federal nº 13.709/2018 (LGPD), Decreto nº 5.053/2004 (MAPA), Resoluções do CFMV e CFF.

---

## 1. Termo de Consentimento para Tratamento de Dados de Saúde e Veterinários (LGPD Art. 11)

- **Localização na Interface**: Componente de submissão em `NewQuote.jsx` (checkbox obrigatório).
- **Versão Atual**: `v1.0.0`
- **Texto Implementado**:
  > *"Autorizo expressamente o tratamento dos dados da receita veterinária, identificação do animal de estimação e dados cadastrais do tutor para fins exclusivos de cotação de preços, verificação regulatória e manipulação farmacêutica pelas farmácias habilitadas, nos termos do Art. 11 da LGPD. Estou ciente de que posso revogar este consentimento a qualquer momento nas configurações do meu perfil."*
- **Ponto para Análise Jurídica**:
  - Verificar se a menção conjunta aos dados cadastrais do tutor e dados de prescrição animal atende de forma suficiente ao consentimento específico e destacado exigido pelo Art. 11 da LGPD para dados que possam revelar indiretamente hábitos ou condições do tutor.

---

## 2. Disclaimer Regulatório sobre Não Substituição de Orientação Veterinária

- **Localização na Interface**: Card informativo em `NewQuote.jsx` logo abaixo das preferências da fórmula.
- **Texto Implementado**:
  > *"Importante: A farmácia credenciada confere a receita e a plataforma não substitui a orientação do médico veterinário."*
- **Ponto para Análise Jurídica**:
  - Validar se a isenção de responsabilidade da plataforma quanto a prescrições e dosagens está adequada perante as normas de defesa do consumidor (CDC Art. 14) e do Conselho Federal de Medicina Veterinária (CFMV).

---

## 3. Aviso Regulatório de Bloqueio para Animais Destinados à Produção / Consumo

- **Localização na Interface**: Modal de cadastro/edição de animais em `MyPets.jsx`.
- **Texto Implementado**:
  > *"Aviso regulatório: De acordo com normas do MAPA, a manipulação para animais destinados ao consumo requer habilitação específica. A MedConnect ainda não atende essa categoria. Desmarque para prosseguir apenas com animais de companhia."*
- **Ponto para Análise Jurídica**:
  - Confirmar a clareza da advertência em relação ao Decreto nº 5.053/2004 e Instruções Normativas do MAPA sobre substâncias com período de carência (*withdrawal period*) em animais de produção.

---

## 4. Declaração de Direitos do Titular sobre Dados dos Animais (LGPD Art. 18)

- **Localização na Interface**: Painel de privacidade em `Profile.jsx`.
- **Texto Implementado**:
  > *"Gerencie seus consentimentos e direitos de titular (incluindo dados dos seus pets)"*  
  > *"Aviso Crítico: Deseja solicitar a exclusão e anonimização definitiva da sua conta? Registros regulatórios mínimos exigidos por lei sanitária serão preservados."*
- **Ponto para Análise Jurídica**:
  - Confirmar se a extensão dos direitos de portabilidade (JSON) e anonimização aos registros veterinários (com preservação de rastreabilidade de lotes manipulados exigida por normas sanitárias) está devidamente fundamentada no Art. 16 da LGPD.
