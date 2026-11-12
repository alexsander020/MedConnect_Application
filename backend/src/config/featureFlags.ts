import { env } from './env';

export interface FeatureFlags {
  VET_ENABLED: boolean;
  VET_ALLOW_FOOD_PRODUCING: boolean;
  VET_CONTROLLED_ENABLED: boolean;
}

let testOverrides: Partial<FeatureFlags> | null = null;

/**
 * Retorna o estado atual das feature flags do sistema.
 * Permite injeção de overrides temporários para testes isolados.
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    VET_ENABLED: testOverrides?.VET_ENABLED ?? env.VET_ENABLED,
    VET_ALLOW_FOOD_PRODUCING: testOverrides?.VET_ALLOW_FOOD_PRODUCING ?? env.VET_ALLOW_FOOD_PRODUCING,
    VET_CONTROLLED_ENABLED: testOverrides?.VET_CONTROLLED_ENABLED ?? env.VET_CONTROLLED_ENABLED,
  };
}

/**
 * Configura overrides de feature flags para uso exclusivo em suítes de teste.
 * Passe `null` para resetar para os valores padrão das variáveis de ambiente.
 */
export function setFeatureFlagsOverrideForTesting(overrides: Partial<FeatureFlags> | null): void {
  testOverrides = overrides;
}

/**
 * Helper com getters dinâmicos para acesso direto às flags.
 */
export const featureFlags = {
  get VET_ENABLED(): boolean {
    return getFeatureFlags().VET_ENABLED;
  },
  get VET_ALLOW_FOOD_PRODUCING(): boolean {
    return getFeatureFlags().VET_ALLOW_FOOD_PRODUCING;
  },
  get VET_CONTROLLED_ENABLED(): boolean {
    return getFeatureFlags().VET_CONTROLLED_ENABLED;
  }
};
