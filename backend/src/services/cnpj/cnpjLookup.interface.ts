export interface CnpjLookupResult {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacaoCadastral: 'ATIVA' | 'INAPTA' | 'SUSPENSA' | 'BAIXADA' | 'NULA' | string;
  dataSituacaoCadastral?: string;
  cnaePrincipal?: string;
  uf?: string;
  municipio?: string;
  logradouro?: string;
  numero?: string;
  cep?: string;
  rawData?: any;
}

export interface CnpjLookup {
  lookup(cnpj: string): Promise<CnpjLookupResult>;
}
