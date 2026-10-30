import { Router, Request, Response } from 'express';
import { getFeatureFlags } from '../config/featureFlags';

const router = Router();

/**
 * Configuração pública de funcionalidades (feature flags) consumida pelo frontend.
 * Não expõe segredos: apenas booleanos que controlam a exibição da vertical veterinária.
 */
router.get('/', (_req: Request, res: Response) => {
  const flags = getFeatureFlags();
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    vetEnabled: flags.VET_ENABLED,
    vetAllowFoodProducing: flags.VET_ALLOW_FOOD_PRODUCING,
    vetControlledEnabled: flags.VET_CONTROLLED_ENABLED
  });
});

export default router;

