# Inventário de Dados Pessoais (Data Mapping / ROPA Técnico) — MedConnect

> **AVISO IMPORTANTE / DISCLAIMER LEGAL:**
> **RASCUNHO TÉCNICO — REVISÃO JURÍDICA OBRIGATÓRIA.**
> Este documento constitui um levantamento estritamente técnico da arquitetura de dados e do banco de dados relacional (schema Prisma) da plataforma MedConnect. Os autores deste documento **NÃO são advogados**. Todas as bases legais indicadas, prazos de retenção propostos, enquadramentos de operadores/controladores e hipóteses de tratamento estão marcados como **[PENDENTE DE VALIDAÇÃO JURÍDICA]** e devem ser validados formalmente pelo Encarregado pelo Tratamento de Dados Pessoais (DPO) e pela assessoria jurídica especializada em Direito Digital e Saúde antes de qualquer aprovação corporativa. Nenhuma afirmação neste documento deve ser interpretada como garantia ou atestado de conformidade legal com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD) ou normas da ANVISA/CFF/CFM.

---

## 1. Visão Geral da Arquitetura de Dados

A plataforma **MedConnect** atua na intermediação digital entre pacientes titulares de receitas médicas e farmácias de manipulação legalmente constituídas, viabilizando cotações, aceites de propostas orçamentárias e acompanhamento de produção e entrega.

### Categorias Principais de Dados Identificadas
1. **Dados Cadastrais e de Contato**: Nome, e-mail, telefone, endereço físico para entrega.
2. **Dados Pessoais Sensíveis (Saúde)**: Cópias digitalizadas de receitas médicas (`Prescription.fileUrl`), contendo histórico terapêutico, substâncias ativas prescritas, dosagens, CRM do prescritor e patologias dedutíveis (Art. 5º, II e Art. 11 da LGPD).
3. **Identificadores Governamentais**: CPF (Paciente) e CNPJ / CRF (Farmácias e Responsáveis Técnicos).
4. **Metadados de Transação e Plataforma**: Cotações de preços, status de pedidos, avaliações, histórico de alterações de status.
5. **Logs de Segurança e Autenticação**: Hashes de senha, tokens de sessão (refresh tokens), tokens de recuperação de senha e verificação de e-mail.
6. **Trilha de Auditoria e Consentimento**: Registros imutáveis de acessos (`AuditLog`), logs de download de receitas (`PrescriptionAccessLog`) e registros versionados de consentimento (`Consent`).

---

## 2. Inventário Detalhado por Tabela / Entidade

---

