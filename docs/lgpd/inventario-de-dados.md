# Inventário de Dados Pessoais (Data Mapping / ROPA Técnico) — MedConnect

> **AVISO IMPORTANTE / DISCLAIMER LEGAL:**
> **RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA.**
> Este documento constitui um levantamento estritamente técnico da arquitetura de dados e do banco de dados relacional (schema Prisma) da plataforma MedConnect, contemplando as verticais humana e veterinária. Os autores deste documento **NÃO são advogados**. Todas as bases legais indicadas, prazos de retenção propostos, enquadramentos de operadores/controladores e hipóteses de tratamento estão marcados como **[PENDENTE DE VALIDAÇÃO JURÍDICA]** e devem ser validados formalmente pelo Encarregado pelo Tratamento de Dados Pessoais (DPO) e pela assessoria jurídica especializada em Direito Digital, Sanitário e Regulatório Agropecuário antes de qualquer homologação em produção. Nenhuma afirmação neste documento constitui atestado ou garantia de conformidade legal com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD), normas da ANVISA, MAPA, CFMV ou CFF.

---

## 1. Visão Geral da Arquitetura de Dados

A plataforma **MedConnect** atua na intermediação digital entre:
1. **Pacientes e Tutores de Animais**: titulares de receitas médicas ou veterinárias que buscam orçamentos para manipulação.
2. **Farmácias de Manipulação Credenciadas**: estabelecimentos farmacêuticos habilitados perante autoridades sanitárias competentes (ANVISA/CRF para uso humano e MAPA/CRMV para uso veterinário).

### Categorias Principais de Dados Identificadas
1. **Dados Cadastrais e de Contato**: Nome, e-mail, telefone, endereço físico para entrega (criptografados em repouso com AES-256-GCM).
2. **Dados Pessoais Sensíveis de Saúde Humana**: Cópias digitalizadas de receitas médicas (`Prescription.fileUrl`), histórico terapêutico, substâncias ativas prescritas, dosagens, CRM do prescritor e patologias dedutíveis (Art. 5º, II e Art. 11 da LGPD).
3. **Identificadores Governamentais e Profissionais**: CPF (Paciente/Tutor), CNPJ (Farmácias), CRF e UF (Farmacêuticos Responsáveis Técnicos), CRMV e UF (Médicos Veterinários Prescritores e Farmácias Veterinárias).
4. **Dados da Vertical Veterinária (Animais e Prescrições)**: Embora dados de animais de estimação ou produção não constituam dados pessoais por si (animais não são titulares de direitos sob a LGPD), tais dados estão **indissociavelmente vinculados ao tutor pessoa natural** (`Animal.tutorId = User.id`), viabilizando inferência de perfil, rotina, localização e capacidade socioeconômica. Portanto, recebem tratamento e salvaguardas técnicas idênticas aos dados pessoais do titular.
5. **Documentos de Evidência Regulatória da Farmácia**: Licenças sanitárias, certidões de regularidade do CRF, registro no MAPA (Decreto nº 5.053/2004) e comprovante de registro no CRMV-PJ, mantidos em upload privado seguro via chaves de arquivo (`evidenceFileKeys`).
6. **Notificações de Receita Veterinária de Controle Especial**: Número de notificação oficial do MAPA (SIPEAGRO) para substâncias sujeitas a controle especial veterinário, com marcação técnica para conferência manual (`requiresManualDocumentCheck = true`).
7. **Metadados de Transação e Plataforma**: Cotações de preços (centavos inteiros), status de pedidos, prazos de manipulação, aromatizações veterinárias, histórico de transições de status.
8. **Trilha de Auditoria e Consentimento**: Registros imutáveis de acessos (`AuditLog`), logs de download de receitas (`PrescriptionAccessLog`) e registros versionados de consentimento (`Consent`).

---

## 2. Inventário Detalhado por Tabela / Entidade

---

