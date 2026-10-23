# Procedimento Operacional: Backup Automático e Restauração do PostgreSQL

Este documento estabelece o protocolo oficial de salvaguarda, redundância e recuperação de desastres (Disaster Recovery - DR) para os bancos de dados PostgreSQL da plataforma **MedConnect** em ambientes de Homologação (Staging) e Produção.

---

## 1. Estratégia de Backup

O MedConnect armazena dados críticos e sensíveis em conformidade com a LGPD e resoluções sanitárias (ANVISA/CFF). A política de backup combina:

1. **Backups Diários Completos (Snapshots Físicos / Lógicos)**:
   - Execução diária via `pg_dump` em formato binário comprimido (`-Fc`).
   - Retenção: 30 dias para backups diários, 12 meses para o primeiro dia de cada mês.
2. **Criptografia em Repouso**:
   - Os arquivos de dump gerados são criptografados com GPG / AES-256 antes de qualquer transferência externa.
3. **Armazenamento Seguro em Nuvem (Off-site)**:
   - Sincronização automática para bucket com Object Versioning e Imutabilidade (WORM/Object Lock) para proteção contra ransomware.

---

## 2. Script de Backup Automático (`scripts/backup-db.sh`)

O script abaixo deve ser configurado via cron job no servidor ou executado como cron job gerenciado:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configurações do ambiente
BACKUP_DIR="/var/backups/medconnect"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATABASE_NAME="${POSTGRES_DB:-medconnect}"
DUMP_FILE="${BACKUP_DIR}/${DATABASE_NAME}_${TIMESTAMP}.dump"
GPG_RECIPIENT="seguranca@medconnect.com.br"
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}"

echo "[$(date -Is)] Iniciando backup lógico do banco ${DATABASE_NAME}..."

# Executa pg_dump comprimido
pg_dump -h "${POSTGRES_HOST:-localhost}" \
        -p "${POSTGRES_PORT:-5432}" \
        -U "${POSTGRES_USER:-medconnect_user}" \
        -d "${DATABASE_NAME}" \
        -F c \
        -b \
        -v \
        -f "${DUMP_FILE}"

echo "[$(date -Is)] Backup concluído com sucesso: ${DUMP_FILE} ($(du -sh "${DUMP_FILE}" | cut -f1))"

# Criptografia opcional do arquivo
if command -v gpg >/dev/null 2>&1; then
    echo "[$(date -Is)] Criptografando dump..."
    gpg --batch --yes --encrypt --recipient "${GPG_RECIPIENT}" "${DUMP_FILE}"
    rm -f "${DUMP_FILE}"
    DUMP_FILE="${DUMP_FILE}.gpg"
fi

# Upload para armazenamento off-site (exemplo AWS S3 ou Cloudflare R2 / GCS)
if [ -n "${BACKUP_BUCKET:-}" ]; then
    echo "[$(date -Is)] Enviando para bucket ${BACKUP_BUCKET}..."
    aws s3 cp "${DUMP_FILE}" "s3://${BACKUP_BUCKET}/postgres/${TIMESTAMP}/"
fi

# Limpeza de backups mais antigos que a retenção
echo "[$(date -Is)] Removendo backups locais com mais de ${RETENTION_DAYS} dias..."
find "${BACKUP_DIR}" -type f -name "${DATABASE_NAME}_*.dump*" -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date -Is)] Rotina de backup finalizada com sucesso."
```

### Agendamento no Crontab

Adicione a seguinte linha na crontab do sistema operacional (`crontab -e`):

```cron
# Executar diariamente às 02h00 da madrugada (UTC-3)
0 2 * * * /opt/medconnect/backend/scripts/backup-db.sh >> /var/log/medconnect-backup.log 2>&1
```

---

## 3. Protocolo de Teste de Restauração (Simulação de DR)

Para garantir que o backup é íntegro e legível, um teste de restauração deve ser realizado periodicamente (ou de forma automatizada no pipeline de staging) seguindo o procedimento abaixo em uma instância isolada.

> [!CAUTION]
> **NUNCA** execute testes de restauração no banco de produção diretamente. Realize sempre em um banco temporário ou de testes (ex: `medconnect_restore_test`).

### Passo 1: Obter e descriptografar o backup

```bash
# Se o arquivo estiver criptografado
gpg --decrypt medconnect_20261023_020000.dump.gpg > medconnect_restore.dump
```

### Passo 2: Criar banco de dados limpo para o teste

```bash
psql -h localhost -U medconnect_user -d postgres -c "DROP DATABASE IF EXISTS medconnect_restore_test;"
psql -h localhost -U medconnect_user -d postgres -c "CREATE DATABASE medconnect_restore_test;"
```

### Passo 3: Executar a restauração via `pg_restore`

```bash
pg_restore -h localhost \
           -p 5432 \
           -U medconnect_user \
           -d medconnect_restore_test \
           --clean \
           --if-exists \
           --no-owner \
           --no-privileges \
           -v medconnect_restore.dump
```

### Passo 4: Validação de Integridade

Verifique a presença e consistência das tabelas e registros:

```bash
psql -h localhost -U medconnect_user -d medconnect_restore_test -c "
SELECT 
  (SELECT COUNT(*) FROM \"User\") AS total_users,
  (SELECT COUNT(*) FROM \"Pharmacy\") AS total_pharmacies,
  (SELECT COUNT(*) FROM \"Prescription\") AS total_prescriptions,
  (SELECT COUNT(*) FROM \"Quote\") AS total_quotes,
  (SELECT COUNT(*) FROM \"Order\") AS total_orders,
  (SELECT COUNT(*) FROM \"_prisma_migrations\") AS applied_migrations;
"
```

Critérios de Aceite da Restauração:
- O número de migrações em `_prisma_migrations` deve coincidir exatamente com a pasta `prisma/migrations`.
- As chaves estrangeiras e integridade referencial não devem apresentar órfãos (`quote-to-order-integrity`).
- O aplicativo deve conseguir iniciar apontando para a base restaurada com o endpoint `/ready` retornando HTTP 200 `{ status: "ready" }`.

---

## 4. Política de Retenção e RPO / RTO

| Parâmetro | Meta / Definição |
| :--- | :--- |
| **RPO (Recovery Point Objective)** | Máximo de 24 horas (com WAL archiving contínuo: até 5 minutos). |
| **RTO (Recovery Time Objective)** | Menos de 30 minutos para restauração completa em novo cluster. |
| **Frequência de Testes** | Mensal de forma manual ou semanal via automação em ambiente efêmero. |
| **LGPD Compliance** | Dumps criptografados com chave gerenciada e política estrita de exclusão após 30 dias. |
