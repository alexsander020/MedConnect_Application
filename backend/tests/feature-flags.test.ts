import { featureFlags, getFeatureFlags, setFeatureFlagsOverrideForTesting } from '../src/config/featureFlags';
import { parseEnv } from '../src/config/env';

describe('TAREFA 2.1 — Feature Flags da Vertical Veterinária', () => {
  afterEach(() => {
    setFeatureFlagsOverrideForTesting(null);
  });

  it('deve ter todas as flags desligadas por padrão (fail-closed)', () => {
    expect(featureFlags.VET_ENABLED).toBe(false);
    expect(featureFlags.VET_ALLOW_FOOD_PRODUCING).toBe(false);
    expect(featureFlags.VET_CONTROLLED_ENABLED).toBe(false);
  });

  it('deve permitir override temporário em tempo de execução para testes', () => {
    setFeatureFlagsOverrideForTesting({
      VET_ENABLED: true,
      VET_CONTROLLED_ENABLED: true
    });

    expect(featureFlags.VET_ENABLED).toBe(true);
    expect(featureFlags.VET_ALLOW_FOOD_PRODUCING).toBe(false);
    expect(featureFlags.VET_CONTROLLED_ENABLED).toBe(true);

    const flags = getFeatureFlags();
    expect(flags.VET_ENABLED).toBe(true);
  });

  it('deve resetar os overrides ao passar null', () => {
    setFeatureFlagsOverrideForTesting({ VET_ENABLED: true });
    expect(featureFlags.VET_ENABLED).toBe(true);

    setFeatureFlagsOverrideForTesting(null);
    expect(featureFlags.VET_ENABLED).toBe(false);
  });

  it('deve parsear strings "true" e "1" como boolean true no envSchema', () => {
    const parsed = parseEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://ci:ci@localhost:5432/ci',
      JWT_SECRET: 'minimo_32_caracteres_para_teste_seguro!',
      VET_ENABLED: 'true',
      VET_ALLOW_FOOD_PRODUCING: '1',
      VET_CONTROLLED_ENABLED: 'false'
    });

    expect(parsed.VET_ENABLED).toBe(true);
    expect(parsed.VET_ALLOW_FOOD_PRODUCING).toBe(true);
    expect(parsed.VET_CONTROLLED_ENABLED).toBe(false);
  });
});