### 2.1 Tabela: `User` (Titular Paciente / Tutor / Administrador)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID (PK) | Identificador do sistema | Não | Chave primária de relacionamento. | Execução de contrato (Art. 7º, V) | Enquanto a conta estiver ativa. Exclusão sob demanda. | Sistema interno, APIs autenticadas. | UUID v4 pseudoaleatório. |
| `name` | String | Cadastral | Não | Identificação do paciente/tutor e personalização no atendimento. | Execução de contrato (Art. 7º, V) | Duração da conta; após exclusão, anonimizado ("Titular Anonimizado"). | Próprio titular, Farmácia (no pedido), Admin. | Controle de acesso via JWT / RBAC. |
| `email` | String (Unique) | Cadastral / Contato | Não | Login, autenticação, recuperação de senha e notificações. | Execução de contrato (Art. 7º, V) | Duração da conta; anonimizado após solicitação de exclusão. | Próprio titular, Sistema de Notificação, Admin. | Normalização em caixa baixa, indexação única. |
| `password` | String (Hash) | Autenticação | Não | Credencial criptográfica de autenticação. | Segurança e autenticação (Art. 7º, V) | Duração da conta; apagado na exclusão. | Motor de autenticação. | Hash unidirecional bcrypt (salt rounds = 10). |
| `role` | Enum (`Role`) | Controle de Acesso | Não | Determinação de privilégios (`PATIENT`, `PHARMACY`, `ADMIN`). | Segurança do sistema (Art. 7º, V) | Duração da conta. | Middlewares de autorização / RBAC. | Restrito por enums e validação de claims. |
| `phone` | String (Criptografado) | Contato / Entrega | Não | Contato operacional da farmácia para esclarecimento e entrega. | Execução de contrato (Art. 7º, V) | Duração da conta; mascarado/removido na exclusão. | Próprio titular, Farmácia vencedora da cotação, Admin. | Criptografia em repouso AES-256-GCM (`keyId`). |
| `address` | String (Criptografado) | Localização / Entrega | Não | Logística de cálculo de frete e entrega de manipulados. | Execução de contrato (Art. 7º, V) | Duração da conta; mascarado/removido na exclusão. | Próprio titular, Farmácia vencedora da cotação, Admin. | Criptografia em repouso AES-256-GCM (`keyId`). |
| `cpfEncrypted` | String (Criptografado) | Identificador Governamental | Não | Faturamento e emissão de Nota Fiscal pela farmácia. | Obrigação legal / fiscal (Art. 7º, II) e Execução de contrato (Art. 7º, V) | 5 anos para fins fiscais/tributários `[A VALIDAR COM CONTÁBIL/JURÍDICO]`. | Próprio titular, Farmácia faturadora, Admin. | Criptografia em repouso AES-256-GCM. |
| `isAnonymized` | Boolean | Estado de Privacidade | Não | Sinalizar que o titular exerceu o direito de exclusão. | Cumprimento de obrigação legal (Art. 18, VI) | Permanente no log de estado. | Sistema interno, rotinas de auditoria. | Flag booleana não editável externamente. |
| `anonymizedAt` | DateTime | Auditoria de Privacidade | Não | Registro cronológico da data/hora da efetivação da anonimização. | Cumprimento de obrigação legal (Art. 18, VI) | Permanente para comprovação perante ANPD. | DPO, Admin, Auditoria. | Timestamp imutável pós-aplicação. |

---

### 2.2 Tabela: `Animal` (Animal de Estimação ou Produção vinculado ao Tutor)

