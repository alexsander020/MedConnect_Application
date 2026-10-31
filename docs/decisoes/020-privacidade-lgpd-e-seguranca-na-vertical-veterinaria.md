# ADR 020: Privacidade LGPD e Segurança da Informação na Vertical Veterinária

## Status
Aceito

## Contexto
Na vertical veterinária, embora o animal não seja titular de dados pessoais perante a LGPD (Lei 13.709/2018), o tutor (pessoa natural responsável) e os prescritores (médicos veterinários com CRMV) possuem direitos fundamentais protegidos. Adicionalmente, receitas veterinárias e prontuários contêm informações sensíveis de localização, rotinas e capacidade financeira do tutor, bem como dados passíveis de exploração indevida.

## Decisão

1. **Privacidade por Design (Privacy by Design) no Mural de Cotações**:
   - As farmácias credenciadas visualizam exclusivamente os dados estritamente necessários para a elaboração do orçamento: espécie, raça, idade aproximada, peso formatado em kg, forma farmacêutica solicitada e prescritor (nome e CRMV/UF).
   - **Ocultamento Compulsório de Contato**: Nome do tutor, telefone, e-mail e endereço de entrega residencial são rigorosamente removidos do payload de listagem de cotações (`GET /api/prescriptions/pharmacy`).
   - Somente após o tutor aprovar a proposta e criar o pedido (`status = PRODUCTION`) os dados logísticos de entrega são liberados para a farmácia manipuladora.

2. **Upload Privado de Evidências Regulatórias (MAPA / CRMV / CRF)**:
   - Os documentos comprobatórios de credenciamento sanitário da farmácia (registro no MAPA, CRMV-PJ e CRF do responsável técnico) são armazenados em repositório privado via identificadores opacos (`evidenceFileKeys`).
   - Não são geradas nem expostas URLs públicas diretas.
   - O acesso pelo time de compliance (ADMIN) ocorre exclusivamente por meio de URLs assinadas de curta duração (HMAC-SHA256, validade máxima de 15 minutos), com registro compulsório em `AuditLog`.

3. **Consentimento Específico e Versionado**:
   - Reutilização da infraestrutura de consentimento da Fase 4 (`ConsentService`), com termo versionado contemplando expressamente o tratamento de dados cadastrais do tutor e das prescrições de seus animais.
   - O titular pode consultar e revogar o consentimento a qualquer momento via portal do tutor (`/consent`).

4. **Trilha de Auditoria Imutável (`AuditLog`)**:
   - Todas as operações críticas na vertical registram autor, papel, IP, recurso, ação e motivo:
     - `UPLOAD_VET_PRESCRIPTION`
     - `REQUEST_VETERINARY_CAPABILITY`
     - `APPROVE_PHARMACY_CAPABILITY`
     - `REJECT_PHARMACY_CAPABILITY`
     - `SUSPEND_PHARMACY_CAPABILITY`
     - `VIEW_CAPABILITY_EVIDENCE`
   - O endpoint `/api/audit-logs` é imutável (`405 Method Not Allowed` para mutações).

5. **Observabilidade Isenta de PII e Dados de Saúde**:
   - Métricas e logs estruturados da vertical veterinária (`[VET_OBSERVABILITY]`) passam por rotina de higienização compulsória que remove recursivamente nomes, CPFs, e-mails, telefones, endereços, textos de prescrição e diagnósticos.

## Consequências
- Conformidade total com a LGPD e resoluções do CFMV/MAPA.
- Minimização de riscos de vazamento de dados e fraudes contra tutores.
