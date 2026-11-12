# ADR 019: Gestão de Contas (Suspensão), Horários de Atendimento das Farmácias e Chamados de Suporte

## Status
Aceito

## Contexto
Para operar o piloto, a equipe precisa de um painel administrativo real e as farmácias precisam de uma vitrine pública confiável:
1. O administrador não tinha como **suspender** uma conta (paciente ou farmácia) em caso de fraude, uso indevido ou documentação vencida — a única alavanca era a verificação regulatória da farmácia (`verificationStatus`), que tem outro significado.
2. O paciente não sabia **se a farmácia estava aberta** nem quando abriria; o Brasil tem vários fusos (America/Sao_Paulo, America/Manaus, America/Cuiaba, America/Rio_Branco, America/Noronha) e as farmácias têm pausa de almoço e sábado em meio período.
3. Não havia **canal de suporte** rastreável. Mensagens de suporte são texto livre e o titular frequentemente descreve o próprio tratamento — ou seja, podem conter **dado pessoal sensível de saúde** (LGPD art. 5º, II e art. 11).
4. O admin precisava consultar usuários, farmácias, pedidos e receitas sem violar a minimização de dados (LGPD art. 6º, III).

A migration `20261112041717_management_hours_support` cria os objetos desta decisão e segue o padrão do ADR 018 (CHECKs, RLS sem policies e comentários de catálogo no mesmo arquivo).

## Decisão

### 1. Modelo de suspensão de contas
- Novo enum `AccountStatus { ACTIVE, SUSPENDED }` em `User` e `Pharmacy`, **independente** de `verificationStatus`: uma farmácia pode estar `VERIFIED` e `SUSPENDED` ao mesmo tempo.
- Colunas `status`, `suspendedAt`, `suspensionReason` e `lastLoginAt`. CHECK no banco: `status = 'SUSPENDED'` ⇔ `suspendedAt IS NOT NULL`.
- `PATCH /api/admin/users/:id/status` e `PATCH /api/admin/pharmacies/:id/status` (`src/services/accountStatusService.ts`):
  - suspender exige motivo de 5 a 500 caracteres e **revoga todos os refresh tokens** do titular;
  - reativar limpa `suspendedAt` e `suspensionReason` — o histórico completo fica no `AuditLog` (`ADMIN_SUSPEND_USER`, `ADMIN_REACTIVATE_USER`, `ADMIN_SUSPEND_PHARMACY`, `ADMIN_REACTIVATE_PHARMACY`);
  - o admin não pode suspender a si mesmo (400 `CANNOT_SUSPEND_SELF`) nem outro administrador (403 `CANNOT_SUSPEND_ADMIN`);
  - a farmácia recebe notificação (`ACCOUNT_STATUS_UPDATE`) na suspensão e na reativação.
- Autenticação:
  - `POST /api/auth/login`: conta suspensa → 403 `ACCOUNT_SUSPENDED`, **somente depois** de a senha ser validada. A comparação com hash fictício para contas inexistentes foi mantida, então e-mail inexistente, senha errada e conta suspensa com senha errada continuam indistinguíveis (401 `INVALID_CREDENTIALS`).
  - `POST /api/auth/refresh`: conta suspensa → 401 `ACCOUNT_SUSPENDED` e revogação da família. A verificação acontece **antes** da detecção de reuso, porque a suspensão já revogou os tokens e o cliente precisa saber o motivo real do encerramento.
  - Login bem-sucedido grava `lastLoginAt`.

#### Por que o access token continua válido por até 15 minutos após a suspensão
O `authMiddleware` é **stateless**: valida apenas a assinatura e a expiração do JWT, sem consultar o banco. Bloquear a conta imediatamente exigiria uma consulta (ou cache) em **toda** requisição autenticada. Como o access token expira em 15 minutos (ADR 012) e o refresh token — o ponto de revogação — é invalidado no ato da suspensão, a janela de exposição é limitada e conhecida. Decidimos aceitar essa janela no piloto. O mesmo vale para a troca de senha (as outras sessões perdem o refresh token, mas um access token já emitido vive até expirar).

Evoluções possíveis, se a janela deixar de ser aceitável: (a) verificar `status` no middleware com cache curto; (b) claim `tokenVersion` incrementada na suspensão e comparada no middleware; (c) lista de bloqueio em Redis (o `ioredis` já é dependência do adapter do Socket.io).

### 2. Horários de atendimento: minutos + fuso IANA
- Tabela `PharmacyBusinessHour (pharmacyId, dayOfWeek, opensAt, closesAt)` com **minutos desde 00:00** (`Int`) e `Pharmacy.timezone` com um fuso **IANA** (padrão `America/Sao_Paulo`).
  - Minutos inteiros tornam comparação, ordenação, detecção de sobreposição e CHECKs triviais e evitam os tipos `TIME`/`TIMESTAMP`, que o Prisma devolve como `Date` (01/01/1970) e que misturam fuso do servidor com fuso da farmácia.
  - O fuso IANA, interpretado com `Intl.DateTimeFormat`, cobre os vários fusos brasileiros e eventuais mudanças de regra de horário de verão sem código próprio.
