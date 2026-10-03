document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('cotacao-form');
  const fileInput = document.getElementById('receita');
  const fileNameDisplay = document.getElementById('file-name');
  const emailInput = document.getElementById('email');
  const emailGroup = emailInput.closest('.form-group');
  const submitBtn = document.getElementById('submit-btn');
  const successMessage = document.getElementById('success-message');
  const newQuoteBtn = document.getElementById('new-quote-btn');

  // Regex para validação de email simulando a função do desafio 1
  const ehEmailValido = (str) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(str);
  };

  // Exibir nome do arquivo selecionado
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      fileNameDisplay.textContent = e.target.files[0].name;
    } else {
      fileNameDisplay.textContent = '';
    }
  });

  // Validação de email em tempo real
  emailInput.addEventListener('input', () => {
    if (emailInput.value && !ehEmailValido(emailInput.value)) {
      emailGroup.classList.add('invalid');
    } else {
      emailGroup.classList.remove('invalid');
    }
  });

  // Form submit handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Validação final de email
    if (!ehEmailValido(emailInput.value)) {
      emailGroup.classList.add('invalid');
      emailInput.focus();
      return;
    }

    // Inicia estado de loading
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    // Simula uma requisição HTTP (delay de 2 segundos)
    setTimeout(() => {
      form.classList.add('hidden');
      document.querySelector('.panel-header').classList.add('hidden');
      successMessage.classList.remove('hidden');
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }, 2000);
  });

  // Resetar formulário para nova cotação
  newQuoteBtn.addEventListener('click', () => {
    form.reset();
    fileNameDisplay.textContent = '';
    successMessage.classList.add('hidden');
    document.querySelector('.panel-header').classList.remove('hidden');
    form.classList.remove('hidden');
  });

  // Adicionar máscara de telefone simples
  const telefoneInput = document.getElementById('telefone');
  telefoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 10) {
      value = `${value.slice(0, 10)}-${value.slice(10)}`;
    }
    e.target.value = value;
  });
});
