import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import fs from 'fs';
import path from 'path';

import { env } from './config/env';
import { globalApiLimiter } from './middlewares/rate-limit.middleware';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import pharmacyRoutes from './routes/pharmacy.routes';
import prescriptionRoutes from './routes/prescription.routes';
import quoteRoutes from './routes/quote.routes';
import orderRoutes from './routes/order.routes';

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
    return callback(new Error('Origem não permitida pela política de CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middlewares de Segurança
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors(corsOptions));
app.use(express.json());

// Limite de requisições global para a API (/api/)
app.use('/api/', globalApiLimiter);

// Configuração do Swagger
const candidateSwaggerPaths = [
  path.join(__dirname, 'docs', 'swagger.yaml'),
  path.join(__dirname, '..', 'src', 'docs', 'swagger.yaml'),
  path.join(process.cwd(), 'src', 'docs', 'swagger.yaml'),
  path.join(process.cwd(), 'backend', 'src', 'docs', 'swagger.yaml')
];
const resolvedSwaggerPath = candidateSwaggerPaths.find(p => fs.existsSync(p)) || candidateSwaggerPaths[0];
const swaggerDocument = YAML.load(resolvedSwaggerPath);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/pharmacies', pharmacyRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/orders', orderRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Tratamento de erros (incluindo violações de CORS)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && err.message === 'Origem não permitida pela política de CORS') {
    return res.status(403).json({ error: 'Origem não permitida pela política de CORS' });
  }
  console.error('Erro não tratado na aplicação:', err);
  return res.status(500).json({ error: 'Erro interno do servidor' });
});

export default app;
