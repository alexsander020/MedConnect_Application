# ADR 003: Validação Compartilhada com TDD e Modelo de Segurança RBAC / IDOR

## Status
Aceito

## Contexto
Aplicações médicas e de prescrição exigem confiabilidade e proteção de dados rigorosas (LGPD). Era mandatório:
1. Validar documentos brasileiros fundamentais (CPF do paciente e CNPJ da farmácia) com cálculo oficial de dígitos verificadores matemáticos, e não apenas formato ou tamanho de texto.
2. Evitar vulnerabilidades do tipo IDOR (*Insecure Direct Object Reference*), garantindo que um paciente não visualize nem aprove receitas ou pedidos de outro, e que farmácias só alterem pedidos associados às suas cotações.
3. Prevenir senhas fracas no cadastro.

## Decisão
1. **Pacote Compartilhado `@medconnect/validation`**:
   - Implementado com metodologia TDD (Test-Driven Development) cobrindo casos válidos, inválidos e sequências repetidas.
   - Fornece `ehCPFValido`, `ehCNPJValido`, `ehEmailValido`, `ehSenhaForte` para consumo tanto no React quanto nos controllers da API Express.
2. **Controle de Acesso Baseado em Papéis (RBAC)**:
   - Papéis definidos: `PATIENT`, `PHARMACY`, `ADMIN`.
   - Middlewares dedicados `authMiddleware` (validação de JWT) e `roleMiddleware` (bloqueio de rotas não autorizadas).
3. **Prevenção de IDOR**:
   - Validações explícitas no `OrderController` e `PrescriptionController` verificando o ID do usuário autenticado contra a entidade no banco antes de qualquer mutação.
4. **Camada de Segurança HTTP**:
   - Headers HTTP reforçados via `helmet`.
   - Proteção contra abusos e força bruta via `express-rate-limit` (limite de 100 requisições / 15 min por IP).