### 2.1 Tabela: `User` (Titular Paciente / Administrador)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID (PK) | Identificador do sistema | Não | Chave primária de relacionamento. | Execução de contrato (Art. 7º, V) | Enquanto a conta estiver ativa. Exclusão sob demanda. | Sistema interno, APIs autenticadas. | UUID v4 pseudoaleatório. |
| `name` | String | Cadastral | Não | Identificação do paciente e personalização no atendimento. | Execução de contrato (Art. 7º, V) | Duração da conta; após exclusão, anonimizado ("Titular Anonimizado"). | Próprio paciente, Farmácia (no pedido), Admin. | Controle de acesso via JWT / RBAC. |
| `email` | String (Unique) | Cadastral / Contato | Não | Login, autenticação, recuperação de senha e notificações. | Execução de contrato (Art. 7º, V) | Duração da conta; anonimizado após solicitação de exclusão. | Próprio paciente, Sistema de Notificação, Admin. | Normalização em caixa baixa, indexação única. |
| `password` | String (Hash) | Autenticação | Não | Credencial criptográfica de autenticação. | Segurança e autenticação (Art. 7º, V) | Duração da conta; apagado na exclusão. | Nenhum usuário direto; validado apenas pelo motor bcrypt. | Hash unidirecional bcrypt (salt rounds = 10). |
| `role` | Enum (`Role`) | Controle de Acesso | Não | Determinação de privilégios (`PATIENT`, `PHARMACY`, `ADMIN`). | Segurança do sistema (Art. 7º, V) | Duração da conta. | Middlewares de autorização / RBAC. | Restrito por enums e validação de claims de token. |
| `phone` | String (Criptografado) | Contato / Entrega | Não | Contato operacional da farmácia para esclarecimento e entrega. | Execução de contrato (Art. 7º, V) | Duração da conta; mascarado/removido na exclusão. | Próprio paciente, Farmácia vencedora da cotação, Admin. | Criptografia em repouso AES-256-GCM com chave de ambiente rotacionável (`keyId`). |
| `address` | String (Criptografado) | Localização / Entrega | Não | Logística de cálculo de frete e entrega de manipulados. | Execução de contrato (Art. 7º, V) | Duração da conta; mascarado/removido na exclusão. | Próprio paciente, Farmácia vencedora da cotação, Admin. | Criptografia em repouso AES-256-GCM com chave de ambiente rotacionável (`keyId`). |
| `cpfEncrypted` | String (Criptografado) | Identificador Governamental | Não | Faturamento, emissão de Nota Fiscal pela farmácia e conformidade. | Obrigação legal / fiscal (Art. 7º, II) e Execução de contrato (Art. 7º, V) | 5 anos para fins fiscais/tributários `[A VALIDAR COM CONTÁBIL/JURÍDICO]`. | Próprio paciente, Farmácia faturadora, Admin. | Criptografia em repouso AES-256-GCM (`keyId:iv:tag:ciphertext`). |
| `cpfHash` | String (HMAC-SHA256) | Identificador Criptográfico | Não | Garantia de unicidade de cadastro sem expor o CPF em texto claro. | Proteção ao crédito / prevenção à fraude (Art. 7º, X / II) | Mesma vigência do `cpfEncrypted`. | Mecanismo de busca e unicidade no banco. | HMAC-SHA256 gerado com chave secreta segregada. |
| `cpfLastDigits`| String (4 dígitos) | Máscara de Exibição | Não | Exibição segura na interface (`***.***.123-45`). | Interface do usuário (Art. 7º, V) | Duração da conta. | Próprio paciente, Farmácia faturadora. | Armazena apenas os dígitos não sensíveis. |
| `isAnonymized` | Boolean | Estado de Privacidade | Não | Flag para sinalizar que o titular exerceu o direito de exclusão. | Cumprimento de obrigação legal (Art. 18, VI) | Permanente no log de estado. | Sistema interno, rotinas de auditoria. | Flag booleana não editável externamente. |
| `anonymizedAt` | DateTime | Auditoria de Privacidade | Não | Registro cronológico da data/hora da efetivação da anonimização. | Cumprimento de obrigação legal (Art. 18, VI) | Permanente para comprovação perante ANPD. | DPO, Admin, Auditoria. | Timestamp imutável pós-aplicação. |
| `keyId` | String | Metadado Criptográfico | Não | Rastreabilidade da versão da chave utilizada para criptografia. | Segurança da Informação (Art. 46) | Permanente enquanto existirem dados cifrados. | Motor de criptografia (`fieldEncryption.ts`). | Identificador de versão da chave (ex: "v1", "v2"). |
| `emailVerified`| Boolean | Integridade Cadastral | Não | Rastrear verificação de posse do e-mail. | Segurança e integridade de conta (Art. 7º, V) | Duração da conta. | Middlewares de autenticação. | Controle de ativação de conta. |
| `createdAt` / `updatedAt` | DateTime | Metadado Técnico | Não | Rastreabilidade do ciclo de vida da conta. | Obrigação legal (Marco Civil da Internet Art. 15) | 6 meses a 1 ano no mínimo (MCI Art. 15). | Auditoria técnica e suporte. | Timestamps automáticos do Prisma. |

---

