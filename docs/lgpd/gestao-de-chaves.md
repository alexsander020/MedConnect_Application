# Política e Procedimento Operacional: Gestão de Chaves Criptográficas — MedConnect

> **AVISO IMPORTANTE / DISCLAIMER LEGAL:**
> **RASCUNHO TÉCNICO — REVISÃO DE SEGURANÇA E CONFORMIDADE OBRIGATÓRIA.**
> Este documento descreve a política técnica de gestão de chaves criptográficas para dados em repouso na plataforma MedConnect. Os procedimentos descritos atendem às melhores práticas de engenharia de software e ao Artigo 46 da LGPD (medidas de segurança, técnicas e administrativas). A aprovação formal deste procedimento depende de validação conjunta do Encarregado pelo Tratamento de Dados (DPO), do Responsável por Segurança da Informação (CISO) e da assessoria jurídica.

---

## 1. Contexto e Objetivos

O Artigo 46 da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018) determina que os agentes de tratamento devem adotar medidas de segurança aptas a proteger os dados pessoais de acessos não autorizados e de situações acidentais ou ilícitas de destruição, perda, alteração ou vazamento.

Para assegurar a confidencialidade em repouso dos dados pessoais mantidos no banco de dados relacional PostgreSQL, a MedConnect implementa criptografia no nível de aplicação (Application-Level Field Encryption) para os seguintes campos da tabela `User`:
- `phone` (Telefone de contato do titular);
- `address` (Endereço físico de entrega);
- `cpfEncrypted` (Número do Cadastro de Pessoas Físicas).

---

## 2. Padrões Criptográficos Adotados

### 2.1 Algoritmo e Modo de Operação
- **Algoritmo**: AES (Advanced Encryption Standard).
- **Tamanho da Chave**: 256 bits (32 bytes).
- **Modo de Operação**: GCM (Galois/Counter Mode).
- **Vantagens do GCM**: É um algoritmo de Criptografia Autenticada com Dados Associados (AEAD). Ele garante tanto a **confidencialidade** (o dado não pode ser lido sem a chave) quanto a **integridade/autenticidade** (qualquer adulteração no texto cifrado ou no IV causará falha na autenticação do Authentication Tag, impedindo ataques de injeção ou bit-flipping).

### 2.2 Vetor de Inicialização (IV) e Authentication Tag
- **IV (Initialization Vector)**: 12 bytes (96 bits) gerados de forma criptograficamente segura via `crypto.randomBytes(12)` a cada operação de escrita. **Nunca** reutilizar o mesmo IV com a mesma chave.
- **Authentication Tag (Auth Tag)**: 16 bytes (128 bits) gerados pelo modo GCM ao finalizar a cifra.

### 2.3 Estrutura do Texto Cifrado em Repouso
O valor persistido no banco de dados segue a estrutura serializada:
```text
keyId:iv:tag:ciphertext
```
Exemplo real:
```text
v1:9e01f2...a1:4c72d9...3b:8f31b2...0c
```
- `keyId`: Identificador da versão da chave que cifrou o dado (ex: `v1`, `v2`, `2026-q4`). Permite rotação gradual sem downtime.
- `iv`: Vetor de inicialização de 12 bytes codificado em hexadecimal.
- `tag`: Tag de autenticação de 16 bytes codificado em hexadecimal.
- `ciphertext`: Conteúdo criptografado codificado em hexadecimal.

*Nota de retrocompatibilidade:* O sistema mantém suporte a registros legados de 3 partes (`iv:tag:ciphertext`), associando-os automaticamente à chave `v1`.

---

## 3. Configuração de Variáveis de Ambiente

As chaves criptográficas **NUNCA** são versionadas em repositórios Git nem gravadas em arquivos de build estáticos. Elas são injetadas estritamente em tempo de execução via variáveis de ambiente:

### 3.1 Dicionário de Chaves Ativas
```env
# Chave atual padrão utilizada para novas escritas
FIELD_ENCRYPTION_CURRENT_KEY_ID="v1"

# Mapa de chaves em formato JSON (Chave ID -> Hexadecimal de 32 bytes / 64 caracteres hex)
FIELD_ENCRYPTION_KEYS='{"v1":"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef","v2":"fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"}'

# Chave mestra legada (fallback para v1 caso o mapa acima não seja especificado)
FIELD_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

### 3.2 Geração de Nova Chave de 256 bits
Para gerar uma nova chave válida de 256 bits em hexadecimal seguro:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Procedimento Operacional de Rotação de Chaves

A rotação de chaves pode ocorrer por:
1. **Rotina Programada**: A cada 12 meses (recomendação PCI-DSS / ISO 27001).
2. **Mudança de Equipe**: Saída de colaboradores com acesso aos segredos do ambiente produtivo.
3. **Incidente de Segurança**: Suspeita de vazamento da chave de criptografia.

### Passo 1: Provisionar a Nova Chave no Ambiente
1. Gere uma nova chave hexadecimal (`keyId = "v2"`).
2. Adicione a nova chave ao mapa `FIELD_ENCRYPTION_KEYS` no gerenciador de segredos (ex: AWS Secrets Manager / Vault / GCP Secret Manager).
3. Atualize a variável `FIELD_ENCRYPTION_CURRENT_KEY_ID="v2"`.
4. Reinicie os serviços da API da MedConnect.
   - *Resultado*: A partir deste momento, qualquer nova alteração cadastral ou novo usuário será cifrado com a chave `v2`. Registros antigos ainda sob a chave `v1` continuam sendo decifrados transparentemente porque a chave `v1` ainda está presente no mapa.

### Passo 2: Reencriptação em Segundo Plano (Zero Downtime)
A plataforma disponibiliza o método `rotateEncryptedField(oldCiphertext, targetKeyId)` no módulo `backend/src/lib/fieldEncryption.ts`.

Para executar a rotação completa em lote no banco sem indisponibilidade:
```typescript
import { rotateEncryptedField, getCurrentKeyId } from './src/lib/fieldEncryption';
import prisma from './src/lib/prisma';

async function executeKeyRotationBatch(newKeyId: string) {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { keyId: { not: newKeyId } },
        { keyId: null }
      ]
    }
  });

  for (const user of users) {
    const updateData: Record<string, string | null> = { keyId: newKeyId };

    if (user.phone) {
      updateData.phone = rotateEncryptedField(user.phone, newKeyId);
    }
    if (user.address) {
      updateData.address = rotateEncryptedField(user.address, newKeyId);
    }
    if (user.cpfEncrypted) {
      updateData.cpfEncrypted = rotateEncryptedField(user.cpfEncrypted, newKeyId);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });
  }
}
```

### Passo 3: Depreciação da Chave Antiga
1. Verifique via query se ainda existe algum registro apontando para a chave antiga:
   ```sql
   SELECT COUNT(*) FROM "User" WHERE "keyId" != 'v2';
   ```
2. Após zerar a contagem, remova a chave `v1` do mapa `FIELD_ENCRYPTION_KEYS`.
3. Qualquer tentativa de leitura com um token ou backup desatualizado cifrado com `v1` será sumariamente rejeitada pelo motor criptográfico.

---

## 5. Recomendações de Evolução de Infraestrutura (KMS)

Para ambientes de produção de alta escala e conformidade rigorosa, recomenda-se a substituição das chaves em variáveis de ambiente por um serviço de gerenciamento de chaves em nuvem (Hardware Security Module - HSM / KMS):
- **AWS KMS** (Key Management Service) com Envelope Encryption (DEK - Data Encryption Key);
- **Google Cloud KMS** com proteção Cloud HSM;
- **HashiCorp Vault** com transit secret engine.

Nesse modelo, o servidor MedConnect nunca armazena a Chave Mestra (CMK - Customer Master Key), solicitando apenas operações de decifragem ou geração de chaves efêmeras autenticadas via IAM Role.

---

## 6. Procedimento de Emergência em Caso de Vazamento de Chaves

1. **Notificação Imediata**: Notificar o DPO e o Comitê de Resposta a Incidentes (ver `plano-de-resposta-a-incidentes.md`).
2. **Geração Imediata de Nova Chave (`v_emergencial`)**: Adicionar imediatamente ao gerenciador de segredos.
3. **Isolamento de Credenciais**: Revogar tokens de acesso a servidores e alterar senhas de acesso aos consoles de infraestrutura.
4. **Execução Prioritária do Script de Rotação**: Migrar todos os dados da base para a nova chave.
5. **Auditoria Forense de Logs**: Consultar a tabela `AuditLog` para checar se houve exfiltração em massa de registros anteriores à rotação.
6. **Avaliação Regulatória**: Jurídico e DPO avaliam a necessidade de comunicação à ANPD em até 3 dias úteis `[PENDENTE DE VALIDAÇÃO JURÍDICA]`.
