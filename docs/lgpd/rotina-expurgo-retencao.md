# Rotina Operacional de Retenção e Expurgo de Dados — MedConnect

> **AVISO IMPORTANTE / DISCLAIMER LEGAL:**
> **RASCUNHO TÉCNICO — REVISÃO JURÍDICA E REGULATÓRIA OBRIGATÓRIA.**
> A retenção e o descarte de dados pessoais e de saúde devem equilibrar os direitos do titular (Art. 18 da LGPD) com as obrigações regulatórias da ANVISA (RDC nº 67/2007), Conselho Federal de Farmácia (CFF), Marco Civil da Internet (Lei nº 12.965/2014) e prazos prescricionais cíveis/tributários. Todos os prazos e regras sugeridos neste documento estão marcados como **[PENDENTE DE VALIDAÇÃO JURÍDICA]**.

---

## 1. Princípio da Minimização e Término do Tratamento

O Artigo 15 da LGPD preconiza o término do tratamento de dados quando a finalidade for alcançada, os dados deixarem de ser necessários ou houver revogação do consentimento. Contudo, o Artigo 16 da LGPD autoriza expressamente a **conservação de dados** para:
- **Inciso I**: Cumprimento de obrigação legal ou regulatória pelo controlador;
- **Inciso II**: Estudo por órgão de pesquisa (garantida a anonimização);
- **Inciso III**: Transferência a terceiro (respeitados os requisitos da lei);
- **Inciso IV**: Uso exclusivo do controlador, com acesso restrito e desde que anonimizados os dados.

Por razões de segurança jurídica e para evitar a eliminação indevida de dados necessários à defesa em juízo ou cumprimento de fiscalizações sanitárias, a **rotina automática de expurgo da MedConnect vem DESATIVADA POR PADRÃO**.

---

## 2. Arquitetura do Serviço: `DataRetentionService`

O serviço backend está localizado em:
`backend/src/services/dataRetentionService.ts`

### 2.1 Controle por Variáveis de Ambiente
A rotina agendada respeita a seguinte variável de ambiente:
```env
# Por padrão: false. Exige habilitação explícita para execução em background.
RETENTION_PURGE_ENABLED="false"

# Janela de tolerância para expurgo de prescrições canceladas (em dias)
RETENTION_CANCELLED_PRESCRIPTION_DAYS="90"
```

### 2.2 Itens Elegíveis para Expurgo

#### A. Tokens de Segurança e Autenticação Vencidos (Técnico / Operacional)
- **Tabelas**: `RefreshToken`, `PasswordResetToken`, `EmailVerificationToken`.
- **Regra**: Registros cuja data de validade (`expiresAt`) seja inferior a `agora` ou com flag `used: true` / `isRevoked: true` após a janela de carência.
- **Impacto de Privacidade**: Baixo/Positivo (higiene criptográfica e redução da superfície de ataque).
- **Risco Jurídico**: Nulo (são dados puramente técnicos efêmeros).

#### B. Prescrições Canceladas sem Propostas e sem Pedidos Vinculados
- **Tabela**: `Prescription`.
- **Regra**: Prescrições com `status = CANCELLED`, sem nenhuma cotação aceita (`QuoteStatus != ACCEPTED`) e sem pedido (`Order`), cujo cancelamento ocorreu há mais de 90 dias `[PENDENTE DE VALIDAÇÃO JURÍDICA]`.
- **Ação**: Exclusão do arquivo do storage físico (`fs.unlinkSync` / bucket) e atualização do registro para estado sanitizado, com registro em `AuditLog`.

#### C. Prescrições com Medicamentos Manipulados Efetivamente Produzidos (NÃO EXPURGÁVEIS)
- **Regra**: Prescrições que originaram pedidos (`Order`) **NÃO** são apagadas sumariamente pelo expurgo automático.
- **Justificativa Sanitária**: A RDC ANVISA nº 67/2007 (Boas Práticas de Manipulação de Preparações Magistrais e Oficinais) exige a guarda de registros de formulação e prescrições por **no mínimo 5 anos** pela farmácia de manipulação. A eliminação unilateral violaria o dever sanitário e impossibilitaria a rastreabilidade em caso de reações adversas ou farmacovigilância.