### 2.2 Tabela: `Pharmacy` (Farmácia de Manipulação e Responsável Técnico)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID (PK) | Identificador do sistema | Não | Chave primária. | Execução de contrato B2B. | Duração do credenciamento. | Sistema interno. | UUID v4. |
| `name` / `cnpj` | String | Cadastral Pessoa Jurídica | Não | Identificação da empresa farmacêutica e emissão de notas. | Execução de contrato e Obrigação legal (RDC 67/2007). | 5 a 10 anos pós-descredenciamento (prescrição cível/fiscal). | Pacientes, Administradores, Público. | Validação de CNPJ via Receita Federal. |
| `email` / `phone`| String | Contato Comercial | Não | Comunicação da plataforma com a farmácia. | Execução de contrato B2B. | Duração do credenciamento. | Admin, Pacientes em pedidos aceitos. | Controle de acesso via sessão. |
| `address` / `deliveryArea` | String | Logística / Localização | Não | Cálculo de raio de atendimento e entrega. | Execução de contrato B2B. | Duração do credenciamento. | Pacientes na tela de orçamentos, Admin. | Formatação padrão de logradouro/CEP. |
| `sanitaryLicense` / `operatingAuth` | String | Regulatório Sanitário | Não | Registro do Alvará Sanitário e Autorização de Funcionamento (AFE/ANVISA). | Cumprimento de obrigação legal sanitária (RDC ANVISA 67/2007). | 5 a 10 anos pós-descredenciamento. | Administrador na fila de verificação. | Acesso restrito a usuários com perfil `ADMIN`. |
| `technicalResponsibleName` | String | Dado Pessoal (Profissional) | Não | Identificação do Farmacêutico Responsável Técnico perante o CRF. | Cumprimento de obrigação legal sanitária (Lei 5.991/73, Lei 13.021/14). | Duração do vínculo + 5 anos. | Pacientes (ao visualizar orçamento/pedido), Admin. | Exibido para transparência sanitária ao consumidor. |
| `technicalResponsibleCrf` / `Uf` | String | Identificador Profissional | Não | Número de inscrição no Conselho Regional de Farmácia e Unidade Federativa. | Cumprimento de obrigação legal sanitária (RDC ANVISA 67/2007). | Duração do vínculo + 5 anos. | Pacientes, Admin. | Validação contra base do CRF. |
| `documentUrl` | String (URL) | Comprovação Documental | Não | Link seguro para arquivo do alvará / certidão de regularidade do CRF. | Cumprimento de obrigação legal de verificação (Compliance sanitário). | Duração do credenciamento + prazo prescricional. | Apenas Administrador autenticado. | Storage com permissões restritas e verificação anti-tamper. |
| `verificationStatus` | Enum (`PharmacyVerificationStatus`)| Controle Regulatório | Não | Status de validação documental (`PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`). | Governança e Compliance. | Permanente no histórico cadastral. | Farmácia, Admin. | Transição de estado protegida por RBAC admin. |

---

### 2.3 Tabela: `Prescription` (Receita Médica / Dado de Saúde)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID (PK) | Identificador do sistema | Não | Identificador da solicitação de orçamento. | Tutela da saúde / Consentimento específico (Art. 11, II, 'f' ou Art. 11, I). | 5 anos para fins de histórico sanitário `[VALIDAR COM JURÍDICO]`. | Sistema interno. | UUID v4. |
| `patientId` | UUID (FK) | Relacionamento | Não | Vinculação da receita ao paciente titular. | Tutela da saúde / Consentimento específico. | Mesma vigência do registro pai. | Paciente dono, Sistema. | Validação estrita de posse (Anti-IDOR). |
| `fileUrl` | String (Path/URL) | **Dado Sensível de Saúde** | **SIM** | Arquivo de imagem/PDF contendo posologia, fármacos, médico e diagnósticos. | **Consentimento específico e destacado (LGPD Art. 11, I) e Tutela da Saúde (Art. 11, II, 'f')** | 5 anos de retenção mínima por exigência sanitária farmacêutica `[PENDENTE DE VALIDAÇÃO JURÍDICA]`. | Paciente dono, Farmácias credenciadas em cotação aberta, Farmácia vencedora, Admin. | **Armazenamento segregado, URL assinada/controlada via backend, trilha de auditoria em cada acesso (`PrescriptionAccessLog` e `AuditLog`), exclusão/anonimização sob requisição expressa.** |
| `status` | Enum (`PrescriptionStatus`) | Controle Operacional | Não | Ciclo de vida da receita (`PENDING`, `QUOTED`, `ACCEPTED`, `CANCELLED`). | Execução de procedimentos preliminares a pedido do titular (Art. 11, II, 'g'). | Duração do pedido. | Paciente, Farmácias cotantes, Admin. | Máquina de estados finita validada em controller. |

