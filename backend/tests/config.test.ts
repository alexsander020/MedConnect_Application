import { Request, Response, NextFunction } from 'express';
import configRouter from '../src/routes/config.routes';
import { setFeatureFlagsOverrideForTesting } from '../src/config/featureFlags';

describe('Public Config Router Unit & Integration', () => {
  afterEach(() => {
    setFeatureFlagsOverrideForTesting(null);
  });

  it('deve retornar os flags públicos correspondentes ao featureFlags', () => {
    setFeatureFlagsOverrideForTesting({
      VET_ENABLED: true,
      VET_ALLOW_FOOD_PRODUCING: false,
      VET_CONTROLLED_ENABLED: true,
    });

    const routeLayer = configRouter.stack.find((layer: any) => layer.route && layer.route.path === '/');
    expect(routeLayer).toBeDefined();

    const handler = (routeLayer as any).route.stack[0].handle;

    const req = {} as Request;
    let jsonResult: any = null;
    const res = {
      setHeader: jest.fn(),
      json: jest.fn((data: any) => {
        jsonResult = data;
        return res;
      }),
    } as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;

    handler(req, res, next);

    expect(res.json).toHaveBeenCalled();
    expect(jsonResult).toEqual({
      vetEnabled: true,
      vetAllowFoodProducing: false,
      vetControlledEnabled: true,
    });
  });

  it('deve retornar fail-closed (todos false) quando flags estiverem desativadas', () => {
    setFeatureFlagsOverrideForTesting(null);

    const routeLayer = configRouter.stack.find((layer: any) => layer.route && layer.route.path === '/');
    const handler = (routeLayer as any).route.stack[0].handle;

    const req = {} as Request;
    let jsonResult: any = null;
    const res = {
      setHeader: jest.fn(),
      json: jest.fn((data: any) => {
        jsonResult = data;
        return res;
      }),
    } as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;

    handler(req, res, next);

    expect(jsonResult).toEqual({
      vetEnabled: false,
      vetAllowFoodProducing: false,
      vetControlledEnabled: false,
    });
  });
});
