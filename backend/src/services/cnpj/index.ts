import { CnpjLookup } from './cnpjLookup.interface';
import { BrasilApiCnpjLookup } from './brasilApiCnpjLookup';
import { MockCnpjLookup } from './mockCnpjLookup';
import { env } from '../../config/env';

let cnpjLookupInstance: CnpjLookup;

if (env.NODE_ENV === 'production') {
  cnpjLookupInstance = new BrasilApiCnpjLookup();
} else {
  // Em desenvolvimento e testes, utiliza mock determinístico para velocidade e estabilidade
  cnpjLookupInstance = new MockCnpjLookup();
}

export const cnpjLookup = cnpjLookupInstance;
export * from './cnpjLookup.interface';
