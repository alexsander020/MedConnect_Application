import { CnpjLookup, CnpjLookupResult } from './cnpjLookup.interface';

export class MockCnpjLookup implements CnpjLookup {
  async lookup(rawCnpj: string): Promise<CnpjLookupResult> {
    const cleanCnpj = String(rawCnpj).replace(/\D/g, '');
    return {
      cnpj: cleanCnpj,
      razaoSocial: 'Farmácia Modelo de Manipulação Ltda (Simulação)',
      nomeFantasia: 'Farmácia Modelo',
      situacaoCadastral: 'ATIVA',
      dataSituacaoCadastral: '2020-01-15',
      cnaePrincipal: 'Comércio varejista de produtos farmacêuticos, com manipulação de fórmulas',
      uf: 'SP',
      municipio: 'São Paulo',
      logradouro: 'Av. Paulista',
      numero: '1000',
      cep: '01310100',
      rawData: { mock: true, checkedAt: new Date().toISOString() }
    };
  }
}
