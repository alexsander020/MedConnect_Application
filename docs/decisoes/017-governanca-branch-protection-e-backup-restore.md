# 17. Governança de Branch Protection e Recuperação de Desastres (Backup & Restore)

## Status
Aceito

## Contexto
Sistemas de saúde e e-commerce farmacêutico lidam com informações sensíveis e registros financeiros imutáveis. A corrupção acidental da branch principal (`main`), inclusão de código sem revisão ou a perda de dados decorrente de falha de infraestrutura sem um plano de recuperação testado representam riscos severos à continuidade do negócio e à conformidade com a LGPD.

## Decisão
1. **Governança Estrita da Branch `main`**:
   - Bloqueio de pushes diretos (`git push origin main` desabilitado).
   - Obrigatoriedade de Pull Request com pelo menos 1 aprovação de revisor técnico (Peer Review).
   - Invalidação automática de aprovações (`dismiss stale reviews`) após novos commits.
   - Status checks de CI 100% verdes como pré-requisito bloqueante para merge (Lint, Typecheck, Testes com Postgres e cobertura mínima de 80%, Testes E2E com Playwright, Build e Auditoria de Segurança).
   - Bloqueio definitivo de force push (`--force`) e de deleção da branch `main`.
   - Documentação formal no repositório em `docs/operacao/branch-protection.md`.
2. **Estratégia de Recuperação de Desastres (Backup & Restore)**:
   - **Automação de Backup Contínuo**:
     - Backups lógicos diários gerados via `pg_dump` no formato custom (`-Fc`), compactados e versionados com timestamp (`medconnect_backup_YYYYMMDD_HHMMSS.dump`).
     - No ambiente gerenciado Render / Supabase, backups diários automáticos retidos por 7 a 30 dias com replicação geográfica (Point-in-Time Recovery - PITR quando disponível).
   - **Procedimento e Teste de Restauração**:
     - Script operacional padronizado utilizando `pg_restore` com flags seguras (`--clean --if-exists --no-owner --no-privileges`).
     - Documentação completa em `docs/operacao/backup-restore.md` com simulação de desastre, passo a passo de restauração e checklist de integridade de dados (validação de tabelas `User`, `Prescription`, `Quote` e `Order`).

## Consequências
- Impossibilidade de merges inadvertidos ou commits quebrados atingirem ambientes de staging e produção.
- Capacidade comprovada de restabelecer a operação em menos de 15 minutos (RTO < 15 min, RPO < 24h) em qualquer cenário de falha de infraestrutura ou corrupção de dados.
