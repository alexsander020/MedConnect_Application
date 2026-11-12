import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getMetricsSummary } from '../middlewares/metrics.middleware';
import { vetObservabilityService } from '../services/vetObservabilityService';

const router = Router();

/**
 * Healthcheck básico do processo
 * Retorna status 200 OK e uptime
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness check do banco de dados PostgreSQL
 * Executa uma consulta real 'SELECT 1' via Prisma.
 * Retorna 200 se o banco responder, ou 503 se houver falha de conexão.
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err?.message || 'Database connection error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint de métricas de observabilidade
 * Retorna taxas de erro, latências agregadas por rota e indicadores de negócio (incluindo vertical veterinária)
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const [pendingQuotes, pendingPrescriptions, activeOrders, vetMetrics] = await Promise.all([
      prisma.quote.count({ where: { status: 'PENDING' } }).catch(() => 0),
      prisma.prescription.count({ where: { status: 'PENDING' } }).catch(() => 0),
      prisma.order.count({ where: { status: { in: ['PRODUCTION', 'DELIVERY'] } } }).catch(() => 0),
      vetObservabilityService.getVetMetrics().catch(() => null)
    ]);

    const summary = getMetricsSummary({
      pendingQuotes,
      pendingPrescriptions,
      activeOrders
    });

    res.status(200).json({
      ...summary,
      veterinary: vetMetrics
    });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'METRICS_ERROR',
        message: 'Falha ao coletar métricas do sistema'
      }
    });
  }
});

export default router;
