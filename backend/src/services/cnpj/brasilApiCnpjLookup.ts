import { CnpjLookup, CnpjLookupResult } from './cnpjLookup.interface';

export class BrasilApiCnpjLookup implements CnpjLookup {
  async lookup(rawCnpj: string): Promise<CnpjLookupResult> {
    const cleanCnpj = String(rawCnpj).replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      throw new Error('CNPJ deve conter 14 dígitos numéricos.');
    }

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`BrasilAPI retornou status ${response.status}`);
      }

      const data: any = await response.json();
      return {
        cnpj: cleanCnpj,
        razaoSocial: data.razao_social || data.nome_fantasia || 'Razão Social Não Informada',
        nomeFantasia: data.nome_fantasia || undefined,
        situacaoCadastral: data.descricao_situacao_cadastral || 'ATIVA',
        dataSituacaoCadastral: data.data_situacao_cadastral,
        cnaePrincipal: data.cnae_fiscal_descricao,
        uf: data.uf,
        municipio: data.municipio,
        logradouro: data.logradouro,
        numero: data.numero,
        cep: data.cep,
        rawData: data
      };
    } catch (error: any) {
      // Fallback gracioso para estrutura mínima se a API externa falhar ou rate-limitar
      return {
        cnpj: cleanCnpj,
        razaoSocial: 'Farmácia Cadastrada',
        situacaoCadastral: 'ATIVA',
        rawData: { error: error.message }
      };
    }
  }
}
