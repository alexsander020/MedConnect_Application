# ADR 005: Isolamento de Banco Local, Scripts e Procedimento de Purga de Histórico

## Status
Aceito

## Contexto
O arquivo de banco de dados SQLite `backend/prisma/dev.db` encontrava-se rastreado no repositório com dados e hashes de contas prévias. Adicionalmente, scripts soltos na raiz do backend continham comportamentos permissivos de dump de dados ou senhas estáticas. Era mandatório desvincular o banco do controle de versão sem afetar o histórico atual (preservando o repositório até a purga controlada) e estruturar scripts administrativos locais.

## Decisão
1. **Desindexação e Regras de `.gitignore`**:
   - `backend/prisma/dev.db` foi removido do rastreamento do Git (`git rm --cached`).
   - `.gitignore` (raiz e backend) atualizados para cobrir estritamente `*.db`, `*.db-journal`, `*.sqlite*`, `.env`, `.env.*` (preservando `!.env.example`), `uploads/` e `dist/`.
2. **Reestruturação e Sanitização de Scripts**:
   - Scripts movidos para `backend/scripts/`: `check-db.js` e `reset-password.js`.
   - Adicionado cabeçalho explícito de advertência de uso restrito local.
   - `check-db.js` adaptado para exibir exclusivamente contagem de tabelas sem expor dados pessoais ou credenciais.
   - `reset-password.js` refatorado para ler nova senha exclusivamente via argumentos de CLI ou `stdin` interativo.
3. **Documentação de Purga do Histórico**:
   - Criado `docs/seguranca/remocao-historico.md` contendo o guia passo a passo para execução manual pelo mantenedor via `git-filter-repo`, force-push coordenado, novo clone pela equipe e rotação de credenciais.
