# RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA
# Checklist Operacional de Verificação e Homologação de Farmácias Veterinárias — Painel ADMIN

> **AVISO IMPORTANTE / DISCLAIMER LEGAL:**
> **RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA.**
> Este documento é um roteiro técnico-operacional elaborado pela equipe de desenvolvimento para guiar os analistas com perfil `ADMIN` na validação de solicitações da capacidade `VETERINARY_COMPOUNDING`. Os autores **NÃO são advogados nem fiscais agropecuários**. Todos os critérios de validação, documentos aceitos, motivos formais de recusa e prazos de suspensão devem ser submetidos à **REVISÃO E HOMOLOGAÇÃO JURÍDICA FORMAL** por advogado especializado em Direito Regulatório Agropecuário e Sanitário (MAPA/CRMV/CFF).

---

## 1. Fluxo Geral de Análise de Capacidade (`VETERINARY_COMPOUNDING`)

1. **Acesso do Analista**:
   - Apenas usuários com papel `ADMIN` devidamente autenticados com credenciais válidas e MFA têm acesso à aba **"Capacidades"** no painel administrativo (`/admin`).
   - Todas as ações do analista (abertura de documentos, aprovação, recusa com motivo, suspensão) são auditadas e registradas de forma imutável na tabela `AuditLog`.

2. **Visualização Segura das Evidências**:
   - O analista visualiza os comprovantes submetidos pela farmácia exclusivamente por meio de **URLs assinadas e temporárias (HMAC-SHA256, validade máxima de 15 minutos)**.
   - Os documentos nunca são expostos em links públicos diretos (`evidenceFileKeys` privados).

---

## 2. Itens a Conferir pelo Analista Administrativo

Para cada solicitação com status `PENDING_VERIFICATION`, o analista deve verificar rigorosamente os três pilares regulatórios:

### Pilar 1: Registro do Estabelecimento no MAPA
- **O que conferir**:
  - Número de registro do estabelecimento informado no cadastro bate com o documento anexado;
  - Documento anexado: Certificado oficial de registro emitido pelo Ministério da Agricultura e Pecuária (MAPA) ou publicação de concessão no Diário Oficial da União (DOU);
  - Atividade autorizada expressamente: **Manipulação de produtos de uso veterinário** (conforme Decreto nº 5.053/2004);
  - Vigência do registro: Certificado dentro do prazo de validade legal.

### Pilar 2: Registro da Empresa no CRMV da Unidade da Federação
- **O que conferir**:
  - Inscrição da Pessoa Jurídica no Conselho Regional de Medicina Veterinária (CRMV);
  - A Unidade Federativa (UF) do CRMV da empresa deve ser idêntica à UF do endereço físico cadastrado da farmácia;
  - Documento anexado: Certidão de Regularidade de Pessoa Jurídica emitida pelo CRMV, com situação ativa e adimplente.

### Pilar 3: Responsável Técnico (RT) e Certidão de Regularidade (CRF ou CRMV)
- **O que conferir**:
  - Nome completo do Responsável Técnico confere com a certidão anexada;
  - Número e UF da carteira profissional (CRF para farmacêuticos ou CRMV para médicos veterinários com especialização);
  - Documento anexado: Certidão de Regularidade Técnica (CRT) emitida pelo respectivo conselho de classe, constando a farmácia requerente como local de exercício profissional e com carga horária compatível com a manipulação;
  - Inscrição profissional ativa e sem sanções ético-disciplinares impeditivas.

---

## 3. Checklist de Conferência Obrigatório na Interface (`AdminDashboard.jsx`)

Antes de habilitar o botão de aprovação, o analista deve marcar e confirmar os itens:

- [ ] **Registro MAPA conferido**: Número, vigência e atividade de manipulação veterinária válidos.
- [ ] **CRMV da empresa conferido**: Inscrição de Pessoa Jurídica ativa e compatível com a UF.
- [ ] **RT e CRF conferidos**: Responsável Técnico qualificado e com certidão de regularidade vigente.

---

## 4. Tipificação de Decisões do Administrador

