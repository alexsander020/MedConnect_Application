# ADR 004: Gestão Estrita de Variáveis de Ambiente e Remoção de Fallback JWT

## Status
Aceito

## Contexto
O segredo JWT (`JWT_SECRET`) possuía fallback hardcoded estático no backend, nos testes e no `docker-compose.yml`, violando o princípio de "falhar fechado" e expondo chaves em repositório. Além disso, a ausência de variáveis obrigatórias não impedia a inicialização da aplicação, permitindo execuções em estado inseguro.

## Decisão
1. **Módulo Centralizado de Ambiente (`backend/src/config/env.ts`)**:
   - Validação com Zod de todas as variáveis na inicialização (`NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `CLOUDINARY_*`).
   - `JWT_SECRET` exige no mínimo 32 caracteres.
   - Credenciais do Cloudinary são obrigatórias em ambiente de produção.
   - Em caso de falha de validação, a aplicação registra os campos ausentes/inválidos (sem expor nenhum valor) e encerra o processo com código 1.
2. **Remoção Absoluta de Fallbacks Hardcoded**:
   - `auth.controller.ts`, `auth.middleware.ts` e `server.ts` consomem exclusivamente `env.JWT_SECRET`.
   - Remoção de qualquer ocorrência de literais de segredo em todo o repositório e substituição por variáveis de ambiente e arquivos `.env` / placeholders.
3. **Cobertura Automatizada (TDD)**:
   - Testes em `backend/tests/env.test.ts` verificando rejeição de segredos curtos, ausentes, regras de produção e rejeição de tokens com segredo legado.