---

### 2.4 Tabela: `Quote` (Proposta Orçamentária da Farmácia)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID (PK) | Identificador | Não | Identificador do orçamento. | Execução de contrato (Art. 7º, V). | 5 anos (Código Civil Art. 206). | Sistema interno. | UUID v4. |
| `prescriptionId`| UUID (FK) | Relacionamento | Não | Vinculação à receita orçada. | Execução de contrato. | Mesma vigência da receita. | Farmácia cotante, Paciente dono. | Chave estrangeira indexada. |
| `pharmacyId` | UUID (FK) | Relacionamento | Não | Identificação da farmácia proponente. | Execução de contrato. | Mesma vigência do orçamento. | Paciente, Farmácia emitente, Admin. | Restrição única por `(prescriptionId, pharmacyId)`. |
| `priceCents` | Integer | Comercial / Financeiro | Não | Valor monetário ofertado para manipulação da fórmula. | Execução de contrato. | 5 anos para conciliação contábil e CDC. | Paciente, Farmácia emitente, Admin. | Armazenamento de centavos inteiros (evita erros de ponto flutuante). |
| `deliveryDays` | Integer | Logístico | Não | Prazo estimado para manipulação e entrega em dias corridos. | Execução de contrato. | 5 anos. | Paciente, Farmácia emitente. | Validação de limites numéricos. |
| `notes` | String | Técnico-Comercial | Pode conter info de saúde | Observações farmacêuticas (ex: indisponibilidade de ativo, orientação). | Tutela da saúde / Execução de contrato. | 5 anos. | Paciente, Farmácia emitente, Admin. | Sanitização de strings contra injeção e scripts maliciosos. |
| `status` | Enum (`QuoteStatus`) | Controle Operacional | Não | Estado da cotação (`PENDING`, `ACCEPTED`, `REJECTED`, `EXPIRED`). | Execução de contrato. | 5 anos. | Paciente, Farmácia, Admin. | Transição de estado estrita. |

---

### 2.5 Tabela: `Order` e `OrderStatusHistory` (Pedido Farmacêutico e Trilha de Status)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `Order.id` | UUID (PK) | Identificador | Não | Identificador do pedido confirmado. | Execução de contrato de compra e venda (Art. 7º, V). | 5 a 10 anos (prescrição consumerista e fiscal). | Paciente comprador, Farmácia vendedora, Admin. | UUID v4. |
| `Order.quoteId`| UUID (FK) | Relacionamento | Não | Associação unívoca com a proposta comercial aceita. | Execução de contrato. | Mesma do pedido. | Partes contratantes. | Constraint UNIQUE. |
| `Order.status` | Enum (`OrderStatus`) | Logística / Farmacotécnica | Não | Acompanhamento das etapas: `PRODUCTION`, `DELIVERY`, `DELIVERED`, `CANCELLED`. | Execução de contrato. | 5 anos. | Paciente, Farmácia, Admin. | Transição validada via enum. |
| `OrderStatusHistory.fromStatus` / `toStatus` | Enums | Rastreabilidade Operacional | Não | Histórico de transição da manipulação e despacho do medicamento. | Execução de contrato e transparência ao consumidor. | 5 anos. | Paciente, Farmácia, Admin. | Trilha com chave estrangeira indexada. |
| `OrderStatusHistory.changedByType` / `changedById` | Role / UUID | Auditoria de Operação | Não | Identificação do operador que alterou o status (Farmácia ou Admin). | Legítimo interesse e auditoria de processo. | 5 anos. | Admin, Auditoria de qualidade. | Registro automático no backend com ID autenticado. |

---

### 2.6 Tabela: `Review` (Avaliação do Serviço da Farmácia)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `rating` | Integer (1-5) | Métrica de Satisfação | Não | Cálculo da média de reputação pública da farmácia. | Legítimo interesse (Art. 7º, IX) / Execução de contrato. | Permanente ou até exclusão da conta do paciente. | Público, Farmácia, Admin. | Validação de faixa de 1 a 5. |
| `comment` | String | Opinião / Feedback | Não (evitar menção médica) | Relato do paciente sobre o atendimento, prazo e qualidade da embalagem. | Legítimo interesse / Execução de contrato. | Enquanto a avaliação for pública; anonimizado na exclusão de conta. | Público, Farmácia, Admin. | Sanitização de texto; recomendação de não citar patologias no texto público. |

