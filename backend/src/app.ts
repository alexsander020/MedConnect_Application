import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import fs from 'fs';
import path from 'path';

import { env } from './config/env';
import { initSentry } from './lib/sentry';
import { globalApiLimiter } from './middlewares/rate-limit.middleware';
import { requestIdMiddleware } from './middlewares/requestId.middleware';
import { metricsMiddleware } from './middlewares/metrics.middleware';
import { csrfProtection } from './middlewares/csrf.middleware';
import { errorHandler } from './middlewares/errorHandler.middleware';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import pharmacyRoutes from './routes/pharmacy.routes';
import prescriptionRoutes from './routes/prescription.routes';
import quoteRoutes from './routes/quote.routes';
import orderRoutes from './routes/order.routes';
import adminRoutes from './routes/admin.routes';
import reviewRoutes from './routes/review.routes';
import notificationRoutes from './routes/notification.routes';
import healthRoutes from './routes/health.routes';
import consentRoutes from './routes/consent.routes';
import lgpdRoutes from './routes/lgpd.routes';

// Inicializa Sentry se SENTRY_DSN estiver configurado
initSentry();

const app = express();

// Configuração estrita de CORS baseada em CORS_ORIGINS
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permite chamadas sem Origin (ex: chamadas internas, testes, healthcheck)
    if (!origin) {
      return callback(null, true);
    }
    if (env.CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    const err: any = new Error('Origem não permitida pela política de CORS');
    err.status = 403;
    err.code = 'CORS_ERROR';
    return callback(err);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id']
};

// Middlewares de Segurança e Parse
app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(requestIdMiddleware);
app.use(csrfProtection);

app.use(metricsMiddleware);

// Limite de requisições global para a API (/api/)
app.use('/api/', globalApiLimiter);

// Configuração do Swagger
const candidateSwaggerPaths = [
  path.join(__dirname, 'docs', 'swagger.yaml'),
  path.join(__dirname, '..', 'src', 'docs', 'swagger.yaml'),
  path.join(process.cwd(), 'src', 'docs', 'swagger.yaml'),
  path.join(process.cwd(), 'backend', 'src', 'docs', 'swagger.yaml')
];
const resolvedSwaggerPath = candidateSwaggerPaths.find((p) => fs.existsSync(p)) || candidateSwaggerPaths[0];
const swaggerDocument = YAML.load(resolvedSwaggerPath);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rotas de Monitoramento, Saúde e Métricas
app.use('/', healthRoutes);
app.use('/api', healthRoutes);

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/pharmacies', pharmacyRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/lgpd', lgpdRoutes);

// Bloqueio explícito de mutação em trilhas de auditoria (Imutabilidade LGPD)
app.use('/api/audit-logs', (req, res) => {
  res.status(405).json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'A trilha de auditoria é imutável: registros não podem ser alterados ou apagados por nenhuma rota.'
    }
  });
});

// Middleware Central de Erros
app.use(errorHandler);

export default app;
