# Roteiro de Verificação Manual — Etapa V5 (Frontend da Farmácia e do ADMIN)

Este documento descreve o procedimento passo a passo para conferência manual das funcionalidades da **Etapa V5**, cobrindo os três papéis do sistema: **Farmácia**, **ADMIN** e **Tutor**.

---

## Pré-requisitos
- Flags de ambiente ativas:
  - `VET_ENABLED=true`
  - `VET_CONTROLLED_ENABLED=true`
- Usuários de teste:
  - **Tutor**: `tutor@medconnect.com`
  - **Farmácia Padrão (Sem capacidade vet)**: `farmacia@medconnect.com`
  - **Farmácia Vet**: `farmaciavet@medconnect.com`
  - **ADMIN**: `admin@medconnect.com`

---

## 1. Roteiro da Farmácia

### 1.1 Solicitação e Gestão da Capacidade Veterinária (`/pharmacy/veterinary-capability`)
1. **Acesso ao Menu**:
   - Faça login como Farmácia.
   - No menu lateral (Desktop) ou de navegação, clique em **"Habilitação Vet"**.
   - Se `VET_ENABLED=false`, a opção não deve aparecer e o acesso direto deve exibir aviso de funcionalidade desativada.
2. **Formulário de Habilitação Inicial**:
   - Quando a farmácia ainda não possui capacidade cadastrada ou está sem solicitação, o status inicial é exibido com o formulário de cadastro.
   - Preencha:
     - **Registro no MAPA**: Formato válido de estabelecimento veterinário (ex: `SP-001234-5`).
     - **CRMV da Empresa**: Número (ex: `12345`) e UF (ex: `SP`).
     - **Responsável Técnico**: Nome completo (ex: `Dr. Marcos Silva`) e CRF/UF (ex: `CRF-SP 43210`).
     - **Upload de Evidências**: Selecione documentos comprobatórios (PDF/JPEG/PNG). Verifique que a chave de arquivo é enviada de forma privada (sem URL pública).
   - Clique em **"Enviar Solicitação de Habilitação"**.
3. **Status PENDENTE**:
   - Após envio, o card deve exibir badge amarelo **"Pendente de Análise"**.
   - Mensagem clara informando que o time de compliance do MedConnect está avaliando os documentos e que novas cotações veterinárias ficam aguardando a liberação.
4. **Comportamento em Telas Operacionais enquanto Pendente**:
   - Acesse `/pharmacy/requests`.
   - Ao filtrar por receitas **"Veterinárias"**, a tela deve exibir banner explicativo: *"Sua farmácia ainda não possui habilitação veterinária ativa"*, impedindo a visualização de prescrições e orçamentos veterinários até aprovação.

### 1.2 Recebimento e Cotação de Receita Veterinária (`/pharmacy/requests` e `/pharmacy/send-quote/:id`)
*(Após aprovação da capacidade pelo ADMIN)*
1. **Lista de Requisições**:
   - Acesse `/pharmacy/requests`.
   - Observe a presença dos selos **"Humano"** vs **"Veterinário"**.
   - Para requisição veterinária, verifique:
     - Identificação da espécie (ex: `Cão`, `Gato`, `Ave`), raça, peso formatado em kg (ex: `15.5 kg`) e idade aproximada.
     - Prescritor: Nome do veterinário e CRMV/UF.
     - Alerta visual **"Conferir documento"** quando se tratar de notificação controlada (`requiresManualDocumentCheck = true`).
     - **LGPD / Privacidade**: Certifique-se de que nenhum dado de contato do tutor (telefone, e-mail, endereço residencial) está exposto antes da aceitação da cotação.
2. **Envio da Cotação Veterinária**:
   - Clique em **"Enviar Cotação"**.
   - Verifique os campos específicos liberados:
     - **Forma Farmacêutica**: Biscoito palatável, pasta oral, suspensão flavorizada, cápsula, etc.
     - **Aromatização / Sabor**: Sabor carne, frango, peixe, bacon, etc.
     - **Prazo de Manipulação**: Dias úteis necessários para manipulação veterinária.
     - **Preço**: Entrada formatada em R$, convertida em centavos no backend.
   - Envie a proposta.

### 1.3 Gestão de Pedidos Veterinários (`/pharmacy/orders`)
1. Acesse a aba **"Production"** ou `/pharmacy/orders`.
2. Localize o pedido originado da receita veterinária após aprovação pelo tutor.
3. Observe:
   - Selo **"Veterinário"** e resumo do pet (nome, espécie, raça, peso).
   - **Liberação LGPD dos dados de entrega**: Após o aceite, telefone e endereço do tutor tornam-se visíveis para permitir a entrega e contato da farmácia.
   - Máquina de estados: avanço de `PRODUCTION` -> `DELIVERY` -> `DELIVERED`.

---

## 2. Roteiro do ADMIN

### 2.1 Painel de Capacidades Veterinárias (`/admin` -> Aba "Capacidades")
1. **Acesso Restrito**:
   - Faça login com usuário de perfil `ADMIN`.
   - Certifique-se de que outros perfis (tutor ou farmácia) recebem erro 403 ao tentar acessar `/admin`.
2. **Listagem e Filtros**:
   - Acesse a aba **"Capacidades"**.
   - Filtre por tipo (`VETERINARY_COMPOUNDING`) e status (`PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`, `SUSPENDED`).
3. **Análise de Evidências por URL Assinada**:
   - Abra a solicitação da farmácia.
   - Clique em **"Abrir Documento"**.
   - Verifique que a URL aberta é temporária/assinada e que a ação foi registrada no `AuditLog`.
4. **Checklist de Conferência**:
   - Marque os itens do checklist antes da tomada de decisão:
     - [x] Registro MAPA conferido
     - [x] CRMV da empresa conferido
     - [x] RT e CRF conferidos
5. **Aprovação**:
   - Clique em **"Aprovar Capacidade"**.
   - O status é alterado para `VERIFIED`. Farmácia recebe notificação (sem vazamento de dados sensíveis).
6. **Recusa com Motivo Obrigatório**:
   - Em caso de inconsistência, selecione **"Recusar"**.
   - O sistema deve exigir justificativa obrigatória (ex: "CRMV inativo ou divergente").
   - A farmácia é notificada com o motivo para que possa reenviar.
7. **Suspensão com Preservação de Pedidos**:
   - Para uma capacidade `VERIFIED`, clique em **"Suspender"** informando o motivo (ex: "Licença MAPA vencida").
   - A capacidade passa para `SUSPENDED`.
   - **Regra Crítica**: A farmácia suspensa perde acesso a novas cotações e novas listagens, mas todos os pedidos já em andamento permanecem íntegros para conclusão e visualização pelo ADMIN.

---

## 3. Roteiro do Tutor

1. **Gestão de Pets**:
   - Acesse `/my-pets` e verifique a listagem e edição dos seus animais.
2. **Nova Cotação**:
   - Acesse `/new-quote`. Alterne entre "Para mim" (humano) e "Para meu pet" (veterinário).
   - Ao selecionar o pet, anexe a receita veterinária com CRMV do prescritor.
3. **Visualização de Propostas**:
   - Acesse `/quote-offers` e verifique as propostas recebidas identificadas com selo **"Veterinário"**, forma farmacêutica e sabor ofertado pela farmácia.
4. **Aprovação e Pedido**:
   - Clique em "Aprovar Cotação". O pedido é criado mantendo o fluxo e liberando o endereço de entrega para a farmácia manipuladora.