---

### 2.7 Tabela: `Notification` (Alertas em Tempo Real)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `userId` / `pharmacyId` | UUID | Destinatário | Não | Direcionamento da notificação na interface do usuário. | Execução de contrato (Art. 7º, V). | 90 dias a 1 ano `[VALIDAR RETENÇÃO]`. | Titular destinatário. | Filtragem restrita por token JWT do usuário logado. |
| `title` / `message` | String | Mensagem Operacional | Pode inferir status | Informar chegada de nova cotação, mudança de status de entrega, etc. | Execução de contrato. | 90 dias a 1 ano. | Titular destinatário. | Não inclui dados de saúde nem diagnósticos no corpo da notificação. |
| `read` | Boolean | Estado de Leitura | Não | Sinalizar se o usuário visualizou a mensagem. | Execução de contrato. | Mesma da notificação. | Titular destinatário. | Atualização via PATCH autenticado. |

---

### 2.8 Tabela: `PrescriptionAccessLog` (Acessos a Arquivos de Receitas)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `prescriptionId`| UUID (FK) | Relacionamento | Não | Identificação da receita cujo arquivo foi visualizado/baixado. | Cumprimento de obrigação legal de segurança (Art. 16/46 LGPD). | 5 anos `[VALIDAR COM JURÍDICO]`. | Admin, DPO, Auditoria. | Chave estrangeira indexada com cascade. |
| `accessedById` | UUID | Identificação do Agente | Não | ID da farmácia ou do paciente que abriu o arquivo. | Obrigação legal / Trilha de auditoria. | 5 anos. | Admin, DPO. | Gravado automaticamente pelo controller no download. |
| `accessedByType`| Role | Perfil do Agente | Não | Perfil do usuário que efetuou o acesso. | Obrigação legal / Trilha de auditoria. | 5 anos. | Admin, DPO. | Enum restrito (`PATIENT`, `PHARMACY`, `ADMIN`). |
| `ipAddress` | String | Metadado de Conexão | Não | Endereço IP de origem da requisição de download. | Marco Civil da Internet (Lei 12.965/14, Art. 15). | Mínimo de 6 meses (MCI) a 5 anos (auditoria de saúde). | Admin, DPO, Autoridades judiciais. | Extraído com suporte a proxies confiáveis. |

---

### 2.9 Tabelas de Segurança de Sessão: `RefreshToken`, `PasswordResetToken`, `EmailVerificationToken`

| Tabela | Campo Principal | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `RefreshToken` | `tokenHash` (SHA-256) | Credencial Efêmera | Não | Renovação de tokens JWT sem reautenticação com senha. | Segurança da informação (Art. 7º, V e Art. 46). | Até expiração (`expiresAt`, 7 dias) + expurgo programado. | Motor de autenticação. | Token nunca salvo em texto plano; hash SHA-256 com rotação de família de tokens contra roubo. |
| `PasswordResetToken` | `tokenHash` (SHA-256) | Credencial Efêmera | Não | Validação de recuperação de senha esquecida via e-mail. | Segurança da informação (Art. 7º, V e Art. 46). | 1 hora (`expiresAt`) + expurgo programado pós-uso. | Motor de autenticação. | Hash SHA-256; uso único (`used: true`); expiração curta. |
| `EmailVerificationToken` | `tokenHash` (SHA-256) | Credencial Efêmera | Não | Confirmação de titularidade do endereço de e-mail. | Segurança da informação (Art. 7º, V e Art. 46). | 24 horas (`expiresAt`) + expurgo pós-uso. | Motor de autenticação. | Hash SHA-256; uso único. |

---

