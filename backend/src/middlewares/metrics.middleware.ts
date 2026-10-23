import { Request, Response, NextFunction } from 'express';

interface RouteLatencyStat {
  count: number;
  totalTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  latencies: number[];
}

interface MetricsStore {
  totalRequests: number;
  statusCodes: {
    '2xx': number;
    '3xx': number;
    '4xx': number;
    '5xx': number;
  };
  routes: Record<string, RouteLatencyStat>;
}

export const metricsStore: MetricsStore = {
  totalRequests: 0,
  statusCodes: {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0
  },
  routes: {}
};

export function resetMetrics(): void {
  metricsStore.totalRequests = 0;
  metricsStore.statusCodes = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
  metricsStore.routes = {};
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Ignora chamadas para /metrics para não distorcer estatísticas
  if (req.path === '/metrics' || req.path === '/health' || req.path === '/ready') {
    return next();
  }

  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationMs = Number((diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2));

    metricsStore.totalRequests += 1;

    const statusGroup = `${Math.floor(res.statusCode / 100)}xx` as keyof typeof metricsStore.statusCodes;
    if (metricsStore.statusCodes[statusGroup] !== undefined) {
      metricsStore.statusCodes[statusGroup] += 1;
    }

    const routeKey = `${req.method} ${req.baseUrl || ''}${req.route?.path || req.path}`;
    if (!metricsStore.routes[routeKey]) {
      metricsStore.routes[routeKey] = {
        count: 0,
        totalTimeMs: 0,
        minTimeMs: durationMs,
        maxTimeMs: durationMs,
        latencies: []
      };
    }

    const stat = metricsStore.routes[routeKey];
    stat.count += 1;
    stat.totalTimeMs += durationMs;
    stat.minTimeMs = Math.min(stat.minTimeMs, durationMs);
    stat.maxTimeMs = Math.max(stat.maxTimeMs, durationMs);
    
    // Manter histórico recente para percentil (até 100 amostras)
    if (stat.latencies.length < 100) {
      stat.latencies.push(durationMs);
    } else {
      stat.latencies.shift();
      stat.latencies.push(durationMs);
    }
  });

  next();
}

export function getMetricsSummary(domainStats?: { pendingQuotes: number; pendingPrescriptions: number; activeOrders: number }) {
  const totalReqs = metricsStore.totalRequests;
  const errorReqs = metricsStore.statusCodes['4xx'] + metricsStore.statusCodes['5xx'];
  const errorRatePercent = totalReqs > 0 ? Number(((errorReqs / totalReqs) * 100).toFixed(2)) : 0;
  const serverErrorRatePercent = totalReqs > 0 ? Number(((metricsStore.statusCodes['5xx'] / totalReqs) * 100).toFixed(2)) : 0;

  const routeSummaries: Record<string, { count: number; avgLatencyMs: number; minLatencyMs: number; maxLatencyMs: number; p95LatencyMs: number }> = {};

  for (const [route, stat] of Object.entries(metricsStore.routes)) {
    const sorted = [...stat.latencies].sort((a, b) => a - b);
    const p95Idx = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Idx] || stat.maxTimeMs;

    routeSummaries[route] = {
      count: stat.count,
      avgLatencyMs: Number((stat.totalTimeMs / stat.count).toFixed(2)),
      minLatencyMs: stat.minTimeMs,
      maxLatencyMs: stat.maxTimeMs,
      p95LatencyMs: p95
    };
  }

  return {
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    requests: {
      total: totalReqs,
      statusCodes: metricsStore.statusCodes,
      errorRatePercent,
      serverErrorRatePercent
    },
    latencyByRoute: routeSummaries,
    businessMetrics: domainStats || {
      pendingQuotes: 0,
      pendingPrescriptions: 0,
      activeOrders: 0
    }
  };
}