> **Nota Conceitual LGPD `[PENDENTE DE VALIDAÇÃO JURÍDICA]`**: O animal não é titular de dados pessoais perante a LGPD. Contudo, seus registros estão **indissociavelmente vinculados ao tutor pessoa natural** (`tutorId`). A divulgação indevida de dados do animal (peso, espécie, alergias, medicações de uso crônico) permite inferir estilo de vida, poder aquisitivo e localização do tutor. Adota-se, portanto, a mesma postura de confidencialidade e segurança que protege os dados do próprio titular.

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID (PK) | Identificador do sistema | Não | Chave primária do animal. | Execução de contrato (Art. 7º, V). | Duração da conta do tutor ou até exclusão do animal. | Sistema interno, APIs autenticadas. | UUID v4. |
| `tutorId` | UUID (FK) | Relacionamento Pessoal | Não | Vinculação exclusiva ao tutor titular (`User.id`). | Execução de contrato (Art. 7º, V). | Mesma do cadastro do tutor. | Próprio tutor, Sistema. | Constraint de chave estrangeira com `ON DELETE CASCADE`. |
| `name` | String | Identificação do Animal | Não | Nome do pet para rotulagem farmacotécnica do medicamento. | Execução de contrato e Normas do MAPA. | Duração do vínculo ou até exclusão lógica. | Tutor, Farmácia cotante/vencedora, Admin. | Exibido no resumo do pedido e rótulo. |
| `species` | Enum (`AnimalSpecies`) | Dados Veterinários | Não | Espécie (`DOG`, `CAT`, `BIRD`, `EQUINE`, etc.) para validação de segurança farmacotécnica de ativos tóxicos por espécie. | Execução de contrato e Normas MAPA/CRMV. | Duração do vínculo ou até exclusão lógica. | Tutor, Farmácia cotante/vencedora, Admin. | Validação por enum fechado. |
| `breed` | String | Dados Veterinários | Não | Raça do animal para cálculo posológico e predisposições. | Execução de contrato. | Duração do vínculo ou até exclusão lógica. | Tutor, Farmácia cotante/vencedora. | Sanitização de texto. |
| `weightGrams` | Integer | Dados Veterinários | Não | Peso estrito em gramas (padrão D5) para cálculo de dose pelo farmacêutico. | Execução de contrato e Segurança Terapêutica. | Duração do vínculo ou até exclusão lógica. | Tutor, Farmácia cotante/vencedora. | Constraint de banco `animal_weight_positive_check` (`weightGrams > 0`). |
| `birthDate` | DateTime (Nullable) | Dados Veterinários | Não | Idade aproximada do animal para avaliação de geriatria/pediatria veterinária. | Execução de contrato. | Duração do vínculo ou até exclusão lógica. | Tutor, Farmácia cotante/vencedora. | Formatação na interface sem expor dia exato para a farmácia antes do aceite. |
| `isFoodProducing` | Boolean | Controle Regulatório MAPA | Não | Indicação se o animal é destinado à produção/alimentação (corte, leite, ovos). | Cumprimento de obrigação legal e controle de período de carência (MAPA). | Permanente no histórico sanitário. | Tutor, Sistema, Admin. | Bloqueio automático de orçamento quando `VET_ALLOW_FOOD_PRODUCING=false`. |
| `notes` | String (Nullable) | Observações de Manejo | Não | Preferências de aroma, sabor e restrições (ex: "alérgico a frango"). | Execução de contrato e personalização de forma farmacêutica. | Duração do vínculo. | Tutor, Farmácia cotante/vencedora. | Sanitização contra XSS. |
| `deletedAt` | DateTime (Nullable) | Estado de Privacidade | Não | Timestamp de exclusão lógica (soft delete) pelo tutor. | Cumprimento de direito do titular (LGPD Art. 18, VI). | Preservação apenas em pedidos pré-existentes. | Sistema interno. | Índice composto `(tutorId, deletedAt)` para filtrar animais ativos. |

---

### 2.3 Tabela: `Prescription` (Receita Médica Humana ou Veterinária)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID (PK) | Identificador do sistema | Não | Chave primária da receita. | Tutela da saúde / Consentimento específico. | 5 anos para fins de histórico sanitário `[VALIDAR COM JURÍDICO]`. | Sistema interno. | UUID v4. |
| `patientId` | UUID (FK) | Relacionamento | Não | Vinculação da receita ao paciente/tutor titular. | Tutela da saúde / Consentimento específico. | Mesma vigência do registro pai. | Paciente/tutor dono, Sistema. | Validação estrita de posse (Anti-IDOR). |
| `kind` | Enum (`PrescriptionKind`) | Dimensão Sanitária | Não | Diferenciação estrita: `HUMAN` vs `VETERINARY`. | Cumprimento de obrigação legal (ANVISA vs MAPA). | 5 anos. | Sistema, Farmácia habilitada, Admin. | Constraint `prescription_vet_coherence_check`. |
| `petId` | UUID (FK Nullable) | Relacionamento Vet | Não | Vinculação ao animal destinatário da fórmula manipulada. | Execução de contrato e Normas do MAPA. | 5 anos. | Tutor, Farmácia habilitada, Admin. | Obrigatório para `VETERINARY`, estritamente nulo para `HUMAN`. |
| `prescriberName` | String | Dado Pessoal (Profissional) | Não | Nome do médico (humano) ou médico veterinário (prescritor). | Cumprimento de obrigação legal sanitária (RDC 67/07 / MAPA). | 5 anos. | Tutor, Farmácia cotante/vencedora, Admin. | Exibido no mural para conferência de habilitação profissional. |
| `prescriberCrmv` / `prescriberUf`| String | Identificador Profissional | Não | CRMV e UF do médico veterinário prescritor. | Cumprimento de obrigação legal sanitária (CFMV / MAPA). | 5 anos. | Tutor, Farmácia cotante/vencedora, Admin. | Validação de formato via `@medconnect/validation` (`validarCrmv`). |
| `vetDocumentType` | Enum (`VetDocumentType`) | Classificação Documental | Não | `MAGISTRAL` (comum) ou `CONTROLLED_NOTIFICATION` (especial). | Cumprimento de normas de controle especial (SIPEAGRO/MAPA). | 5 anos. | Tutor, Farmácia cotante/vencedora, Admin. | Exige conferência manual quando controlado. |
| `controlledNotificationNumber` | String (Nullable) | Identificador Regulatório | Não | Número da Notificação de Receita Veterinária oficial. | Cumprimento de obrigação legal sanitária de controlados (MAPA). | 5 anos. | Farmácia vencedora, Admin, Fiscalização. | Armazenado para conferência de retenção de via física. |
| `fileUrl` | String (Path) | **Dado Sensível (Humano) / Confidencial (Vet)** | **SIM (para humano)** | Arquivo de imagem/PDF da receita contendo substâncias e posologia. | Consentimento específico (LGPD Art. 11, I) e Tutela da Saúde (Art. 11, II, 'f'). | 5 anos de retenção por exigência sanitária `[VALIDAR COM JURÍDICO]`. | Paciente/tutor, Farmácias com capacidade verificada, Admin. | **Storage privado, URL assinada com expiração de 15 min, registro compulsório em `AuditLog` e `PrescriptionAccessLog`.** |
| `status` | Enum (`PrescriptionStatus`) | Controle Operacional | Não | Ciclo de vida (`PENDING`, `QUOTED`, `ACCEPTED`, `CANCELLED`). | Procedimentos preliminares de contrato (Art. 7º, V). | Duração do processo de cotação. | Tutor, Farmácias cotantes, Admin. | Máquina de estados finita validada em controller. |

