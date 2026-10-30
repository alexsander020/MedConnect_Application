# Roteiro de Verificação Manual — Painel de Verificação por Capacidade (Etapa V3)

Este roteiro descreve o passo a passo para validar manualmente o fluxo de **Verificação por Capacidade (`VETERINARY_COMPOUNDING`)** na interface da **Farmácia** e no **Painel Regulatório ADMIN**.

---

## Pré-requisitos de Ambiente

1. No arquivo `backend/.env`, certifique-se de que a flag veterinária esteja habilitada:
   ```env
   VET_ENABLED=true
   VET_CONTROLLED_ENABLED=false
   VET_ALLOW_FOOD_PRODUCING=false
   ```
2. Inicie o backend e o frontend:
   ```bash
   # Terminal 1 (Backend)
   cd backend && npm run dev

   # Terminal 2 (Frontend)
   cd MedConnect && npm run dev
   ```

---

## Passo 1 — Solicitação pela Farmácia (Preservando a Capacidade Humana)

1. Acesse `/login` e autentique-se com uma conta de **Farmácia** já verificada para manipulação humana (`PHARMACY`).
2. Na tela inicial do painel da farmácia (`/pharmacy`), localize o card **"Capacidade de Manipulação Veterinária (MAPA / CRMV)"**.
3. Clique em **"Solicitar Capacidade Veterinária"**.
4. Preencha o formulário na modal:
   - **Número de Registro no MAPA**: ex. `SP-12345-6`
   - **Registro da Empresa no CRMV**: ex. `54321` e **UF**: `SP`
   - **Nome do Responsável Técnico (RT)**: ex. `Dra. Camila Farmacêutica`
   - **CRF do Responsável Técnico**: ex. `98765` e **UF**: `SP`
   - **Documentos de Evidência (PDF/JPG/PNG)**: anexe 1 ou mais arquivos válidos.
5. Clique em **"Enviar para Verificação"**.
6. **Resultado esperado**:
   - O status exibido no card muda para `PENDING_VERIFICATION`.
   - Acesse `/pharmacy/requests` e confirme que **as receitas humanas continuam visíveis e cotáveis normalmente** (a capacidade humana existente não foi afetada), enquanto receitas veterinárias ainda não aparecem.

---

## Passo 2 — Conferência Documental, CNPJ, Evidência Assinada e Aprovação pelo ADMIN

1. Autentique-se com uma conta **ADMIN** e acesse `/admin`.
2. Na aba **"Capacidades (MAPA / CRMV)"**:
   - Selecione os filtros **Tipo de Capacidade**: `Manipulação Veterinária (MAPA/CRMV)` e **Status**: `Pendente de Verificação`.
3. No card da solicitação da farmácia:
   - Clique em **"Situação CNPJ"** para consultar a situação cadastral reutilizando o serviço `CnpjLookup` da Fase 2.2.
   - Clique em **"Abrir Evidência #1 (URL Assinada)"**:
     - Uma nova aba abrirá o arquivo através da rota assinada temporária (`/api/admin/capabilities/:id/evidences/0/view?token=...&expires=...`, válida por 5 minutos).
     - Verifique que nunca há URL pública exposta e que a abertura registrou um evento `VIEW_CAPABILITY_EVIDENCE` na trilha de auditoria (`GET /api/admin/audit-logs`).
4. Clique em **"Aprovar"**:
   - Na modal de conferência, tente confirmar sem marcar o checklist e observe o bloqueio.
   - Marque os 3 itens obrigatórios do checklist:
     - `[x] Registro MAPA conferido`
     - `[x] CRMV da empresa conferido`
     - `[x] RT e CRF conferidos`
   - Clique em **"Confirmar Aprovação"**.
5. **Resultado esperado**:
   - A capacidade passa para `VERIFIED`.
   - A farmácia recebe uma notificação (`CAPABILITY_APPROVED`) sem dados sensíveis no texto.
   - Ao acessar `/pharmacy/requests` como a farmácia, as receitas veterinárias passam a ser exibidas imediatamente no mural.

---

## Passo 3 — Suspensão de Capacidade `VERIFIED` e Sobrevivência de Pedidos Existentes

1. Com a capacidade `VERIFIED`, envie uma cotação veterinária pela farmácia e aprove-a com a conta do **Tutor** (`/quote-offers`), gerando um pedido ativo em `PRODUCTION`.
2. Volte ao painel **ADMIN** (`/admin`), filtre por **Status**: `Verificada (Ativa)` e clique em **"Suspender Capacidade"** na farmácia.
3. Tente confirmar sem preencher o motivo e verifique que o sistema exige motivo obrigatório.
4. Informe o motivo (ex.: *"Suspensão cautelar para renovação de certidão CRMV"*) e confirme.
5. **Resultado esperado**:
   - O status muda imediatamente para `SUSPENDED` e a farmácia recebe a notificação `CAPABILITY_SUSPENDED`.
   - A farmácia **não consegue mais listar nem enviar novas cotações** para receitas veterinárias abertas (`403 CAPABILITY_REQUIRED`).
   - O pedido veterinário já criado **permanece intacto**:
     - Continua visível para a farmácia em `/pharmacy/orders` e pode avançar para `DELIVERY` e `DELIVERED`.
     - Continua visível para o ADMIN na aba **"Pedidos Existentes"** em `/admin`.

---

## Passo 4 — Recusa com Motivo Obrigatório

1. Para uma solicitação em `PENDING_VERIFICATION`, clique em **"Recusar"** no painel `/admin`.
2. Informe o motivo obrigatório e confirme.
3. **Resultado esperado**:
   - O status muda para `REJECTED`, gravando quem fez, quando e o motivo em `AuditLog`.
   - A farmácia recebe a notificação `CAPABILITY_REJECTED` e vê o botão **"Reenviar Documentação Veterinária"** em seu painel.

