# Observabilidade, Métricas e Guia de Alertas do MedConnect

Este documento descreve a infraestrutura de observabilidade da aplicação MedConnect, os endpoints de monitoramento (/health, /ready, /metrics), integração com Sentry e as diretrizes recomendadas para configuração de alertas operacionais.

---

## 1. Endpoints de Monitoramento

| Endpoint | Método | Função | Critério de Sucesso | Uso Recomendado |
| :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | Liveness probe do processo Node.js | HTTP 200 `{ status: "ok", uptime: ... }` | Orquestrador (Render/Kubernetes) para detecção de deadlock / reinício |
| `/ready` | `GET` | Readiness probe (valida conexão PostgreSQL) | HTTP 200 `{ status: "ready", database: "connected" }` | Roteamento de tráfego; só envia requisições se banco estiver pronto |
| `/metrics` | `GET` | Estatísticas de requisições, latência e dados de negócio | HTTP 200 (JSON estruturado com p95, taxa de erro e filas) | Prometheus, Datadog ou scraping periódico para dashboards |

### Exemplo de Resposta de `/metrics`:
```json
{
  "uptimeSeconds": 3600,
  "timestamp": "2026-10-23T19:30:00.000Z",
  "requests": {
    "total": 1542,
    "statusCodes": {
      "2xx": 1420,
      "3xx": 12,
      "4xx": 105,
      "5xx": 5
    },
    "errorRatePercent": 7.13,
    "serverErrorRatePercent": 0.32
  },
  "latencyByRoute": {
    "POST /api/quotes": {
      "count": 45,
      "avgLatencyMs": 142.5,
      "minLatencyMs": 85.0,
      "maxLatencyMs": 320.0,
      "p95LatencyMs": 280.0
    }
  },
  "businessMetrics": {
    "pendingQuotes": 12,
    "pendingPrescriptions": 5,
    "activeOrders": 8
  }
}
```

---

## 2. Regras e Limiares Recomendados de Alerta

| Métrica / Sinal | Condição de Alerta | Severidade | Ação Imediata |
| :--- | :--- | :--- | :--- |
| **Taxa de Erro 5xx** | `serverErrorRatePercent > 2%` por 5 min | 🚨 Crítica | Investigar logs no Sentry e Pino; verificar migrações recentes ou saturação de banco. |
| **Readiness (/ready)** | HTTP 503 por 3 verificações seguidas (30s) | 🚨 Crítica | Verificar disponibilidade do PostgreSQL, pool de conexões e credenciais. |
| **Latência da API (p95)** | `p95LatencyMs > 1000ms` em rotas transacionais (`POST /quotes/approve`) | ⚠️ Alta | Inspecionar locks de banco de dados, transações concorrentes ou falta de índices. |
| **Cotações Pendentes Estagnadas** | `pendingQuotes > 50` sem novas cotações por 2h | ⚠️ Moderada | Notificar equipe de suporte/operações de farmácias parceiras. |
| **Uptime / Liveness** | Falha consecutiva em `/health` por 1 minuto | 🚨 Crítica | Acionar reinicialização automática pelo orquestrador. |

---

## 3. Integração com Sentry e LGPD Data Scrubbing

Tanto o backend quanto o frontend possuem integração nativa com o **Sentry** ativada condicionalmente pelas variáveis:
- Backend: `SENTRY_DSN`
- Frontend: `VITE_SENTRY_DSN`

### Princípio de Privacidade por Padrão (Privacy by Design):
Todos os eventos passam pelo filtro `sanitizeData` antes do despacho para o Sentry:
- **Redação Automática**: Chaves como `password`, `token`, `refreshToken`, `accessToken`, `cpf`, `cpfEncrypted`, `cpfHash`, `phone`, `address`, `authorization`, `cookie` e `secret` são substituídas pelo valor `[REDACTED]`.
- **Anonimização de IP**: Os endereços IP dos usuários são descartados do payload do Sentry para evitar rastreamento geográfico pessoal.