---

### 2.4 Tabela: `PharmacyCapability` (Capacidades Regulatórias da Farmácia)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID (PK) | Identificador | Não | Identificador da capacidade. | Cumprimento de obrigação legal de verificação sanitária. | Duração do credenciamento da farmácia. | Sistema interno. | UUID v4. |
| `pharmacyId` | UUID (FK) | Relacionamento | Não | Vinculação à farmácia jurídica titular da capacidade. | Cumprimento de obrigação legal. | Mesma da farmácia. | Farmácia titular, Admin. | Constraint `@@unique([pharmacyId, type])`. |
| `type` | Enum (`CapabilityType`) | Escopo Regulatório | Não | `HUMAN_COMPOUNDING` ou `VETERINARY_COMPOUNDING`. | Governança regulatória (ANVISA vs MAPA). | Permanente no histórico cadastral. | Farmácia, Admin, Sistema de RBAC. | Enum fechado. |
| `status` | Enum (`CapabilityStatus`)| Ciclo Regulatório | Não | `PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`, `SUSPENDED`. | Compliance sanitário e controle de acesso. | Permanente no histórico de auditoria. | Farmácia titular, Admin. | Transições restritas ao papel `ADMIN`. |
| `mapaRegistrationNumber` | String | Identificador Governamental | Não | Número de registro do estabelecimento no MAPA (Decreto 5.053/2004). | Cumprimento de obrigação legal perante o MAPA. | Duração do vínculo + prazo prescricional (5-10 anos). | Farmácia titular, Admin, Fiscalização. | Validação de formato de registro do estabelecimento. |
| `crmvCompanyRegistration` / `crmvCompanyUf` | String | Identificador Profissional PJ | Não | Inscrição da pessoa jurídica no CRMV da Unidade da Federação. | Cumprimento de obrigações profissionais (CFMV). | Duração do vínculo + prazo prescricional. | Farmácia titular, Admin. | Validação de UF e formato de inscrição. |
| `technicalResponsibleName` | String | Dado Pessoal (Profissional) | Não | Nome do Farmacêutico ou Veterinário Responsável Técnico da empresa. | Cumprimento de dever de transparência sanitária. | Duração do vínculo + 5 anos. | Tutores (no pedido aceito), Farmácia, Admin. | Exibido no pedido para garantia de rastreabilidade. |
| `technicalResponsibleCrf` / `technicalResponsibleCrfUf` | String | Identificador Profissional PF | Não | Número e UF da carteira profissional do Responsável Técnico (CRF/CRMV). | Cumprimento de exigência sanitária legal. | Duração do vínculo + 5 anos. | Tutores, Farmácia, Admin. | Validação de formato via `@medconnect/validation`. |
| `evidenceFileKeys` | Array de Strings | Documentos de Evidência | Não | Chaves de arquivos de certidões do MAPA, CRMV e CRF armazenados em storage privado. | Compliance sanitário e prova perante órgãos reguladores. | Duração do vínculo + 5 a 10 anos pós-descredenciamento. | **Apenas Administrador (`ADMIN`) via URL assinada de curta duração.** | **Sem URLs públicas. Abertura auditada com registro de IP e justificativa em `AuditLog`.** |
| `verifiedByAdminId` / `verifiedAt` | UUID / DateTime | Auditoria de Homologação | Não | Identificação do analista administrativo que homologou a capacidade. | Responsabilização e trilha de conformidade (Accountability). | Permanente para histórico de compliance. | DPO, Auditoria, Admin. | Gravado exclusivamente pelo backend em transação de aprovação. |
| `rejectionReason` | String (Nullable) | Justificativa Regulatória | Não | Motivo formal de recusa ou suspensão da capacidade. | Transparência e ampla defesa perante o parceiro. | Permanente no histórico da solicitação. | Farmácia titular, Admin. | Campo obrigatório para transições `REJECTED` e `SUSPENDED`. |

