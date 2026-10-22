/**
 * Módulo de conversão e formatação monetária com aritmética inteira.
 * Evita imprecisões de ponto flutuante (IEEE 754 Float).
 */

export function parsePriceToCents(priceInput: string | number): number {
  if (priceInput === undefined || priceInput === null) {
    throw new Error('Preço é obrigatório');
  }

  const str = String(priceInput).trim().replace(',', '.');
  if (!str) {
    throw new Error('Preço não pode ser vazio');
  }

  // Regex para aceitar dígitos inteiros com até 2 casas decimais opcionais
  const match = str.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    throw new Error('Formato de preço inválido. Use formato decimal (ex: 120 ou 120.50)');
  }

  const reais = parseInt(match[1], 10);
  const centavosRaw = match[2] || '0';
  const centavos = parseInt(centavosRaw.padEnd(2, '0'), 10);

  const totalCents = reais * 100 + centavos;
  if (totalCents <= 0) {
    throw new Error('Preço deve ser maior que zero');
  }

  return totalCents;
}

export function formatPriceCentsToDecimal(priceCents: number): string {
  if (typeof priceCents !== 'number' || isNaN(priceCents)) {
    return '0.00';
  }
  const reais = Math.floor(priceCents / 100);
  const centavos = Math.abs(priceCents % 100);
  return `${reais}.${centavos.toString().padStart(2, '0')}`;
}
