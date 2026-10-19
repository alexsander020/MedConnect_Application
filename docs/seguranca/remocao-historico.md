# Procedimento Manual de Purga de Histórico e Rotação de Credenciais

> [!CAUTION]
> **ATENÇÃO**: Este procedimento reescreve o histórico do Git e invalida commits anteriores. Deve ser executado manualmente por um administrador do repositório, em horário planejado e após alinhamento com a equipe.

---

## 1. Purga de `backend/prisma/dev.db` do Histórico Git via `git-filter-repo`

Como o arquivo `backend/prisma/dev.db` foi versionado em commits passados, ele ainda existe nos snapshots históricos do Git. O `git-filter-repo` é a ferramenta recomendada oficialmente pelo Git para purga segura.

### Pré-requisitos
1. Python 3.8+ instalado.
2. Instalar a ferramenta oficial:
   ```bash
   pip install git-filter-repo
   ```

### Passo a passo
1. **Fazer backup completo da pasta do repositório**:
   ```bash
   cp -r MedConnect_Application MedConnect_Application_BACKUP
   ```

2. **Garantir que a working tree esteja limpa**:
   ```bash
   git status
   ```

3. **Executar a remoção do arquivo de todo o histórico**:
   ```bash
   git filter-repo --path backend/prisma/dev.db --invert-paths --force
   ```

4. **Verificar que o arquivo foi expurgado dos commits**:
   ```bash
   git log --all --full-history -- "backend/prisma/dev.db"
   # A saída deve ser vazia.
   ```

---

## 2. Publicação do Histórico Reescrito e Instruções de Reclone

Como o histórico foi reescrito, todos os hashes de commit mudaram.

### 1. Atualizar o repositório remoto (Force Push)
O `git-filter-repo` desconecta o remote por segurança. Reative e envie:
```bash
git remote add origin <URL_DO_REPOSITORIO>
git push origin --force --all
git push origin --force --tags
```

### 2. Instruções obrigatórias para os desenvolvedores e colaboradores
> [!WARNING]
> Nenhum desenvolvedor deve executar `git pull` na working copy antiga! Fazer `pull` reintroduzirá os commits antigos com os arquivos confidenciais.

**Orientação para cada membro da equipe:**
1. Descartar ou arquivar o clone local anterior.
2. Realizar um clone novo e limpo:
   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd MedConnect_Application
   ```

---

## 3. Rotação de Senhas de Contas Existentes

Como os hashes de senha das contas locais foram expostos no `dev.db`, todas as contas devem ter suas senhas alteradas imediatamente.

Para cada conta (usuários ou farmácias), execute o script seguro:
```bash
cd backend
node scripts/reset-password.js <email_da_conta> <nova_senha_forte>
```
*Dica*: Se omitir a nova senha, o script solicitará a digitação via `stdin` sem exibir no histórico do terminal.

---

## 4. Invalidação de Tokens Emitidos (Rotação do `JWT_SECRET`)

Qualquer token JWT gerado antes desta fase pode ter sido assinado com o fallback ou chaves conhecidas. Para revogar e invalidar 100% das sessões existentes:

1. **Gerar um novo segredo criptograficamente seguro (64 caracteres hex)**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Atualizar o arquivo `.env` nos ambientes de desenvolvimento, homologação e produção**:
   ```dotenv
   JWT_SECRET=<NOVO_SEGREDO_GERADO_ACIMA>
   ```

3. **Reiniciar o servidor da API**:
   - Como a validação estrita do `env.ts` confere o segredo na inicialização, qualquer token assinado com a chave anterior será rejeitado com HTTP 401 (`Token inválido`), forçando todos os usuários a realizarem novo login de forma segura.