---

### 2.5 Tabela: `Quote` (Proposta Orçamentária da Farmácia)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID (PK) | Identificador | Não | Identificador unívoco do orçamento. | Execução de contrato (Art. 7º, V). | 5 anos (CDC / Código Civil). | Sistema interno. | UUID v4. |
| `priceCents` | Integer | Comercial / Financeiro | Não | Preço ofertado armazenado em centavos inteiros. | Execução de contrato. | 5 anos para conciliação contábil e fiscal. | Paciente/tutor, Farmácia, Admin. | Padrão monetário estrito em inteiros. |
| `pharmaceuticalForm` | String (Nullable) | Farmacotécnica | Não | Forma farmacêutica (ex: biscoito palatável, pasta oral, suspensão, cápsula). | Execução de contrato e especificidade da fórmula. | 5 anos. | Tutor, Farmácia, Admin. | Sanitização de strings. |
| `flavoring` | String (Nullable) | Farmacotécnica | Não | Aromatização indicada (ex: carne, frango, baunilha, peixe). | Execução de contrato e adesão terapêutica animal. | 5 anos. | Tutor, Farmácia, Admin. | Sanitização de strings. |
| `estimatedPreparationDays` | Integer (Nullable) | Logístico / Produção | Não | Dias úteis necessários para a manipulação magistral da fórmula. | Execução de contrato. | 5 anos. | Tutor, Farmácia, Admin. | Validação de limites numéricos inteiros. |
| `notes` | String (Nullable) | Observações | Pode inferir info | Observações técnicas do farmacêutico sobre a manipulação. | Tutela da saúde / Execução de contrato. | 5 anos. | Tutor, Farmácia, Admin. | Sanitização contra injeções e scripts. |

---

### 2.6 Tabela: `Order` e `OrderStatusHistory` (Pedido Farmacêutico e Trilha de Status)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `Order.id` | UUID (PK) | Identificador | Não | Identificador do pedido confirmado. | Execução de contrato de compra e venda (Art. 7º, V). | 5 a 10 anos (prescrição consumerista e fiscal). | Paciente/tutor comprador, Farmácia vendedora, Admin. | UUID v4. |
| `Order.quoteId`| UUID (FK) | Relacionamento | Não | Associação unívoca com a proposta comercial aceita. | Execução de contrato. | Mesma do pedido. | Partes contratantes. | Constraint UNIQUE. |
| `Order.status` | Enum (`OrderStatus`) | Logística / Farmacotécnica | Não | Acompanhamento das etapas: `PRODUCTION`, `DELIVERY`, `DELIVERED`, `CANCELLED`. | Execução de contrato. | 5 anos. | Paciente/tutor, Farmácia, Admin. | Transição validada via enum. |
| `OrderStatusHistory.fromStatus` / `toStatus` | Enums | Rastreabilidade Operacional | Não | Histórico de transição da manipulação e despacho do medicamento. | Execução de contrato e transparência ao consumidor. | 5 anos. | Paciente/tutor, Farmácia, Admin. | Trilha com chave estrangeira indexada. |
| `OrderStatusHistory.changedByType` / `changedById` | Role / UUID | Auditoria de Operação | Não | Identificação do operador que alterou o status (Farmácia ou Admin). | Legítimo interesse e auditoria de processo. | 5 anos. | Admin, Auditoria de qualidade. | Registro automático no backend com ID autenticado. |

