# ADR 012: Arquitetura de Autenticação Segura com Refresh Token Rotativo em Cookies HttpOnly e Prevenção de Ataques de Enumeração

## Status
Aceito

## Contexto
Na Fase 0 da aplicação MedConnect, a camada de autenticação apresentava vulnerabilidades arquiteturais típicas de MVPs iniciais:
1. Utilização de JWT de longa duração mantido em `localStorage` no navegador, tornando as credenciais vulneráveis a exfiltração em eventuais ataques de Cross-Site Scripting (XSS).
2. Ausência de suporte a rotação de tokens ou revogação real de sessão (logout apenas limpava o estado local do cliente).
3. Risco de enumeração de contas e timing attacks em endpoints de autenticação e recuperação de credenciais, onde diferenças de tempo de resposta revelavam a existência prévia de e-mails de pacientes ou farmácias.
4. Ausência de validação de e-mail e de fluxo seguro de redefinição de senhas com tokens de uso único.

## Decisão
1. **Separação de Access Token e Refresh Token**:
   - **Access Token**: JWT com tempo de expiração curto (15 minutos), mantido **exclusivamente em memória** na aplicação cliente React (`api.js` / `AuthContext.jsx`). Todas as referências a tokens no `localStorage` foram integralmente removidas.
   - **Refresh Token**: Token opaco de alta entropia (gerado via `crypto.randomBytes(40)`), persistido no banco de dados apenas na forma de hash SHA-256 (`RefreshToken.tokenHash`), e transmitido ao navegador em cookie seguro (`HttpOnly`, `Path=/api/auth`, `SameSite=Lax`, e `Secure` em ambiente de produção).
2. **Rotação Automática com Detecção de Reuso de Família de Tokens**:
   - Cada cadeia de sessão recebe um identificador único de família (`family`).
   - A cada chamada ao endpoint `POST /api/auth/refresh`, o token apresentado é consumido (`revokedAt = now`) e um novo par (access token + novo refresh token) é emitido mantendo a mesma família.
   - **Detecção de Reuso**: Se uma requisição apresentar um refresh token que já tenha sido previamente revogado, o sistema assume que a credencial foi comprometida, e revoga imediatamente todos os tokens pertencentes àquela família (`revokedAt = now`), desautenticando tanto a sessão legítima quanto o agente malicioso.
3. **Logout e Revogação Total**:
   - O endpoint `POST /api/auth/logout` invalida a família de tokens ativa e instrui o navegador a expirar o cookie de refresh token.
4. **Prevenção de Timing Attacks e Enumeração de Contas**:
   - No fluxo de recuperação de senha (`POST /api/auth/forgot-password`), o endpoint retorna exatamente a mesma resposta HTTP 200 com a mesma mensagem de sucesso quer o e-mail esteja cadastrado ou não.
   - Quando o e-mail não existe, um cálculo fictício de hash bcrypt é executado para que a latência da requisição seja indistinguível da rota que encontra o usuário, neutralizando timing attacks estatísticos.
5. **Interceptor de Renovação Silenciosa no Frontend**:
   - O cliente Axios (`MedConnect/src/services/api.js`) foi configurado com `withCredentials: true` e um interceptor de resposta de erro HTTP 401.
   - Ao receber 401, o interceptor enfileira requisições simultâneas em uma única promise de refresh (`refreshPromiseQueue`), renova o access token em memória através de `POST /api/auth/refresh` e reexecuta as requisições originais de forma transparente, sem causar loops infinitos ou desconexões indesejadas.
6. **Desacoplamento do Envio de E-mails**:
   - Criada a interface `EmailSender` com implementação em memória/console (`ConsoleEmailSender`) para testes e desenvolvimento local, e implementação SMTP com nodemailer (`SmtpEmailSender`) configurável via variáveis de ambiente (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) para produção.

## Consequências
- **Positivas**: Proteção de alto nível contra XSS e CSRF; impossibilidade de persistência indefinida de credenciais roubadas; mitigação de enumeração de dados sensíveis de pacientes; conformidade com os mais altos padrões de segurança web (OWASP).
- **Negativas**: Leve aumento na complexidade de orquestração do cliente frontend para renovação silenciosa em memória e inicialização de sessão pós-refresh de página.