### 4.1 Aprovação (`status = VERIFIED`)
- **Critério**: Todos os 3 pilares documentais foram conferidos, validados e considerados conformes.
- **Efeito Imediato**:
  - A capacidade passa para `VERIFIED`;
  - A farmácia é desbloqueada para visualizar receitas veterinárias no mural (`/pharmacy/requests`) e emitir cotações;
  - Farmácia recebe notificação no painel: *"Capacidade Veterinária Aprovada"*;
  - Registro de auditoria gerado em `AuditLog` com ID do analista, timestamp e detalhes da homologação.

### 4.2 Recusa com Motivo Obrigatório (`status = REJECTED`)
- **Critério**: Inconsistência documental, dados divergentes ou documento vencido.
- **Exigência**: O analista deve obrigatoriamente descrever a justificativa de forma clara e objetiva para permitir o reenvio corrigido.
- **Motivos Padronizados Sugeridos `[A VALIDAR COM JURÍDICO]`**:
  1. `MAPA_REGISTRATION_EXPIRED_OR_INVALID`: *"O certificado de registro no MAPA está vencido, ilegível ou não contempla a atividade de manipulação veterinária."*
  2. `CRMV_COMPANY_INCONSISTENT`: *"A certidão de inscrição da empresa perante o CRMV não corresponde à UF do estabelecimento ou encontra-se cancelada/suspensa."*
  3. `TECHNICAL_RESPONSIBLE_IRREGULAR`: *"A Certidão de Regularidade Técnica (CRT) do Responsável Técnico não foi apresentada ou não comprova vínculo com o estabelecimento."*
  4. `ILLEGIBLE_OR_INCOMPLETE_DOCUMENTS`: *"Os documentos anexados apresentam rasuras, cortes ou baixa resolução que impedem a conferência formal."*
- **Efeito Imediato**:
  - A capacidade passa para `REJECTED`;
  - A farmácia é notificada com o motivo da recusa e instruída a reenviar nova solicitação com documentos corrigidos;
  - Mantém bloqueio de visualização de receitas veterinárias.

### 4.3 Suspensão Preventiva de Capacidade (`status = SUSPENDED`)
- **Critério**: Ocorrência superveniente que comprometa a idoneidade ou conformidade sanitária de uma farmácia previamente homologada (`VERIFIED`).
- **Gatilhos para Suspensão**:
  - Notificação de auto de infração, interdição cautelar ou cancelamento de licença pelo MAPA, CRMV ou Vigilância Sanitária;
  - Vencimento de certidões anuais de regularidade sem apresentação tempestiva de comprovante de renovação;
  - Reincidência de notificações de eventos adversos graves em animais ou desvios em fórmulas sob controle especial.
- **Efeito Imediato e Salvaguarda Operacional**:
  - A capacidade passa para `SUSPENDED`;
  - A farmácia perde imediatamente o acesso ao mural de receitas veterinárias e fica bloqueada de emitir novas cotações;
  - **PRESERVAÇÃO INTEGRAL DE PEDIDOS**: Todos os pedidos veterinários já aprovados por tutores permanecem no estado ativo para que a farmácia os conclua e entregue, ressalvada expressa determinação sanitária em contrário;
  - Pedidos permanecem visíveis para o ADMIN no painel para fins de fiscalização e proteção do consumidor.

---

## 5. Resumo de Itens que Bloqueiam a Homologação sem Parecer Jurídico

> **RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA**

1. **Validação de Farmácias com Decisão Judicial Dispensando CRMV**:
   - Algumas farmácias magistrais possuem liminares judiciais dispensando a inscrição no CRMV quando já registradas no CRF e no MAPA. O analista NÃO deve aprovar nem recusar tais casos sem prévio parecer da assessoria jurídica da MedConnect.
2. **Receitas Emitidas por Veterinários de Outra UF**:
   - Definição pelo jurídico se a farmácia de uma determinada UF pode cotar e aviar receitas emitidas por médico veterinário registrado em outro estado sem necessidade de visto provisório do CRMV.