### 2.10 Tabela: `Consent` (Gestão e Registro de Consentimento Versionado)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID (PK) | Identificador | Não | Identificador unívoco do consentimento. | Cumprimento de obrigação legal (LGPD Art. 8º, § 2º). | 5 anos após término da relação com o titular `[A VALIDAR]`. | Sistema interno. | UUID v4. |
| `userId` | UUID (FK) | Relacionamento | Não | Titular que manifestou ou revogou o consentimento. | Prova de consentimento (LGPD Art. 8º, § 2º). | Mesma do registro pai. | Titular, DPO, Admin. | Relacionamento com chave estrangeira indexada. |
| `userType` | Role | Identificação de Perfil | Não | Papel do usuário (`PATIENT`). | Prova de consentimento. | Mesma do registro pai. | Titular, DPO, Admin. | Enum restrito. |
| `consentType` | String | Classificação do Escopo | Não | Escopo do consentimento (ex: `HEALTH_DATA_PROCESSING`). | Prova de consentimento. | 5 anos pós-encerramento. | Titular, DPO, Admin. | Padronização via constantes do sistema. |
| `textVersion` | String | Controle de Versão | Não | Versão do texto legal apresentado ao titular (ex: `v1.0.0`). | Transparência e auditoria de versão de termos. | 5 anos pós-encerramento. | Titular, DPO, Admin. | Versionamento semântico de termos. |
| `textHash` | String (SHA-256) | Integridade Textual | Não | Hash criptográfico do texto exato aprovado pelo titular. | Não repúdio e garantia de integridade do termo aceito. | 5 anos pós-encerramento. | DPO, Auditoria externa, Perícia judicial. | Hash SHA-256 calculado a partir do conteúdo bruto. |
| `ipAddress` | String | Metadado de Conexão | Não | IP de origem no momento da manifestação da vontade. | Marco Civil da Internet (Art. 15) e auditoria. | 5 anos pós-encerramento. | DPO, Admin. | Capturado via cabeçalhos HTTP na rota autenticada. |
| `userAgent` | String | Metadado de Dispositivo | Não | Navegador e sistema operacional do titular na concessão. | Auditoria de segurança e autenticidade. | 5 anos pós-encerramento. | DPO, Admin. | Captura do header `User-Agent`. |
| `consentedAt` | DateTime | Timestamp de Concessão | Não | Data e hora precisa em que o consentimento foi fornecido. | Prova de consentimento (Art. 8º, § 2º). | 5 anos pós-encerramento. | Titular, DPO, Admin. | Gerado no servidor (`now()`). |
| `revokedAt` | DateTime (Nullable) | Timestamp de Revogação | Não | Data e hora em que o consentimento foi revogado pelo titular. | Cumprimento de direito do titular (LGPD Art. 8º, § 5º). | 5 anos pós-encerramento. | Titular, DPO, Admin. | Preenchido automaticamente na ação de revogação. |
| `revokedIp` | String (Nullable) | Metadado de Revogação | Não | IP de onde partiu a solicitação de revogação. | Auditoria de revogação. | 5 anos pós-encerramento. | DPO, Admin. | Capturado na rota `POST /api/consent/revoke`. |
| `revocationReason` | String (Nullable) | Motivo da Revogação | Não | Razão informada pelo titular ao revogar o consentimento. | Feedback de governança e auditoria. | 5 anos pós-encerramento. | DPO, Admin. | Opcional, livre preenchimento sanitizado. |

---

