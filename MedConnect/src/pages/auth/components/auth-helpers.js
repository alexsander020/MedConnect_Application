/**
 * Utilitários das telas de autenticação (máscaras, UFs, tradução de erros da API).
 * Arquivo sem componentes para manter o Fast Refresh dos componentes ao lado.
 */
import { apiErrorMessage } from '@/lib/format';

/** As 27 unidades federativas (26 estados + DF), em ordem alfabética de sigla */
export const UFS = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'TO', nome: 'Tocantins' },
];

export const onlyDigits = (v) => String(v || '').replace(/\D/g, '');

/** 000.000.000-00 */
export function maskCPF(v) {
  return onlyDigits(v)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

/** 00.000.000/0001-00 */
export function maskCNPJ(v) {
  return onlyDigits(v)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/** (11) 99999-9999 (celular) ou (11) 3456-7890 (fixo) */
export function maskPhone(v) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const split = d.length === 11 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

export function isHttpUrl(value) {
  try {
    const url = new URL(String(value).trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Erro sem resposta do servidor (API fora do ar, sem internet, CORS) */
export function isNetworkError(err) {
  return !!err && !err.response && (err.code === 'ERR_NETWORK' || err.message === 'Network Error');
}

export const NETWORK_MESSAGE = 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
export const RATE_LIMIT_MESSAGE = 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';

export function errorStatus(err) {
  return err?.response?.status ?? null;
}

export function errorCode(err) {
  const error = err?.response?.data?.error;
  return error && typeof error === 'object' ? error.code || null : null;
}

/**
 * Mensagem legível para qualquer erro de autenticação/cadastro.
 * Aceita o formato atual `{ error: { code, message } }` e o antigo `{ error: 'texto' }` (rate limit).
 */
export function authErrorMessage(err, fallback = 'Algo deu errado. Tente novamente.') {
  if (isNetworkError(err)) return NETWORK_MESSAGE;
  if (errorStatus(err) === 429) return RATE_LIMIT_MESSAGE;
  const legacy = err?.response?.data?.error;
  if (typeof legacy === 'string' && legacy.trim()) return legacy;
  return apiErrorMessage(err, fallback);
}

/** Foca o elemento pelo id (campos, checkboxes, gatilhos de select) */
export function focusById(id) {
  if (!id || typeof document === 'undefined') return;
  const el = document.getElementById(id);
  if (el && typeof el.focus === 'function') el.focus();
}
