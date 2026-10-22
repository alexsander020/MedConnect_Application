# Diário de Bordo - MedConnect

Este diário de bordo documenta o processo de desenvolvimento e os desafios superados durante a criação do projeto MedConnect e dos desafios propostos.

## Desafio 1: TDD na Prática — Biblioteca de Validação
**Objetivo:** Criar funções de validação escrevendo testes ANTES do código (Red → Green → Refactor).
**Prática:** Test-Driven Development (TDD)
**Valor:** Simplicidade + Feedback

Para garantir a qualidade, escrevemos uma suíte de testes unitários usando **Jest** (`validacoes.test.js`) cobrindo as funções `ehEmailValido`, `ehCPFValido` e `ehSenhaForte`. 
Garantimos a cobertura de casos positivos, negativos, e edge cases como strings vazias ou caracteres especiais. Após a criação dos testes (Red), implementamos as funções utilizando Expressões Regulares (RegEx) adequadas e cálculos lógicos para os dígitos verificadores do CPF (Green), garantindo um código simples e direto.

## Desafio 2: Pair Programming — App de Reserva de Cotações
**Objetivo:** Criar uma página HTML + CSS + JS baseada no conceito do MedConnect.
**Prática:** Pair Programming (Simulado com IA)

Desenvolvemos a interface `app-cotacao` utilizando Vanilla CSS sem frameworks adicionais. Focamos no design **Glassmorphism**, com animações fluidas (como os blobs animados em background), tipografia moderna (Outfit) e gradientes. A lógica em JavaScript foi feita de forma modular, reutilizando a regra de negócio da validação de e-mail do Desafio 1 e simulando uma chamada de API assíncrona com `setTimeout` para demonstração do Loader e tela de Sucesso.

## Desafio 3: Refatoração com Segurança — Código Legado
**Objetivo:** Refatorar código ruim usando testes como rede de segurança. Sem quebrar nada.
**Prática:** Refatoração com rede de testes
**Valor:** Coragem + Simplicidade

O arquivo original continha condicionais aninhados de difícil leitura e variáveis de nomeação pobre (`d`, `t`, `r`). Primeiramente, em `refatorar.test.js`, foram criados 6 testes para o método `processar` cobrindo todas as matrizes de decisão (VIP vs Normal e >500 vs <=500), e 2 testes para `formatar`.
Com a rede de testes ativa, o código foi reescrito melhorando as variáveis para `valor`, `tipo` e `resultado`. Utilizamos Operadores Ternários para deixar as regras condicionais evidentes e reduzidas, mantendo exatamente o mesmo comportamento original certificado pelos testes automatizados.

## Desafio 4: Integração Contínua + Hospedagem
**Objetivo:** Configurar CI básico e hospedar a página estática.
**Prática:** Integração Contínua
**Valor:** Feedback + Coragem

Para a integração contínua, criamos arquivos na pasta `.github/workflows`.
1. **ci.yml**: Configurado para instalar dependências do ecossistema e executar o `npm run test` a cada commit ou pull request nas ramificações principais, garantindo que nenhum teste (Desafio 1 e 3) quebre.
2. **deploy-pages.yml**: Automatiza a hospedagem da aplicação desenvolvida no Desafio 2 (na pasta `app-cotacao`), usando as Actions para gerar e fazer upload dos assets estáticos diretamente para a URL do **GitHub Pages**.

## Fase 1: Fundação Técnica do Backend & Integridade Transacional

A Fase 1 estabeleceu uma arquitetura de produção sólida para o MedConnect, garantindo integridade transacional, isolamento de concorrência e conformidade rigorosa com normas de segurança e LGPD:

### Tarefa 1.1: Migração PostgreSQL & Migrations Versionadas
- **Adoção do PostgreSQL**: Substituição do SQLite por PostgreSQL com enums nativos, isolamento Serializable e migrations SQL auditáveis (`20261021235746_init`).
- **Isolamento de Testes**: Banco dedicado `medconnect_test` provisionado automaticamente com purge transacional por suíte.
- **ADR 010**: Documentação formal da migração.