---

### 2.7 Tabela: `Review` (Avaliação do Serviço da Farmácia)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `rating` | Integer (1-5) | Métrica de Satisfação | Não | Cálculo da média de reputação pública da farmácia. | Legítimo interesse (Art. 7º, IX) / Execução de contrato. | Permanente ou até exclusão da conta. | Público, Farmácia, Admin. | Validação de faixa de 1 a 5. |
| `comment` | String | Opinião / Feedback | Não (evitar menção médica) | Relato do paciente/tutor sobre atendimento e entrega. | Legítimo interesse / Execução de contrato. | Enquanto a avaliação for pública; anonimizado na exclusão. | Público, Farmácia, Admin. | Sanitização de texto. |

---

### 2.8 Tabela: `Notification` (Alertas em Tempo Real)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `userId` / `pharmacyId` | UUID | Destinatário | Não | Direcionamento da notificação na interface do usuário. | Execução de contrato (Art. 7º, V). | 90 dias a 1 ano `[VALIDAR RETENÇÃO]`. | Titular destinatário. | Filtragem restrita por token JWT do usuário logado. |
| `title` / `message` | String | Mensagem Operacional | Pode inferir status | Informar chegada de nova cotação, mudança de status de entrega, etc. | Execução de contrato. | 90 dias a 1 ano. | Titular destinatário. | Não inclui dados de saúde nem diagnósticos no corpo da notificação. |
| `read` | Boolean | Estado de Leitura | Não | Sinalizar se o usuário visualizou a mensagem. | Execução de contrato. | Mesma da notificação. | Titular destinatário. | Atualização via PATCH autenticado. |

---

### 2.9 Tabela: `PrescriptionAccessLog` (Acessos a Arquivos de Receitas)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `prescriptionId`| UUID (FK) | Relacionamento | Não | Identificação da receita cujo arquivo foi visualizado/baixado. | Cumprimento de obrigação legal de segurança (Art. 16/46 LGPD). | 5 anos `[VALIDAR COM JURÍDICO]`. | Admin, DPO, Auditoria. | Chave estrangeira indexada com cascade. |
| `accessedById` | UUID | Identificação do Agente | Não | ID da farmácia ou do paciente/tutor que abriu o arquivo. | Obrigação legal / Trilha de auditoria. | 5 anos. | Admin, DPO. | Gravado automaticamente pelo controller no download. |
| `accessedByType`| Role | Perfil do Agente | Não | Perfil do usuário que efetuou o acesso. | Obrigação legal / Trilha de auditoria. | 5 anos. | Admin, DPO. | Enum restrito (`PATIENT`, `PHARMACY`, `ADMIN`). |
| `ipAddress` | String | Metadado de Conexão | Não | Endereço IP de origem da requisição de download. | Marco Civil da Internet (Lei 12.965/14, Art. 15). | Mínimo de 6 meses (MCI) a 5 anos (auditoria de saúde). | Admin, DPO, Autoridades judiciais. | Extraído com suporte a proxies confiáveis. |

---

### 2.10 Tabelas de Segurança de Sessão: `RefreshToken`, `PasswordResetToken`, `EmailVerificationToken`

| Tabela | Campo Principal | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `RefreshToken` | `tokenHash` (SHA-256) | Credencial Efêmera | Não | Renovação de tokens JWT sem reautenticação com senha. | Segurança da informação (Art. 7º, V e Art. 46). | Até expiração (`expiresAt`, 7 dias) + expurgo programado. | Motor de autenticação. | Token nunca salvo em texto plano; hash SHA-256 com rotação de família. |
| `PasswordResetToken` | `tokenHash` (SHA-256) | Credencial Efêmera | Não | Validação de recuperação de senha esquecida via e-mail. | Segurança da informação (Art. 7º, V e Art. 46). | 1 hora (`expiresAt`) + expurgo programado pós-uso. | Motor de autenticação. | Hash SHA-256; uso único (`used: true`); expiração curta. |
| `EmailVerificationToken` | `tokenHash` (SHA-256) | Credencial Efêmera | Não | Confirmação de titularidade do endereço de e-mail. | Segurança da informação (Art. 7º, V e Art. 46). | 24 horas (`expiresAt`) + expurgo pós-uso. | Motor de autenticação. | Hash SHA-256; uso único. |

---

