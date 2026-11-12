# RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA
# Política de Privacidade e Proteção de Dados Pessoais — Plataforma MedConnect

> **AVISO LEGAL OBRIGATÓRIO:**
> **RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA.**
> Este documento é uma minuta/rascunho de natureza técnica e estrutural elaborado pela equipe de desenvolvimento de software da MedConnect, abrangendo o tratamento de dados nas verticais humana e veterinária. Os autores **NÃO são advogados**. Todas as cláusulas, bases legais sugeridas, compromissos de compartilhamento, direitos do titular e prazos de retenção aqui constantes devem passar por **REVISÃO E HOMOLOGAÇÃO JURÍDICA FORMAL** por advogado especializado em Direito Digital, Sanitário e Regulatório Agropecuário antes de publicação oficial aos usuários. Nenhuma disposição aqui representa garantia ou atestado de conformidade legal definitiva.

---

## 1. Apresentação e Quem Somos

A **MedConnect Intermediação de Serviços Farmacêuticos Ltda.** (sociedade em estruturação, doravante "MedConnect", "nós" ou "Plataforma"), tem como missão conectar pacientes e tutores de animais a farmácias de manipulação legalmente regularizadas perante a ANVISA/CRF (uso humano) e MAPA/CRMV (uso veterinário), simplificando o processo de cotação de receitas médicas e veterinárias, aceitação de propostas e acompanhamento da manipulação e entrega de medicamentos magistrais.

Reconhecemos a extrema sensibilidade das informações que você compartilha conosco. Esta Política explica com clareza como coletamos, usamos, armazenamos, compartilhamos e protegemos seus dados, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD).

---

## 2. Conceitos Importantes (Art. 5º da LGPD)

- **Titular**: Você, pessoa natural a quem se referem os dados pessoais que utilizam nossa plataforma (pacientes humanos, tutores de animais ou farmacêuticos/veterinários).
- **Dado Pessoal**: Qualquer informação relacionada a pessoa natural identificada ou identificável (ex: nome, CPF, e-mail, telefone, endereço residencial).
- **Dado Pessoal Sensível**: Dado sobre saúde, vida sexual, dado genético ou biométrico. No caso da MedConnect, as **receitas médicas humanas** constituem dados pessoais sensíveis de saúde (LGPD Art. 11).
- **Dados da Vertical Veterinária (Animais e Prescrições)**: Conforme o entendimento técnico adotado, o animal não é sujeito de direitos perante a LGPD. Entretanto, os dados cadastrais do animal (espécie, raça, peso, histórico terapêutico) estão **indissociavelmente vinculados ao tutor pessoa natural**, permitindo inferir hábitos, estilo de vida e localização do titular. Portanto, a MedConnect confere aos dados do animal o **mesmo rigor e zelo protetivo dispensados aos dados pessoais do próprio tutor**.
- **Controlador**: Pessoa física ou jurídica a quem competem as decisões sobre o tratamento de dados pessoais.
- **Operador**: Pessoa física ou jurídica que realiza o tratamento de dados em nome do controlador.
- **Encarregado (DPO)**: Canal de comunicação entre o controlador, os titulares e a Autoridade Nacional de Proteção de Dados (ANPD).

---

## 3. Dados que Coletamos e Suas Finalidades

### 3.1 Dados Cadastrais e de Identificação do Paciente / Tutor
- **Dados Coletados**: Nome completo, endereço de e-mail, número de telefone celular, endereço completo para entrega e CPF (criptografado em repouso com AES-256-GCM).
- **Finalidade**: Criar e autenticar sua conta, viabilizar a entrega dos medicamentos manipulados em sua residência e emitir notas fiscais pela farmácia.
- **Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]`**: Execução de contrato ou procedimentos preliminares (Art. 7º, V) e Cumprimento de obrigação legal/fiscal (Art. 7º, II).

### 3.2 Dados de Saúde Humana (Receitas Médicas) — Dados Sensíveis
- **Dados Coletados**: Arquivo digitalizado ou foto da receita médica, nome do médico prescritor, registro no CRM, medicamentos, ativos, posologia e instruções de uso.
- **Finalidade**: Permitir que farmácias credenciadas avaliem a viabilidade técnica da manipulação, calculem o orçamento exato e manipulem o medicamento com base na prescrição.
- **Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]`**: Consentimento específico e destacado do titular para finalidades determinadas (Art. 11, I) cumulado com a Tutela da Saúde (Art. 11, II, 'f').

