export function ehEmailValido(str) {
  if (!str) return false;
  // Regex básica para email válido
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(str);
}

export function ehCPFValido(str) {
  if (!str) return false;
  
  // Remove caracteres não numéricos
  const cpf = str.replace(/[^\d]+/g, '');
  
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcularDigito = (fatorInicial, tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) {
      soma += parseInt(cpf.charAt(i)) * (fatorInicial - i);
    }
    const resto = 11 - (soma % 11);
    return (resto === 10 || resto === 11) ? 0 : resto;
  };

  const digito1 = calcularDigito(10, 9);
  if (digito1 !== parseInt(cpf.charAt(9))) return false;

  const digito2 = calcularDigito(11, 10);
  return digito2 === parseInt(cpf.charAt(10));
}

export function ehSenhaForte(str) {
  if (!str) return false;
  
  // Minimo 8 caracteres, pelo menos 1 maiúscula, 1 número, 1 especial
  if (str.length < 8) return false;
  
  const temMaiuscula = /[A-Z]/.test(str);
  const temNumero = /[0-9]/.test(str);
  const temEspecial = /[^A-Za-z0-9]/.test(str);
  
  return temMaiuscula && temNumero && temEspecial;
}