### Tarefa 1.2: Integridade Cotação → Pedido (TDD)
- **Concorrência Segura**: Aprovação de cotação executada sob transação `Serializable`, garantindo que requisições simultâneas gerem exatamente um único pedido e convertendo conflitos (P2002/P2034) em HTTP 409 Conflict.
- **Regras de Negócio**: Validação anti-IDOR da receita pelo paciente autenticado; cotações concorrentes marcadas como `REJECTED`; guarda exigindo farmácia com verificação ativa (`verified: true`).

### Tarefa 1.3: Máquina de Estados do Pedido & Auditoria
- **Matriz de Estados**: Implementação em `orderStateMachine.ts` permitindo estritamente `PRODUCTION -> DELIVERY`, `DELIVERY -> DELIVERED` e `PRODUCTION -> CANCELLED` (qualquer outra combinação resulta em HTTP 409).
- **Trilha de Auditoria**: Tabela `OrderStatusHistory` registrando compulsoriamente cada transição com ator (`changedByType`) e carimbo de data/hora.
- **Definição de Produto Alinhada**: Apenas a farmácia responsável pelo pedido pode atualizar o status ou cancelar (evitando desperdício de insumos já manipulados); o paciente titular possui permissão apenas de leitura e acompanhamento.
- **ADR 011**: Documentação formal da máquina de estados e auditoria.

### Tarefa 1.4: Dinheiro e CPF (LGPD)
- **Aritmética Inteira**: Preços armazenados em `priceCents` (Int), com conversão na borda da API para string decimal (`123.45`), eliminando bugs de precisão IEEE 754 Float.
- **Proteção de CPF**: Decisão confirmada de manter o CPF do paciente sob estrita conformidade com a LGPD: criptografia com chave forte AES-256-GCM (`cpfEncrypted`), hash determinístico HMAC-SHA256 para consultas indexadas (`cpfHash`), exibição mascarada (`***.***.***-XX`) e validação algorítmica dos dígitos verificadores.

### Tarefa 1.5: Autenticação Robusta & Sessão Segura
- **Tokens**: Access Token JWT de 15 minutos em memória e Refresh Token opaco rotativo em cookie HttpOnly com SameSite e detecção de reuso de família (revogação imediata em caso de comprometimento).
- **Proteção Anti-Enumeração**: Endpoints de recuperação de senha retornam mensagens idênticas para e-mails existentes ou não, com cálculo de hash fictício contra timing attacks.
- **Envio de E-mail**: Interface `EmailSender` com `ConsoleEmailSender` para desenvolvimento e `SmtpEmailSender` via Nodemailer configurável por variáveis de ambiente para produção.
- **ADR 012**: Documentação formal da autenticação robusta.

### Tarefa 1.6: Validação, Tratamento Central de Erros e Logs
- **Zod & Middleware**: Validação desacoplada de `body`, `params` e `query`.
- **Tratamento de Erros**: Respostas 500 genéricas no formato `{ error: { code, message } }`, blindando detalhes internos e stacks.
- **Pino com Redaction**: Mascaramento automático de `authorization`, `cookie`, `password`, `token`, `cpf`, `phone` e `address` nos logs estruturados, associados ao `X-Request-Id`.

## Fase 2: Produto Real (Branch: `fase-2-produto`)

A Fase 2 concluiu a transição da aplicação para um produto 100% real, com dados conectados ao banco, eliminação completa de mocks, auditoria rigorosa, privacidade LGPD e fluxo operacional completo:

### Tarefa 2.1: Eliminação Total dos Mocks & Adoção de TanStack Query
- **Auditoria de Mocks**: Mapeados e eliminados todos os imports de `mockData.js` no frontend (`Dashboard.jsx`, `OrderTracking.jsx`, `QuoteOffers.jsx`, `SendQuote.jsx`, `Reviews.jsx`, `OrderManagement.jsx`). O arquivo `MedConnect/src/data/mockData.js` foi completamente apagado (`grep -r mockData MedConnect/src` retorna vazio).
- **TanStack Query v5**: Implementado com cache reativo, tratamento de estados de carregamento, erro e dados vazios em todas as telas.
- **Invalidação via Socket.IO**: Eventos push (`new_quote`, `quote_accepted`, `order_status_updated`, `notification`) invalidam automaticamente as consultas em cache.
- **Novos Endpoints Reais**: Criados e documentados no Swagger: `GET /orders/:id`, `GET /prescriptions/:id`, `GET /prescriptions/:id/quotes` e `GET /pharmacy/stats`.

### Tarefa 2.2: Verificação Regulatória de Farmácias & Painel Admin
- **Modelo Pharmacy Estendido**: Adicionados `verificationStatus` (`PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`), campos de licença sanitária, autorização de funcionamento (AFE/ANVISA), dados do responsável técnico (nome, CRF, UF), URL de comprovante e trilha de auditoria (`verifiedById`, `verifiedAt`, `rejectionReason`).
- **Guarda Farmácia Verificada**: Bloqueio compulsório (HTTP 403 `PHARMACY_NOT_VERIFIED`) em `GET /prescriptions/pharmacy` e `POST /quotes` para farmácias pendentes ou reprovadas.
- **Consulta CNPJ**: Interface `CnpjLookup` com suporte a `BrasilApiCnpjLookup` e `MockCnpjLookup`, registrando a situação cadastral na criação.
- **Painel ADMIN**: Endpoints `GET /admin/pharmacies/pending` e `PATCH /admin/pharmacies/:id/verify`, associados à tela visual para aprovação/rejeição com registro do administrador.

### Tarefa 2.3: Privacidade e Segurança de Receitas (LGPD Art. 11)
- **Armazenamento Privado & URLs Assinadas**: URLs com expiração curta de 5 minutos geradas unicamente para o paciente dono e para a farmácia vencedora da cotação.
- **Auditoria Compulsória**: Tabela `PrescriptionAccessLog` registrando quem acessou, qual receita, data/hora e IP do requisitante.
- **Validação por Magic Bytes**: Rejeição de executáveis disfarçados de PDF (bytes `MZ`/`ELF`), aceitando apenas cabeçalhos reais de PDF, JPEG e PNG.
- **Proteção de Privacidade**: Sanitização e remoção de metadados EXIF de fotografias de receitas e ponto de extensão `MalwareScanner` para integração com antivírus.

### Tarefa 2.4: Avaliações (Reviews) & Notificações Acessíveis
- **Módulo de Avaliações**: Modelo `Review` (pedido único, nota 1-5, comentário). Validação estrita: somente o paciente titular pode avaliar, e apenas após o pedido estar no status `DELIVERED`. Duplicidades rejeitadas com HTTP 409.
- **Notificações Persistidas**: Tabela `Notification` no PostgreSQL (`userId`/`pharmacyId`, tipo, mensagem, status de leitura) com endpoints para listagem e marcação como lida.
- **Notificações no Frontend**: Componente de Toast acessível (`role="status"`, `aria-live="polite"`), substituindo diálogos `alert()`.
- **Socket.IO Redis Adapter**: Configurado com suporte a instâncias múltiplas atrás de flag (`USE_REDIS_SOCKET` ou `REDIS_URL`).

### Tarefa 2.5: Limpeza & Documentação
- Remoção do pacote `@supabase/supabase-js` e `src/lib/supabase.js`.
- Substituição do README padrão do Vite por documentação real do projeto.
- Migração de `legacy/` e `diario-de-bordo.md` para `docs/historico/`.

## Conclusão
Ao aplicar TDD, Refatoração Segura, Design Vanilla focado em estética, Integração Contínua e uma base de produção com PostgreSQL, atingimos um alto padrão de qualidade em código e produto no ecossistema MedConnect.