> [!IMPORTANT]
> **PROIBIÇÃO DE COMERCIALIZAÇÃO**: A MedConnect **NUNCA vende, licencia ou comercializa dados de saúde humana ou dados de receitas veterinárias** para indústrias farmacêuticas, empresas de marketing ou seguradoras. É terminantemente vedada qualquer prática contrária ao Art. 11, § 4º da LGPD.

### 3.3 Dados da Vertical Veterinária (Pets, Tutores e Médicos Veterinários)
- **Dados Coletados**:
  - Do Animal: Nome do pet, espécie, raça, peso exato em gramas, data de nascimento/idade aproximada, indicação se é animal de produção/consumo humano e anotações de manejo (ex: preferência por aromas palatáveis, alergias alimentares).
  - Da Prescrição Veterinária: Cópia da receita magistral ou Notificação de Receita Veterinária do MAPA (SIPEAGRO), substâncias prescritas, posologia, nome do médico veterinário prescritor, número de CRMV e UF de emissão.
- **Finalidade**:
  - Permitir a farmácias habilitadas perante o MAPA/CRMV realizarem a avaliação técnica e orçamentária da fórmula personalizada ao animal;
  - Adequar a forma farmacêutica (biscoitos palatáveis, pastas orais, xaropes flavorizados) à espécie do pet;
  - Garantir o cumprimento de normas do MAPA relativas a medicamentos veterinários controlados e prevenção de resíduos em alimentos.
- **Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]`**: Execução de contrato (Art. 7º, V) e Consentimento destacado do tutor (`ConsentService`).

### 3.4 Dados Técnicos de Navegação e Auditoria
- **Dados Coletados**: Endereço IP, data e hora de acessos, registros de downloads de receitas (`PrescriptionAccessLog`), histórico de alterações cadastrais e logs de segurança (`AuditLog`).
- **Finalidade**: Proteger a plataforma contra fraudes e invasões, cumprir a obrigação legal de guarda de logs de conexão e manter a rastreabilidade imutável de quem acessou cada prescrição.
- **Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]`**: Cumprimento de obrigação legal (Marco Civil da Internet, Lei nº 12.965/2014, Art. 15) e Legítimo interesse de segurança (Art. 7º, IX).

---

## 4. Com Quem Compartilhamos Seus Dados

Seus dados são compartilhados apenas na medida estritamente necessária para a prestação dos serviços:

1. **Farmácias de Manipulação Credenciadas**:
   - **Na fase de cotação (Privacidade por Design)**: A farmácia acessa exclusivamente os dados necessários para calcular o orçamento (para humanos: receita médica; para pets: espécie, peso, idade aproximada, ativos e prescritor). **Nenhum dado de contato do tutor (telefone, e-mail, endereço residencial) é revelado antes da aceitação formal da proposta.**
   - **Apenas Farmácias com Capacidade Homologada**: Receitas veterinárias só podem ser visualizadas e orçadas por farmácias com capacidade `VETERINARY_COMPOUNDING` homologada pelo administrador após conferência do registro no MAPA e CRMV.
   - **Após o aceite do orçamento**: A farmácia vencedora recebe nome, telefone e endereço para rotulagem regulatória, faturamento fiscal e entrega domiciliar.
2. **Provedores de Infraestrutura e Tecnologia (Operadores)**:
   - Serviços de hospedagem em nuvem, bancos de dados relacionais e serviços de e-mail transacional, vinculados a cláusulas de confidencialidade e segurança.
