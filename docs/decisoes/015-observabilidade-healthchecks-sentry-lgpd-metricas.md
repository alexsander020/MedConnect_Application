# 15. Observabilidade, Healthchecks, Sentry com LGPD Scrubbing e Métricas

## Status
Aceito

## Contexto
A operação de uma plataforma de telemedicina e manipulação farmacêutica exige monitoramento proativo de disponibilidade, rastreamento de falhas e garantia estrita de privacidade sob a LGPD (Lei Geral de Proteção de Dados - Lei nº 13.709/2018).
Endpoints de verificação únicos que apenas retornam `200 OK` mascaram falhas de conectividade com o banco de dados quando orquestradores (como Kubernetes ou Render) precisam diferenciar entre reinicialização de processo (liveness) e prontidão para receber tráfego (readiness). Além disso, o envio de logs ou traces contendo dados sensíveis de pacientes (CPF, receitas, dados de contato) para serviços externos como o Sentry constitui violação de privacidade.

## Decisão
1. **Healthchecks Especializados**:
   - `/health` (**Liveness**): Verifica se o processo Node.js/Express está ativo e respondendo, sem onerar o banco de dados.
   - `/ready` (**Readiness**): Executa verificação ativa no banco PostgreSQL (`SELECT 1` via Prisma). Retorna `200 { status: "ready", database: "connected" }` ou `503 Service Unavailable` em caso de falha de conexão, orientando orquestradores a não direcionar tráfego para a instância.
2. **Integração Sentry com Data Scrubbing Recursivo (Frontend e Backend)**:
   - Inicialização condicional: ativada apenas quando `SENTRY_DSN` / `VITE_SENTRY_DSN` estiver definida, permitindo operação local sem dependência de serviços externos.
   - Função `scrubSensitiveData()` implementada no backend (`backend/src/lib/sentry.ts`) e frontend (`MedConnect/src/lib/sentry.js`) que limpa recursivamente dados de requisições, payloads e tags:
     - Campos expurgados: `cpf`, `cnpj`, `password`, `senha`, `token`, `accessToken`, `refreshToken`, `phone`, `telefone`, `whatsapp`, `address`, `notes`, `file`, `prescription`, `patientId`, `medicalHistory`.
     - Strings contendo padrões de CPF (`\d{3}\.\d{3}\.\d{3}-\d{2}`) ou CNPJ são ofuscadas para `[REDACTED_CPF]` e `[REDACTED_CNPJ]`.
3. **Métricas de Performance e Negócio (`/metrics`)**:
   - Middleware centralizado coletando:
     - Latência média por rota e método HTTP.
     - Taxa de erros (4xx e 5xx).
     - Contadores de cotações pendentes e pedidos ativos.
     - Endpoint protegido contra visualização não autorizada de dados operacionais.
4. **Instruções e Limiares de Alerta**:
   - Documentado em `docs/operacao/alerting-observability.md` com limiares recomendados para P95 > 500ms, taxa de erro 5xx > 1%, e cotações pendentes sem resposta > 2h.

## Consequências
- Orquestradores de nuvem podem gerenciar o ciclo de vida do container com precisão (liveness vs readiness).
- Erros de runtime em produção são capturados instantaneamente no Sentry sem incorrer em risco de violação de dados médicos ou pessoais sob a LGPD.
