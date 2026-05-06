# Diário de Bordo - MedConnect

Este diário de bordo documenta o processo de desenvolvimento e os desafios superados durante a criação do projeto MedConnect e dos desafios propostos.

## Desafio 1: TDD na Prática — Biblioteca de Validação
**Objetivo:** Criar funções de validação escrevendo testes ANTES do código (Red → Green → Refactor).
**Prática:** Test-Driven Development (TDD)
**Valor:** Simplicidade + Feedback

Para garantir a qualidade, escrevemos uma suíte de testes unitários usando **Jest** (`validacoes.test.js`) cobrindo as funções `ehEmailValido`, `ehCPFValido` e `ehSenhaForte`. 
Garantimos a cobertura de casos positivos, negativos, e edge cases como strings vazias ou caracteres especiais. Após a criação dos testes (Red), implementamos as funções utilizando Expressões Regulares (RegEx) adequadas e cálculos lógicos para os dígitos verificadores do CPF (Green), garantindo um código simples e direto.

## Desafio 2: Pair Programming — App de Reserva de Cotações
**Objetivo:** Criar uma página HTML + CSS + JS baseada no conceito do MedConnect.
**Prática:** Pair Programming (Simulado com IA)

Desenvolvemos a interface `app-cotacao` utilizando Vanilla CSS sem frameworks adicionais. Focamos no design **Glassmorphism**, com animações fluidas (como os blobs animados em background), tipografia moderna (Outfit) e gradientes. A lógica em JavaScript foi feita de forma modular, reutilizando a regra de negócio da validação de e-mail do Desafio 1 e simulando uma chamada de API assíncrona com `setTimeout` para demonstração do Loader e tela de Sucesso.

## Desafio 3: Refatoração com Segurança — Código Legado
**Objetivo:** Refatorar código ruim usando testes como rede de segurança. Sem quebrar nada.
**Prática:** Refatoração com rede de testes
**Valor:** Coragem + Simplicidade

O arquivo original continha condicionais aninhados de difícil leitura e variáveis de nomeação pobre (`d`, `t`, `r`). Primeiramente, em `refatorar.test.js`, foram criados 6 testes para o método `processar` cobrindo todas as matrizes de decisão (VIP vs Normal e >500 vs <=500), e 2 testes para `formatar`.
Com a rede de testes ativa, o código foi reescrito melhorando as variáveis para `valor`, `tipo` e `resultado`. Utilizamos Operadores Ternários para deixar as regras condicionais evidentes e reduzidas, mantendo exatamente o mesmo comportamento original certificado pelos testes automatizados.

## Desafio 4: Integração Contínua + Hospedagem
**Objetivo:** Configurar CI básico e hospedar a página estática.
**Prática:** Integração Contínua
**Valor:** Feedback + Coragem

Para a integração contínua, criamos arquivos na pasta `.github/workflows`.
1. **ci.yml**: Configurado para instalar dependências do ecossistema e executar o `npm run test` a cada commit ou pull request nas ramificações principais, garantindo que nenhum teste (Desafio 1 e 3) quebre.
2. **deploy-pages.yml**: Automatiza a hospedagem da aplicação desenvolvida no Desafio 2 (na pasta `app-cotacao`), usando as Actions para gerar e fazer upload dos assets estáticos diretamente para a URL do **GitHub Pages**.

## Conclusão
Ao aplicar TDD, Refatoração Segura, Design Vanilla focado em estética e Integração Contínua, atingimos um alto padrão de qualidade em código e produto no desenvolvimento da prova de conceito do MedConnect.