3. **Autoridades Governamentais e Regulatórias**:
   - ANVISA, MAPA, Vigilâncias Sanitárias locais, Conselhos Profissionais (CRF/CRMV/CFM/CFMV) e Poder Judiciário, mediante ordem legal ou requisição formal justificada.

---

## 5. Medidas de Segurança e Criptografia da Informação

Adotamos padrões robustos de segurança da informação (Art. 46 da LGPD):
- **Criptografia em Repouso**: Campos sensíveis como CPF, telefone e endereço residencial são armazenados criptografados via algoritmo **AES-256-GCM**, com chaves segregadas em variáveis de ambiente.
- **Criptografia em Trânsito**: Todas as comunicações entre navegador e servidor utilizam TLS 1.3 (HTTPS).
- **Upload Privado de Evidências e Receitas**: Arquivos de receitas e certidões regulatórias do MAPA/CRMV são armazenados em repositório privado via identificadores opacos. O acesso ocorre exclusivamente por **URLs assinadas de curta duração** (15 minutos), registradas compulsoriamente em `AuditLog`.
- **Trilha de Auditoria Imutável**: A tabela `AuditLog` é imutável (`405 Method Not Allowed` para alterações e exclusões), registrando todos os acessos operacionais a prescrições e dados cadastrais.
- **Controle de Acesso Baseado em Perfis e Capacidades (RBAC)**: Segregação técnica impedindo que farmácias puramente humanas tenham acesso a receitas veterinárias.

---

## 6. Seus Direitos como Titular de Dados Pessoais (Art. 18 da LGPD)

Você possui os seguintes direitos garantidos pela LGPD, exercíveis pelo nosso portal ou pelo e-mail do Encarregado (`dpo@medconnect.com`):
1. **Confirmação e Acesso**: Obter confirmação sobre a existência de tratamento e acessar seus dados cadastrais, animais e histórico de pedidos.
2. **Correção**: Solicitar a correção de dados incompletos, inexatos ou desatualizados.
3. **Portabilidade / Exportação**: Baixar cópia completa estruturada de seus dados em formato JSON.
4. **Revogação do Consentimento**: Revogar o consentimento para tratamento de receitas a qualquer momento no perfil, o que bloqueará novas cotações e interromperá acessos de farmácias cotantes.
5. **Anonimização / Eliminação**: Solicitar a exclusão de sua conta. Os dados cadastrais e animais são anonimizados nos sistemas operacionais, ressalvada a guarda obrigatória de registros fiscais e receitas dispensadas pelos prazos legais de retenção sanitária da ANVISA e do MAPA (LGPD Art. 16, I) `[PENDENTE DE VALIDAÇÃO JURÍDICA]`.

---

## 7. Retenção e Expurgo de Dados

- **Dados Cadastrais**: Mantidos enquanto a conta permanecer ativa. Após exclusão, anonimizados de forma irreversível.
- **Receitas Médicas e Veterinárias Dispensadas**: Retidas pelo prazo regulatório mínimo exigido pela ANVISA (RDC nº 67/2007) e pelo MAPA (Decreto nº 5.053/2004) — prazo sugerido de **5 anos** para defesa sanitária e fiscal `[A VALIDAR COM JURÍDICO]`.
- **Logs de Conexão e Auditoria**: Mantidos por no mínimo 6 meses (Marco Civil da Internet, Art. 15) e até 5 anos para fins de auditoria de segurança da informação.

---

## 8. Contato do Encarregado pelo Tratamento de Dados (DPO)

Em caso de dúvidas, solicitações ou exercício de direitos previstos nesta Política:
- **Encarregado pelo Tratamento de Dados (DPO)**: Equipe de Governança e Privacidade MedConnect
- **Canal de Atendimento**: `dpo@medconnect.com`
- **Endereço**: São Paulo, SP — Brasil
