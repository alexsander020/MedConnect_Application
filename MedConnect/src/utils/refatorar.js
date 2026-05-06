export function processar(valor, tipo) {
  let resultado = 0;

  if (tipo === 'VIP') {
    resultado = valor > 500 ? valor * 0.8 : valor * 0.9;
  } else {
    resultado = valor > 500 ? valor * 0.95 : valor;
  }

  if (resultado > 1000) {
    resultado -= 50;
  }

  return resultado;
}

export function formatar(valor) {
  return `R$${valor.toFixed(2)}`;
}
