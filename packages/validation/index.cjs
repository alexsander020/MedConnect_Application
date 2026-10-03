/**
 * Validação de formato de E-mail
 */
function ehEmailValido(str) {
  if (!str || typeof str !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(str.trim());
}

/**
 * Validação de dígitos verificadores de CPF
 */
function ehCPFValido(str) {
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
function ehCNPJValido(str) {
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
function ehSenhaForte(str) {
  if (!str || typeof str !== 'string') return false;
  if (str.length < 8) return false;

  const temMaiuscula = /[A-Z]/.test(str);
  const temNumero = /[0-9]/.test(str);
  const temEspecial = /[^A-Za-z0-9]/.test(str);

  return temMaiuscula && temNumero && temEspecial;
}

module.exports = {
  ehEmailValido,
  ehCPFValido,
  ehCNPJValido,
  ehSenhaForte
};
