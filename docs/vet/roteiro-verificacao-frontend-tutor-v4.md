# Roteiro de Verificação Manual — Frontend do Tutor (Etapa V4)

**Branch**: `vet-4-front-tutor`  
**Objetivo**: Validar a experiência completa do tutor no fluxo veterinário, garantia de fail-closed quando `VET_ENABLED=false`, validação e conversão de peso de animais, regras de animais destinados à produção/alimentação humana, upload de receita veterinária, prescritor CRMV e acompanhamento de cotações/pedidos.

---

## 1. Verificação de Fail-Closed (Flag `VET_ENABLED=false`)

1. No arquivo `.env` do backend, configure `VET_ENABLED=false`.
2. Acesse a aplicação logado como Paciente/Tutor (`http://localhost:5173/dashboard`).
3. **Comportamento Esperado**:
   - O Dashboard exibe apenas o card tradicional humano ("Solicitar Cotação"). O seletor "Para mim / Para meu pet" e o card "Para Meu Pet" não aparecem.
   - Na tela de Nova Cotação (`/new-quote`), o seletor Humano/Pet está oculto, exibindo o fluxo humano padrão idêntico ao original.
   - A rota `/my-pets` redireciona automaticamente para `/dashboard`.
   - O menu do Perfil (`/profile`) não exibe o atalho "Meus Pets".

---

## 2. Ativação da Vertical Veterinária (Flag `VET_ENABLED=true`)

1. Configure no `.env`:
   ```env
   VET_ENABLED=true
   VET_ALLOW_FOOD_PRODUCING=false
   VET_CONTROLLED_ENABLED=true
   ```
2. Recarregue a aplicação no navegador.
3. No Dashboard, verifique os novos atalhos:
   - "Para Mim (Humana)": direciona para nova cotação humana.
   - "Para Meu Pet (Veterinária)": direciona para nova cotação veterinária pré-selecionada.
   - "Meus Pets": direciona para a listagem e cadastro de animais.

---

## 3. Gestão de Animais ("Meus Pets" — `/my-pets`)

1. Acesse o menu **Perfil** -> **Meus Pets** ou navegue até `/my-pets`.
2. Se não houver animais cadastrados, verifique o estado vazio amigável (`EmptyState`).
3. Clique em **"Cadastrar Pet"**:
   - **Nome**: Preencha `Thor`.
   - **Espécie**: Selecione `Cachorro (Cão)`.
   - **Raça**: Preencha `Golden Retriever`.
   - **Peso em kg**: Digite `28.50`. Verifique na borda que a API receberá `28500` gramas.
   - **Animal de produção**: Marque a caixa `"Este animal é destinado à produção ou alimentação humana?"`.
   - **Validação de Produção**:
     - O sistema exibe o aviso regulatório do MAPA: *"Atendimento não disponível para animais de produção"*.
     - O botão "Salvar Pet" fica desabilitado, impedindo a submissão.
   - Desmarque a opção de produção e clique em **"Salvar Pet"**.
4. Verifique que o card de `Thor` aparece na lista exibindo:
   - Nome: Thor
   - Espécie: Cachorro (Cão)
   - Raça: Golden Retriever
   - Peso formatado: `28.5 kg`
5. Teste a edição (altere peso para `29.0 kg`) e verifique a atualização.
6. Teste a exclusão lógica clicando no ícone da lixeira com confirmação.

---

## 4. Nova Cotação Veterinária (`/new-quote`)

1. Acesse a tela de **Nova Cotação**.
2. Clique na aba seletora **"🐾 Para meu pet"**.
3. **Seleção do Pet**:
   - O dropdown lista os animais cadastrados do usuário (`Thor (DOG • 28.5 kg)`).
   - Há um atalho para gerenciar/cadastrar novos pets.
4. **Dados do Prescritor**:
   - Nome do Veterinário: `Dra. Mariana Costa`.
   - CRMV: Digite um valor inválido (ex: letras `ABC`). Tente submeter e confirme a mensagem de erro do pacote de validação: *"Informe um CRMV válido para a UF selecionada"*.
   - Corrija o CRMV para `12345` e UF `SP`.
5. **Tipo de Documento e Preferências**:
   - Tipo de Documento: Selecione `Receita Magistral Veterinária` (ou `Notificação de Receita Veterinária` se controlado).
   - Forma Farmacêutica: Selecione `Biscoito Medicamentoso` ou `Pasta Oral`.
   - Aromatização: Digite `Carne / Frango`.
6. **Aviso Regulatório**:
   - Verifique o disclaimer em destaque: *"Importante: A farmácia credenciada confere a receita e a plataforma não substitui a orientação do médico veterinário."*
7. **Upload e Consentimento**:
   - Anexe a imagem ou PDF da receita veterinária.
   - Verifique o texto de consentimento LGPD Art. 11 abrangendo dados do tutor e do animal.
   - Clique em **"Solicitar Orçamento Agora"**.
   - Confirme a exibição da tela de sucesso ("Receita Enviada!").

---

## 5. Propostas Recebidas e Pedidos (`/quote-offers` e `/orders`)

1. Acesse a tela de propostas recebidas (`/quote-offers`).
2. Propostas para receitas veterinárias apresentam:
   - Badge destacado **"Veterinário"**;
   - Resumo do animal paciente (`Thor • Canina`).
3. Clique em **"Aprovar Cotação e Fazer Pedido"**.
4. Na tela de Acompanhamento do Pedido (`/order-tracking/:id`), verifique:
   - Título: *"Pedido de Manipulação Veterinária"*;
   - Badge com o nome e espécie do pet.

---

## 6. Privacidade e LGPD no Perfil (`/profile`)

1. Acesse a tela de Perfil.
2. No card de **Privacidade e Seus Dados (LGPD Art. 18)**:
   - Clique em **"Exportar Meus Dados"**: confirme no JSON gerado a presença da chave `animais` com a lista dos pets cadastrados.
   - Em caso de solicitação de exclusão/anonimização, confirme que os registros de animais são anonimizados (`name: "Animal Anonimizado"`) e marcados com `deletedAt`.
