# 💊 MedConnect Application

> Plataforma web que conecta pacientes a farmácias de manipulação — desenvolvida com **TDD**, **CI/CD** e boas práticas de engenharia de software.

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)

---

## 🚀 Demo ao vivo

🔗 **[Acesse o MedConnect aqui](https://alexsander020.github.io/MedConnect_Application/app-cotacao)**

---

## 🛠️ Práticas de Engenharia Aplicadas

Este projeto foi desenvolvido aplicando metodologias usadas em times de tecnologia de alto nível:

| Prática | Descrição |
|---|---|
| **TDD — Test-Driven Development** | Testes escritos antes do código (Red → Green → Refactor) usando Jest |
| **CI/CD com GitHub Actions** | Pipeline que roda testes a cada commit e faz deploy automático no GitHub Pages |
| **Refatoração Segura** | Código legado refatorado com cobertura de testes como rede de proteção |
| **Pair Programming** | Interface desenvolvida com programação em par (simulado com IA) |
| **Código Modular** | Lógica de validação reutilizada entre módulos diferentes |

---

## 💡 Sobre o Produto

Pacientes que precisam de medicamentos manipulados enfrentam um processo lento e burocrático: precisam ir presencialmente a várias farmácias, comparar preços manualmente e enviar receitas em papel.

O **MedConnect** resolve isso digitalizando toda a jornada:

**Para o paciente:**
- Envio de receita médica (imagem ou PDF)
- Solicitação e comparação de cotações de múltiplas farmácias
- Acompanhamento do status do pedido em tempo real

**Para a farmácia:**
- Perfil empresarial digital
- Recebimento e gestão de solicitações de orçamento
- Atualização de status e recebimento de avaliações

---

## 🧪 Desafios Técnicos

### Desafio 1 — TDD: Biblioteca de Validação
Funções de validação (`ehEmailValido`, `ehCPFValido`, `ehSenhaForte`) desenvolvidas com testes Jest antes da implementação. A validação de CPF inclui cálculo completo dos dígitos verificadores via RegEx e lógica matemática — cobertura de casos positivos, negativos e edge cases.

### Desafio 2 — Pair Programming: App de Cotações
Interface `app-cotacao` com design **Glassmorphism**, animações CSS fluidas, tipografia moderna e lógica JavaScript assíncrona simulando chamadas de API com estados de loading e sucesso.

### Desafio 3 — Refatoração Segura: Código Legado
Refatoração de código com condicionais aninhados e variáveis mal nomeadas (`d`, `t`, `r`) para código limpo e legível — sem quebrar nenhum comportamento, certificado por 8 testes automatizados.

### Desafio 4 — CI/CD: Integração Contínua + Hospedagem
Dois workflows configurados no GitHub Actions:
- **`ci.yml`** — executa `npm run test` a cada commit ou pull request nas branches principais
- **`deploy-pages.yml`** — deploy automático da aplicação no GitHub Pages a cada push

---

## 📁 Estrutura do Projeto

```
MedConnect_Application/
│
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Pipeline de testes automáticos
│       └── deploy-pages.yml        # Deploy automático no GitHub Pages
│
├── MedConnect/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── hooks/
│       ├── context/
│       └── routes/
│
├── app-cotacao/                    # Interface Glassmorphism (Desafio 2)
│
├── README.md
└── diario-de-bordo.md              # Documentação do processo de desenvolvimento
```

---

## 📖 Diário de Bordo

Todo o processo de desenvolvimento — decisões técnicas, desafios superados e aprendizados — está documentado no **[Diário de Bordo](./diario-de-bordo.md)**.

---

## ▶️ Como executar localmente

**Pré-requisitos:** Node.js instalado.

```bash
# Clone o repositório
git clone https://github.com/alexsander020/MedConnect_Application.git
cd MedConnect_Application

# Instale as dependências
npm install

# Execute os testes
npm run test

# Abra o app-cotacao no navegador
open app-cotacao/index.html
```

---

## 👤 Autor

**Alexsander Sudario Abreu**
Estudante de Ciência da Computação — FECAP, São Paulo

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/alexsander-sudario-0a793524a/)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/alexsander020)
