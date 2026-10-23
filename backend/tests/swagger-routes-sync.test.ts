import request from 'supertest';
import app from '../src/app';
import YAML from 'yamljs';
import path from 'path';

describe('TAREFA 3.4 — Sincronização e Validação do swagger.yaml com a Aplicação Express', () => {
  const swaggerPath = path.join(__dirname, '../src/docs/swagger.yaml');
  const swaggerDoc = YAML.load(swaggerPath);
  const swaggerPaths = Object.keys(swaggerDoc.paths || {});

  it('deve carregar o arquivo swagger.yaml sem erros de sintaxe OpenAPI 3.0', () => {
    expect(swaggerDoc).toBeDefined();
    expect(swaggerDoc.openapi).toMatch(/^3\.0\./);
    expect(swaggerDoc.info.title).toBe('MedConnect API');
    expect(swaggerPaths.length).toBeGreaterThan(15);
  });

  it('todas as rotas críticas da aplicação devem estar documentadas no swagger.yaml', () => {
    const criticalRoutes = [
      '/health',
      '/ready',
      '/metrics',
      '/api/auth/login',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/users',
      '/api/pharmacies',
      '/api/pharmacies/stats',
      '/api/prescriptions',
      '/api/prescriptions/my',
      '/api/prescriptions/pharmacy',
      '/api/quotes',
      '/api/orders',
      '/api/orders/my',
      '/api/admin/pharmacies/pending',
      '/api/notifications',
      '/api/notifications/read-all',
    ];

    criticalRoutes.forEach((route) => {
      const isDocumented = swaggerPaths.includes(route);
      expect(isDocumented).toBe(true);
    });
  });

  it('cada rota documentada no swagger.yaml deve existir no app Express e ser roteada com sucesso', async () => {
    const unroutedEndpoints: string[] = [];

    for (const docPath of swaggerPaths) {
      const methods = Object.keys(swaggerDoc.paths[docPath]);

      for (const method of methods) {
        if (method.startsWith('x-')) continue;

        // Substitui parâmetros {id} por ID de teste
        const testUrl = docPath.replace(/\{[a-zA-Z0-9_]+\}/g, 'test-id-123');

        const reqFn = (request(app) as any)[method.toLowerCase()];
        if (typeof reqFn !== 'function') continue;

        const res = await reqFn.call(request(app), testUrl);

        // Se uma rota não existe no Express, o Express retorna 404 HTML contendo "Cannot <METHOD> <PATH>"
        const isExpressDefault404 =
          res.status === 404 &&
          typeof res.text === 'string' &&
          res.text.includes(`Cannot ${method.toUpperCase()} ${testUrl}`);

        if (isExpressDefault404) {
          unroutedEndpoints.push(`${method.toUpperCase()} ${docPath}`);
        }
      }
    }

    expect(unroutedEndpoints).toEqual([]);
  });
});
