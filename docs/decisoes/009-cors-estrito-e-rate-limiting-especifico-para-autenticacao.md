# ADR 009: Restrição Estrita de CORS e Rate Limiting Específico para Autenticação

## Status
Aceito

## Contexto
Anteriormente, o backend da aplicação MedConnect possuía permissões excessivas e proteções insuficientes contra abusos na camada de rede:
1. No Express (`backend/src/app.ts`), o middleware `cors()` estava configurado sem restrições de origem, permitindo requisições cross-origin indiscriminadas.
2. No Socket.IO (`backend/src/server.ts`), o CORS permitia `origin: '*'`.
3. O rate limit global existente cobria 100 requisições por 15 minutos de forma genérica, sem proteção direcionada contra ataques de força bruta e credential stuffing no endpoint de login (`/api/auth/login`).

## Decisão
1. **Restrição Estrita de CORS por Allowlist**:
   - HTTP (Express): Configuração de `corsOptions` que valida o cabeçalho `Origin` contra a lista definida em `env.CORS_ORIGINS` (ex.: `http://localhost:5173`).
   - Requisições provenientes de origens não autorizadas são ativamente bloqueadas com HTTP 403 Forbidden e sem o cabeçalho `Access-Control-Allow-Origin`.
   - Conexões com credenciais (`credentials: true`) só são aceitas para origens estritamente listadas.
   - WebSocket (Socket.IO): O CORS do servidor Socket.IO foi reconfigurado de `origin: '*'` para `origin: env.CORS_ORIGINS` com `credentials: true`.

2. **Rate Limiting em Camadas com Isolamento de Conta**:
   - **Global (`globalApiLimiter`)**: Mantido em 100 requisições a cada 15 minutos por IP para todas as rotas sob `/api/`.
   - **Autenticação (`authLimiter`)**: Limitado estritamente a 5 tentativas a cada 15 minutos, utilizando chave composta por IP normalizado (com suporte a IPv6 via `ipKeyGenerator`) + e-mail do usuário.
   - Ao exceder o limite, o endpoint retorna HTTP 429 Too Many Requests com cabeçalho padrão `Retry-After` indicando o tempo de espera em segundos e mensagem informativa.
   - A resposta 429 e o cabeçalho `Retry-After` foram devidamente documentados na especificação Swagger OpenAPI (`swagger.yaml`).