### 2.11 Tabela: `AuditLog` (Trilha de Auditoria Imutável — Somente Inserção)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID (PK) | Identificador | Não | Identificador único do evento de auditoria. | Obrigação legal / Segurança (Art. 46 da LGPD e MCI Art. 15). | 5 anos (para defesa em processos judiciais/administrativos) `[A VALIDAR]`. | Sistema interno. | UUID v4. |
| `actorId` | UUID | Identificação do Agente | Não | ID do usuário que realizou a operação de leitura ou escrita. | Auditoria e responsabilização (LGPD Art. 6º, X). | 5 anos. | Apenas Administrador (`ADMIN`). | Indexado para buscas forenses rápidas. |
| `actorType` | Role | Perfil do Agente | Não | Perfil do agente (`PATIENT`, `PHARMACY`, `ADMIN`). | Auditoria e responsabilização. | 5 anos. | Apenas Administrador (`ADMIN`). | Enum restrito. |
| `actorEmail` | String (Nullable) | Identificação do Agente | Não | E-mail do agente no instante do evento. | Rastreabilidade e facilidade de investigação. | 5 anos. | Apenas Administrador (`ADMIN`). | Armazenado de forma redundante para o caso de exclusão da conta de origem. |
| `action` | String | Verbo da Ação | Não | Ação realizada (ex: `READ_PRESCRIPTION_FILE`, `READ_PATIENT_CONTACT`, `EXPORT_DATA`). | Rastreabilidade de ações sensíveis. | 5 anos. | Apenas Administrador (`ADMIN`). | Vocabulário controlado de ações. |
| `resource` | String | Recurso Alvo | Não | Entidade auditada (`Prescription`, `Order`, `User`, `Consent`). | Mapeamento do ativo de informação afetado. | 5 anos. | Apenas Administrador (`ADMIN`). | Indexado em conjunto com `resourceId`. |
| `resourceId` | String (Nullable) | Identificador do Alvo | Não | ID do registro afetado (ex: ID da receita médica). | Localização exata do dado acessado. | 5 anos. | Apenas Administrador (`ADMIN`). | Indexado para buscas pontuais de vazamentos ou acessos suspeitos. |
| `reason` | String | Justificativa do Acesso | Não | Motivo do acesso (ex: "Visualização técnica de prescrição para formulação de cotação"). | Transparência e prestação de contas (Accountability). | 5 anos. | Apenas Administrador (`ADMIN`). | Campo obrigatório em serviços de auditoria. |
| `details` | String (JSON texto) | Contexto Técnico | Não (sem expor segredos) | Metadados complementares (sem conter valores criptografados em claro). | Reconstituição forense de contexto. | 5 anos. | Apenas Administrador (`ADMIN`). | Sanitizado contra inclusão de senhas, CPFs em claro ou tokens. |
| `ipAddress` | String | Metadado de Rede | Não | Endereço IP do solicitante. | Marco Civil da Internet (Art. 15). | 5 anos. | Apenas Administrador (`ADMIN`). | Captura confiável de proxy (`X-Forwarded-For`). |
| `userAgent` | String | Metadado de Cliente | Não | Cabeçalho `User-Agent` do navegador/dispositivo. | Análise de anomalias e segurança da informação. | 5 anos. | Apenas Administrador (`ADMIN`). | Truncado para evitar estouro de buffer. |
| `createdAt` | DateTime | Timestamp Imutável | Não | Data e hora exata do evento (UTC). | Ordem cronológica da trilha forense. | 5 anos. | Apenas Administrador (`ADMIN`). | **Não existe campo `updatedAt`. A tabela possui bloqueio estrito (HTTP 405) no backend contra alterações e exclusões.** |

---

## 3. Resumo de Itens Pendentes de Validação Jurídica

1. **Hipótese Legal para Dados de Saúde**: O tratamento de cópias de receitas médicas está operando sob duplo respaldo técnico sugerido: **Consentimento Específico e Destacado (LGPD Art. 11, I)** e **Tutela da Saúde (LGPD Art. 11, II, 'f')**. O departamento jurídico deve determinar se ambas são mantidas em conjunto ou se há prevalência estrita do consentimento para a etapa comercial de intermediação.
2. **Prazos de Retenção Sanitária vs. Exclusão LGPD**: A Anvisa (RDC 67/2007) e o Código de Defesa do Consumidor estipulam retenção mínima de documentos e fórmulas por até 5 anos. Quando o paciente solicita exclusão (LGPD Art. 18, VI), a plataforma anonimiza os dados cadastrais diretos e bloqueia novos orçamentos, mas preserva os registros técnicos mínimos essenciais para cumprimento de obrigação legal/regulatória (LGPD Art. 16, I). Esse procedimento e o prazo de expurgo exato dependem de parecer legal formal.
3. **Enquadramento Regulatório da Plataforma**: Validação do enquadramento da MedConnect perante a ANPD e os Conselhos Profissionais (CFF/CFM) como Controladora de dados cadastrais e Operadora/Intermediária dos dados das receitas direcionadas às farmácias de manipulação.