---

## 3. Fluxo de Exclusão vs. Anonimização sob Demanda (Art. 18 da LGPD)

Quando um titular solicita a exclusão da sua conta via endpoint `POST /api/lgpd/anonymize` ou `POST /api/user/me/anonymize`:

1. **Validação de Bloqueio**:
   - O sistema verifica se o paciente possui pedidos em andamento (`PRODUCTION` ou `DELIVERY`). Se houver, a solicitação é **recusada** até a conclusão da entrega para garantir a execução do contrato.
2. **Revogação do Consentimento**:
   - O consentimento ativo do titular é marcado como `revokedAt = now()` na tabela `Consent`.
3. **Anonimização Cadastral (User)**:
   - `name`: Substituído por `"Titular Anonimizado"`;
   - `email`: Substituído por identificador anônimo irrecuperável: `anonimizado_<uuid>@anonimizado.medconnect.local`;
   - `phone`: Cifrado com payload nulo/mascarado;
   - `address`: Cifrado com payload nulo/mascarado;
   - `password`: Sobrescrito com hash aleatório descartável;
   - `isAnonymized = true`, `anonymizedAt = now()`.
4. **Preservação de Receitas Executadas**:
   - Receitas de pedidos já entregues são desvinculadas das informações cadastrais do titular na interface, mas preservadas no banco com marcação de proteção para auditoria regulatória e fiscal (LGPD Art. 16, I).
5. **Auditoria**:
   - A operação gera um evento com hash imutável na tabela `AuditLog` com a ação `ANONYMIZE_USER` para fins de comprovação perante a Autoridade Nacional de Proteção de Dados (ANPD).

---

## 4. Como Executar a Rotina de Expurgo

### 4.1 Execução Manual / Sob Demanda via Linha de Comando (CLI)
Para auditoria ou limpeza pontual em ambiente controlado:
```bash
# Executa via script TypeScript compilado
npm run retention:purge -w backend
```

### 4.2 Agendamento Automatizado em Produção (Cron Job)
Caso o departamento jurídico aprove a ativação contínua da limpeza:
```bash
# Exemplo no Crontab do Linux (execução toda madrugada às 03:00)
0 3 * * * cd /opt/medconnect/backend && RETENTION_PURGE_ENABLED=true npm run retention:purge >> /var/log/medconnect-purge.log 2>&1
```

---

## 5. Matriz de Retenção Sugerida `[PENDENTE DE VALIDAÇÃO JURÍDICA]`

| Categoria de Dado | Repositório | Prazo Sugerido | Fundamento Regulatório Sugerido | Ação ao Fim do Prazo |
| :--- | :--- | :--- | :--- | :--- |
| Logs de Conexão e Acesso | `PrescriptionAccessLog`, `AuditLog` | 6 meses (MCI) a 5 anos (Saúde/Cível) | Art. 15 Lei 12.965/14 e Art. 206 Código Civil | Arquivamento em cold storage e posterior deleção criptográfica. |
| Receitas Médicas sem Pedido | `Prescription` | 90 dias após cancelamento | Princípio da necessidade (Art. 6º, III LGPD) | Expurgo físico do arquivo e remoção lógica. |
| Receitas Médicas Executadas | `Prescription`, `Order` | 5 anos `[VALIDAR COM JURÍDICO]` | RDC ANVISA 67/2007 e Art. 27 CDC | Anonimização irreversível dos dados cadastrais associados. |
| Tokens de Autenticação | `RefreshToken`, `*Token` | Expiração + 7 dias | Segurança da informação (Art. 46 LGPD) | Remoção definitiva via query de limpeza. |
| Registros de Consentimento | `Consent` | 5 anos após encerramento da conta | Art. 8º, § 2º LGPD (ônus da prova) | Manutenção imutável para defesa probatória. |