- `dayOfWeek` segue `Date.getDay()` (0 = domingo … 6 = sábado). Vários intervalos por dia (pausa de almoço), no máximo 4, sem sobreposição; intervalos encostados (12:00–12:00) são permitidos. Dia sem linhas = fechado.
- Na API os horários trafegam como `"HH:MM"`; `"24:00"` só é aceito como fechamento. CHECKs no banco: `dayOfWeek BETWEEN 0 AND 6`, `0 <= opensAt < 1440`, `opensAt < closesAt <= 1440`.
- Toda a regra vive no módulo **puro** `src/domain/businessHours.ts` (sem banco nem relógio: o instante e o fuso são parâmetros), coberto por testes unitários. `PUT /api/pharmacy/me/hours` substitui a grade inteira numa transação; erros retornam 400 com `INVALID_TIME_FORMAT`, `INVALID_DAY_OF_WEEK`, `INVALID_INTERVAL`, `OVERLAPPING_INTERVALS`, `TOO_MANY_INTERVALS` ou `INVALID_TIMEZONE`.
- `openStatus` (`isOpen`, `closesAt`, `nextOpening` com `isToday`/`isTomorrow`) é **calculado no servidor**, para que web e futuros apps mostrem exatamente o mesmo estado sem bibliotecas de fuso no cliente. Intervalos encostados no mesmo dia são unidos no `closesAt`.
- Limitações aceitas: intervalos que cruzam a meia-noite precisam ser divididos (22:00–24:00 + 00:00–02:00 do dia seguinte) e o `closesAt` exibido será `"24:00"`; não há feriados/exceções (evolução: tabela de exceções por data).

### 3. Vitrine pública
`GET /api/pharmacies/public` lista somente farmácias `VERIFIED` **e** `ACTIVE`, sem e-mail, CNPJ, telefone ou endereço (o contato só é liberado após o aceite da cotação, como já ocorria). Inclui média e quantidade de avaliações (`averageRating = 0` quando não há avaliações), horários e `openStatus`; aceita `search`, `city` e `openNow`. Teto defensivo de 200 itens por ser uma rota anônima.

### 4. Chamados de suporte (podem conter dados de saúde)
- Tabela `SupportTicket` com protocolo legível `MC-AAAAMMDD-XXXXX` (data no fuso de São Paulo; sufixo de 5 caracteres de um alfabeto base32 sem `0/O/1/I`, gerado com `crypto.randomInt`; nova tentativa em caso de colisão).
- `POST /api/support/tickets` é público, com **rate limit próprio** de 5 chamados por 15 minutos por IP. Com `Bearer` válido, o chamado é vinculado ao titular e usa o nome/e-mail **da conta** (o corpo não pode se passar por outra pessoa); sem login, nome e e-mail são obrigatórios. CHECKs: no máximo um dono (`userId` ou `pharmacyId`), assunto de 3 a 160 e mensagem de 10 a 5000 caracteres.
- Como a mensagem pode conter dado de saúde:
  - a listagem administrativa mostra apenas uma **prévia de 140 caracteres**;
  - a leitura completa grava `ADMIN_VIEW_SUPPORT_TICKET` no `AuditLog` e cada atualização grava `ADMIN_UPDATE_SUPPORT_TICKET` (sem copiar o conteúdo para `details`);
  - a notificação ao titular informa só protocolo e status, nunca o texto;
  - a exportação de dados do titular (LGPD art. 18, II e V) inclui os chamados, e a anonimização (art. 18, VI) remove nome, e-mail, assunto, mensagem e resolução, preservando protocolo, categoria, status e datas.
- `RESOLVED`/`CLOSED` preenchem `resolvedAt` (mantido se já existia); voltar para `OPEN`/`IN_PROGRESS` o limpa. `handledById` registra o admin que tratou.

### 5. Leituras administrativas com minimização e auditoria
- Listagens (`/api/admin/users`, `/pharmacies`, `/orders`, `/prescriptions`, `/support-tickets`) são paginadas (`{ data, total, page, limit, totalPages }`, limite máximo 100) e omitem dados de contato.
- Detalhes que expõem dados pessoais gravam auditoria: `ADMIN_VIEW_USER` (telefone/endereço decifrados e consentimentos) e `ADMIN_VIEW_PHARMACY`.
- A listagem de receitas **nunca** retorna `fileUrl`; o arquivo continua acessível só pelo fluxo de URL assinada com HMAC e expiração (`src/services/prescriptionSecurity.ts`).
- `GET /api/admin/overview` devolve apenas contagens agregadas e uma série diária de 14 dias (fuso de São Paulo, dias zerados incluídos).

### 6. Conta própria e termos
- `GET/PATCH /api/users/me` (telefone e endereço cifrados com AES-256-GCM) e `GET/PATCH /api/pharmacy/me` (nome, CNPJ e e-mail não editáveis, por serem dados de credenciamento).
- `POST /api/auth/change-password` exige a senha atual, aplica a política de senha forte, preserva a família da sessão atual (quando o cookie de refresh é enviado), revoga as demais e grava `PASSWORD_CHANGED`. Usa o mesmo limitador das rotas de credencial.
- Cadastro de paciente registra o consentimento versionado `TERMS_AND_PRIVACY` (salvo `termsAccepted: false`), além de `HEALTH_DATA_PROCESSING`. Cadastro de farmácia aceita `termsAccepted`, `city` e `state` (UF normalizada) e grava `termsAcceptedAt` e `termsVersion = 'v1.0.0'` do Termo de Adesão.

## Consequências
- **Positivas**: o admin passa a ter alavancas operacionais auditadas sem mexer na verificação regulatória; a vitrine pública mostra horários corretos em qualquer fuso; o suporte ganha protocolo, histórico e tratamento compatível com dado de saúde; o domínio de horários é puro e testável; o banco reforça as mesmas regras por CHECK e mantém a Data API do Supabase fechada (RLS nas tabelas novas).
- **Negativas**: janela de até 15 minutos em que um access token emitido antes da suspensão ainda funciona; grade de horários sem feriados e sem intervalos que cruzam a meia-noite; o rate limit do suporte é por IP em memória (não compartilhado entre instâncias — o mesmo limite dos demais limitadores, ADR 009); retenção e base legal dos chamados de suporte ainda dependem de validação jurídica (`docs/lgpd/inventario-de-dados.md`).
