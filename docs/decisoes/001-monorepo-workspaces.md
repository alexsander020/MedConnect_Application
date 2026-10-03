# ADR 001: Adoção de Monorepo com NPM Workspaces

## Status
Aceito

## Contexto
O ecossistema MedConnect era composto originalmente por diretórios separados: um frontend SPA em React (`MedConnect/`), uma API backend em Node.js (`backend/`), um protótipo estático (`app-cotacao/`) e lógica duplicada de validação de formulários (CPF, e-mail, senha). Manter repositórios ou estruturas isoladas aumentava a complexidade de desenvolvimento, versionamento e execução dos testes em pipelines de CI.

## Decisão
Adotamos uma estrutura de **Monorepo gerenciada via NPM Workspaces** (`package.json` raiz):
- `MedConnect/`: Frontend SPA construído com React 19 e Vite.
- `backend/`: API RESTful construída com Express, TypeScript e Prisma.
- `packages/validation/`: Biblioteca compartilhada (`@medconnect/validation`) com algoritmos matemáticos de validação e tipos TypeScript (`index.d.ts`).
- `legacy/`: Arquivamento do protótipo estático original, preservando histórico.

## Consequências
- **Positivas**:
  - Comando único `npm run dev` para subir simultaneamente frontend e backend com logging colorido via `concurrently`.
  - Comando único `npm test` e `npm run build` para validar todos os módulos.
  - O pipeline de CI no GitHub Actions executa os testes em paralelo economizando minutos de execução.
  - Eliminação de duplicação de regras de negócio entre front e back.
- **Mitigações**:
  - Uso de `--legacy-peer-deps` na instalação automatizada para evitar conflitos de dependências legadas.