### 2.11 Tabela: `Consent` (Gestão e Registro de Consentimento Versionado)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID (PK) | Identificador | Não | Identificador unívoco do consentimento. | Cumprimento de obrigação legal (LGPD Art. 8º, § 2º). | 5 anos após término da relação com o titular `[A VALIDAR]`. | Sistema interno. | UUID v4. |
| `userId` | UUID (FK) | Relacionamento | Não | Titular que manifestou ou revogou o consentimento. | Prova de consentimento (LGPD Art. 8º, § 2º). | Mesma do registro pai. | Titular, DPO, Admin. | Relacionamento com chave estrangeira indexada. |
| `userType` | Role | Identificação de Perfil | Não | Papel do usuário (`PATIENT`). | Prova de consentimento. | Mesma do registro pai. | Titular, DPO, Admin. | Enum restrito. |
| `consentType` | String | Classificação do Escopo | Não | Escopo do consentimento (`HEALTH_DATA_PROCESSING`, `VET_DATA_PROCESSING`). | Prova de consentimento. | 5 anos pós-encerramento. | Titular, DPO, Admin. | Padronização via constantes do sistema. |
| `textVersion` | String | Controle de Versão | Não | Versão do texto legal apresentado ao titular (ex: `v2.0.0-vet`). | Transparência e auditoria de versão de termos. | 5 anos pós-encerramento. | Titular, DPO, Admin. | Versionamento semântico de termos. |
| `textHash` | String (SHA-256) | Integridade Textual | Não | Hash criptográfico do texto exato aprovado pelo titular. | Não repúdio e garantia de integridade do termo aceito. | 5 anos pós-encerramento. | DPO, Auditoria externa, Perícia judicial. | Hash SHA-256 calculado a partir do conteúdo bruto. |
| `ipAddress` | String | Metadado de Conexão | Não | IP de origem no momento da manifestação da vontade. | Marco Civil da Internet (Art. 15) e auditoria. | 5 anos pós-encerramento. | DPO, Admin. | Capturado via cabeçalhos HTTP na rota autenticada. |
| `userAgent` | String | Metadado de Dispositivo | Não | Navegador e sistema operacional do titular na concessão. | Auditoria de segurança e autenticidade. | 5 anos pós-encerramento. | DPO, Admin. | Captura do header `User-Agent`. |
| `consentedAt` | DateTime | Timestamp de Concessão | Não | Data e hora precisa em que o consentimento foi fornecido. | Prova de consentimento (Art. 8º, § 2º). | 5 anos pós-encerramento. | Titular, DPO, Admin. | Gerado no servidor (`now()`). |
| `revokedAt` | DateTime (Nullable) | Timestamp de Revogação | Não | Data e hora em que o consentimento foi revogado pelo titular. | Cumprimento de direito do titular (LGPD Art. 8º, § 5º). | 5 anos pós-encerramento. | Titular, DPO, Admin. | Preenchido automaticamente na ação de revogação. |
| `revokedIp` | String (Nullable) | Metadado de Revogação | Não | IP de onde partiu a solicitação de revogação. | Auditoria de revogação. | 5 anos pós-encerramento. | DPO, Admin. | Capturado na rota `POST /api/consent/revoke`. |
| `revocationReason` | String (Nullable) | Motivo da Revogação | Não | Razão informada pelo titular ao revogar o consentimento. | Feedback de governança e auditoria. | 5 anos pós-encerramento. | DPO, Admin. | Opcional, livre preenchimento sanitizado. |

---

### 2.12 Tabela: `AuditLog` (Trilha de Auditoria Imutável — Somente Inserção)

