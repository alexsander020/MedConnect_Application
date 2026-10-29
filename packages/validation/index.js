/**
 * Validação de formato de E-mail
 */
export function ehEmailValido(str) {
  if (!str || typeof str !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(str.trim());
}

/**
 * Validação de dígitos verificadores de CPF
 */
export function ehCPFValido(str) {
  if (!str || typeof str !== 'string') return false;
  
  const cpf = str.replace(/[^\d]+/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcularDigito = (fatorInicial, tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) {
      soma += parseInt(cpf.charAt(i), 10) * (fatorInicial - i);
    }
    const resto = 11 - (soma % 11);
    return (resto === 10 || resto === 11) ? 0 : resto;
  };

  const digito1 = calcularDigito(10, 9);
  if (digito1 !== parseInt(cpf.charAt(9), 10)) return false;

  const digito2 = calcularDigito(11, 10);
  return digito2 === parseInt(cpf.charAt(10), 10);
}

/**
 * Validação matemática completa de dígitos verificadores de CNPJ
 */
export function ehCNPJValido(str) {
  if (!str || typeof str !== 'string') return false;

  const cnpj = str.replace(/[^\d]+/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  // Cálculo do 1º Dígito Verificador
  const multiplicadores1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma1 = 0;
  for (let i = 0; i < 12; i++) {
    soma1 += parseInt(cnpj.charAt(i), 10) * multiplicadores1[i];
  }
  const resto1 = soma1 % 11;
  const digito1 = resto1 < 2 ? 0 : 11 - resto1;
  if (digito1 !== parseInt(cnpj.charAt(12), 10)) return false;

  // Cálculo do 2º Dígito Verificador
  const multiplicadores2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma2 = 0;
  for (let i = 0; i < 13; i++) {
    soma2 += parseInt(cnpj.charAt(i), 10) * multiplicadores2[i];
  }
  const resto2 = soma2 % 11;
  const digito2 = resto2 < 2 ? 0 : 11 - resto2;
  return digito2 === parseInt(cnpj.charAt(13), 10);
}

/**
 * Validação de força de Senha (8+ caracteres, maiúscula, número e especial)
 */
export function ehSenhaForte(str) {
  if (!str || typeof str !== 'string') return false;
  if (str.length < 8) return false;

  const temMaiuscula = /[A-Z]/.test(str);
  const temNumero = /[0-9]/.test(str);
  const temEspecial = /[^A-Za-z0-9]/.test(str);

  return temMaiuscula && temNumero && temEspecial;
}

/**
 * Lista oficial das 27 Unidades Federativas do Brasil
 */
export const UFS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

/**
 * Lista fechada e extensível de espécies animais suportadas
 */
export const ESPECIES_ANIMAIS = [
  'DOG', 'CAT', 'BIRD', 'REPTILE', 'SMALL_MAMMAL', 'EQUINE', 'OTHER'
];

/**
 * Validação de FORMATO do CRMV (Conselho Regional de Medicina Veterinária).
 * AVISO REGULATÓRIO: Esta função valida estritamente a conformidade sintática
 * e estrutural do registro (número com 1 a 7 dígitos e UF brasileira válida).
 * Ela NÃO consulta bases de dados de conselhos profissionais e NÃO confirma
 * a autenticidade, vigência ou regularidade da inscrição do profissional.
 */
export function validarCrmv(crmv, uf) {
  if (!crmv) return false;
  const str = String(crmv).trim().toUpperCase();

  let ufDetectada = uf ? String(uf).trim().toUpperCase() : null;

  if (!ufDetectada) {
    const ufMatch = str.match(/\b([A-Z]{2})\b/);
    if (ufMatch && UFS_BRASIL.includes(ufMatch[1])) {
      ufDetectada = ufMatch[1];
    }
  }

  if (!ufDetectada || !UFS_BRASIL.includes(ufDetectada)) {
    return false;
  }

  const cleanNum = str
    .replace(/^CRMV[\s\/-]*/i, '')
    .replace(new RegExp(`[\\s\\/-]*${ufDetectada}[\\s\\/-]*`, 'gi'), '')
    .replace(/[^\d]+/g, '');

  if (!cleanNum || cleanNum.length < 1 || cleanNum.length > 7) {
    return false;
  }

  return true;
}

/**
 * Validação de peso do animal em gramas (estritamente inteiro, dentro de faixa plausível)
 */
export function validarPesoGramas(pesoGrams, min = 10, max = 1500000) {
  if (pesoGrams === undefined || pesoGrams === null || pesoGrams === '') return false;
  const num = typeof pesoGrams === 'number' ? pesoGrams : Number(pesoGrams);
  if (isNaN(num) || !Number.isInteger(num)) return false;
  return num >= min && num <= max;
}

