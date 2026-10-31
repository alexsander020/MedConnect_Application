import { vetObservabilityService } from '../src/services/vetObservabilityService';

describe('VetObservabilityService - Métricas e Logs Estruturados sem PII (ETAPA V6)', () => {
  beforeEach(() => {
    vetObservabilityService.resetMetricsForTesting();
  });

  it('deve registrar eventos e métricas de receitas, cotações e aceites', async () => {
    vetObservabilityService.recordPrescriptionCreated({ species: 'DOG', vetDocumentType: 'MAGISTRAL' });
    vetObservabilityService.recordQuoteCreated({ pharmaceuticalForm: 'Biscoito', deliveryDays: 2 });
    vetObservabilityService.recordQuoteCreated({ pharmaceuticalForm: 'Pasta', deliveryDays: 3 });
    vetObservabilityService.recordQuoteAccepted({ orderId: 'ord-123' });

    const metrics = await vetObservabilityService.getVetMetrics();
    expect(metrics.prescriptionsCreated).toBe(1);
    expect(metrics.quotesCreated).toBe(2);
    expect(metrics.quotesAccepted).toBe(1);
    expect(metrics.acceptanceRatePercent).toBe(50.0);
  });

  it('deve registrar transições de status de capacidade regulatória', async () => {
    vetObservabilityService.recordCapabilityStatus('PENDING_VERIFICATION');
    vetObservabilityService.recordCapabilityStatus('VERIFIED');
    vetObservabilityService.recordCapabilityStatus('REJECTED');
    vetObservabilityService.recordCapabilityStatus('SUSPENDED');

    const metrics = await vetObservabilityService.getVetMetrics();
    expect(metrics.capabilityRequestsByStatus.PENDING_VERIFICATION).toBe(1);
    expect(metrics.capabilityRequestsByStatus.VERIFIED).toBe(1);
    expect(metrics.capabilityRequestsByStatus.REJECTED).toBe(1);
    expect(metrics.capabilityRequestsByStatus.SUSPENDED).toBe(1);
  });

  it('deve registrar e contabilizar erros por código de negócio', async () => {
    vetObservabilityService.recordErrorCode('ANIMAL_FOOD_PRODUCING_NOT_SUPPORTED', { route: 'POST /api/prescriptions' });
    vetObservabilityService.recordErrorCode('CONTROLLED_NOT_SUPPORTED', { route: 'POST /api/prescriptions' });
    vetObservabilityService.recordErrorCode('VET_FEATURE_DISABLED');

    const metrics = await vetObservabilityService.getVetMetrics();
    expect(metrics.errorsByCode.ANIMAL_FOOD_PRODUCING_NOT_SUPPORTED).toBe(1);
    expect(metrics.errorsByCode.CONTROLLED_NOT_SUPPORTED).toBe(1);
    expect(metrics.errorsByCode.VET_FEATURE_DISABLED).toBe(1);
  });

  it('deve sanitizar metadados removendo chaves com potencial PII ou dados de saúde', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    vetObservabilityService.logVetEvent('test.sanitization', {
      safeField: 'valor_seguro',
      count: 42,
      cpf: '123.456.789-00',
      email: 'tutor@exemplo.com',
      patientName: 'João da Silva',
      phone: '11999998888',
      medication: 'Amoxicilina 250mg',
      diagnosis: 'Otite canina',
      notes: 'Prescrição confidencial'
    });

    expect(consoleSpy).toHaveBeenCalled();
    const loggedOutput = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedOutput);

    expect(parsed.type).toBe('VET_OBSERVABILITY');
    expect(parsed.event).toBe('test.sanitization');
    expect(parsed.safeField).toBe('valor_seguro');
    expect(parsed.count).toBe(42);

    // Chaves sensíveis removidas
    expect(parsed.cpf).toBeUndefined();
    expect(parsed.email).toBeUndefined();
    expect(parsed.patientName).toBeUndefined();
    expect(parsed.phone).toBeUndefined();
    expect(parsed.medication).toBeUndefined();
    expect(parsed.diagnosis).toBeUndefined();
    expect(parsed.notes).toBeUndefined();

    consoleSpy.mockRestore();
  });
});