| Campo | Tipo / Formato | Categoria do Dado | Sensível? | Finalidade Técnica | Base Legal Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Prazo de Retenção Sugerido `[PENDENTE DE VALIDAÇÃO JURÍDICA]` | Quem Acessa | Medidas de Segurança Aplicadas |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `id` | UUID (PK) | Identificador | Não | Identificador único do evento de auditoria. | Obrigação legal / Segurança (Art. 46 da LGPD e MCI Art. 15). | 5 anos (defesa em processos judiciais/sanitários) `[A VALIDAR]`. | Sistema interno. | UUID v4. |
| `actorId` | UUID | Identificação do Agente | Não | ID do usuário que realizou a operação de leitura ou escrita. | Auditoria e responsabilização (LGPD Art. 6º, X). | 5 anos. | Apenas Administrador (`ADMIN`). | Indexado para buscas forenses rápidas. |
| `actorType` | Role | Perfil do Agente | Não | Perfil do agente (`PATIENT`, `PHARMACY`, `ADMIN`). | Auditoria e responsabilização. | 5 anos. | Apenas Administrador (`ADMIN`). | Enum restrito. |
| `actorEmail` | String (Nullable) | Identificação do Agente | Não | E-mail do agente no instante do evento. | Rastreabilidade e facilidade de investigação. | 5 anos. | Apenas Administrador (`ADMIN`). | Armazenado de forma redundante para o caso de exclusão da conta de origem. |
| `action` | String | Verbo da Ação | Não | Ação realizada (ex: `UPLOAD_VET_PRESCRIPTION`, `REQUEST_VETERINARY_CAPABILITY`, `APPROVE_PHARMACY_CAPABILITY`, `REJECT_PHARMACY_CAPABILITY`, `SUSPEND_PHARMACY_CAPABILITY`, `VIEW_CAPABILITY_EVIDENCE`). | Rastreabilidade de ações sensíveis e regulatórias. | 5 anos. | Apenas Administrador (`ADMIN`). | Vocabulário controlado de ações. |
| `resource` | String | Recurso Alvo | Não | Entidade auditada (`Prescription`, `Order`, `PharmacyCapability`, `Animal`, `User`, `Consent`). | Mapeamento do ativo de informação afetado. | 5 anos. | Apenas Administrador (`ADMIN`). | Indexado em conjunto com `resourceId`. |
| `resourceId` | String (Nullable) | Identificador do Alvo | Não | ID do registro afetado (ex: ID da receita médica ou capacidade). | Localização exata do dado acessado. | 5 anos. | Apenas Administrador (`ADMIN`). | Indexado para investigações forenses. |
| `reason` | String | Justificativa do Acesso | Não | Motivo do acesso ou justificativa obrigatória de recusa/suspensão. | Transparência e prestação de contas (Accountability). | 5 anos. | Apenas Administrador (`ADMIN`). | Campo obrigatório em operações administrativas. |
| `details` | String (JSON texto) | Contexto Técnico | Não (sem expor segredos) | Metadados complementares (sem conter valores criptografados em claro). | Reconstituição forense de contexto. | 5 anos. | Apenas Administrador (`ADMIN`). | Sanitizado contra inclusão de senhas, CPFs em claro ou tokens. |
| `ipAddress` | String | Metadado de Rede | Não | Endereço IP do solicitante. | Marco Civil da Internet (Art. 15). | 5 anos. | Apenas Administrador (`ADMIN`). | Captura confiável de proxy (`X-Forwarded-For`). |
| `userAgent` | String | Metadado de Cliente | Não | Cabeçalho `User-Agent` do navegador/dispositivo. | Análise de anomalias e segurança da informação. | 5 anos. | Apenas Administrador (`ADMIN`). | Truncado para evitar estouro de buffer. |
| `createdAt` | DateTime | Timestamp Imutável | Não | Data e hora exata do evento (UTC). | Ordem cronológica da trilha forense. | 5 anos. | Apenas Administrador (`ADMIN`). | **Não existe campo `updatedAt`. A tabela possui bloqueio estrito (HTTP 405) no backend contra alterações e exclusões.** |

---

## 3. Resumo de Itens Pendentes de Validação Jurídica

> **RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA**

1. **Hipótese Legal para Dados da Vertical Veterinária**:
   - Definição formal se o tratamento de dados de tutores e prescrições veterinárias deve se dar sob **Consentimento Específico (Art. 11, I)** por assimilação ao regime de saúde humana, ou sob **Execução de Contrato (Art. 7º, V)** complementado por legítimo interesse e cumprimento de dever perante o MAPA.
2. **Prazos de Retenção Sanitária vs. Exclusão LGPD (MAPA vs. ANVISA)**:
   - Normas do MAPA e da ANVISA estipulam retenção mínima de documentos e fórmulas por períodos de 2 a 5 anos. Quando o tutor solicita exclusão de conta (LGPD Art. 18, VI), a plataforma anonimiza os dados cadastrais diretos e os animais associados, mas preserva os registros técnicos mínimos essenciais para cumprimento de obrigação legal/regulatória (LGPD Art. 16, I). Esse procedimento e o prazo de expurgo exato dependem de parecer legal formal.
3. **Validade e Retenção Física de Notificação de Controle Especial Veterinário**:
   - Necessidade de parecer sobre a responsabilidade da plataforma e da farmácia na retenção da via física da Notificação de Receita Veterinária antes da entrega do medicamento ao tutor.
