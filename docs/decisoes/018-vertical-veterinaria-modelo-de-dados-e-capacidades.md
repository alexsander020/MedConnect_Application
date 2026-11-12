# ADR 018: Vertical Veterinária — Modelo de Dados, Capacidades e Regras de Integridade

## Status
Aceito

## Contexto
O MedConnect foi originalmente concebido para a manipulação de medicamentos humanos sob regulação da ANVISA, CRF e CFM. Para viabilizar o atendimento a animais domésticos e de produção (pet e pecuária), faz-se necessária a introdução da vertical veterinária, sujeita às normas regulatórias do Ministério da Agricultura e Pecuária (MAPA) e do Conselho Federal de Medicina Veterinária (CFMV/CRMV).

A extensão deve manter absoluta compatibilidade com o fluxo humano pré-existente (sem regressões ou quebra de contratos), garantir a integridade referencial e sanitária no banco de dados, e permitir a diferenciação clara das capacidades operacionais das farmácias parceiras.

## Decisão

1. **Separação por Dimensão `kind` na Receita**:
   - Criado o enum `PrescriptionKind` (`HUMAN`, `VETERINARY`). Todas as receitas existentes assumem `HUMAN` por padrão (`default: HUMAN`).
   - Criado o enum `VetDocumentType` (`MAGISTRAL`, `CONTROLLED_NOTIFICATION`) para diferenciar fórmulas comuns de receitas com Notificação de Receita Veterinária do MAPA (SIPEAGRO).

2. **Entidade `Animal` (Pet/Produção)**:
   - Criada a tabela `Animal` pertencente a um usuário tutor (`User.id` via `tutorId`), com campos: `id`, `tutorId`, `name`, `species` (enum `AnimalSpecies`), `breed`, `weightGrams` (Int), `birthDate`, `isFoodProducing` (Boolean, padrão `false`), `notes`, `deletedAt` (exclusão lógica) e timestamps.
   - Definida constraint de banco `animal_weight_positive_check` impondo `weightGrams > 0` estritamente em gramas (padrão D5, evitando floats).
   - Índice composto em `(tutorId, deletedAt)` para otimização de consultas e conformidade com exclusão lógica.

3. **Coerência Sanitária via CHECK Constraint em `Prescription`**:
   - Adicionada a constraint SQL `prescription_vet_coherence_check`:
     - Se `kind = 'VETERINARY'`: exige obrigatoriamente `petId IS NOT NULL`, `prescriberCrmv IS NOT NULL` e `prescriberUf IS NOT NULL`.
     - Se `kind = 'HUMAN'`: exige obrigatoriamente `petId IS NULL`.
   - Adicionado índice composto em `(kind, status)` para isolamento de murais e filtros de listagem.

4. **Verificação de Farmácia por Capacidades (`PharmacyCapability`)**:
   - Criada a entidade `PharmacyCapability` com restrição de unicidade `@@unique([pharmacyId, type])` e tipos `CapabilityType`:
     - `HUMAN_COMPOUNDING`: manipulação humana (CRF, Alvará Sanitário, AFE/ANVISA).
     - `VETERINARY_COMPOUNDING`: manipulação veterinária (Registro no MAPA, CRMV-PJ da empresa, Responsável Técnico).
   - Estados de verificação (`CapabilityStatus`): `PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`, `SUSPENDED`.
   - As evidências documentais são armazenadas no array `evidenceFileKeys`, registrando apenas identificadores de arquivos privados/autenticados, nunca URLs públicas diretas.

5. **Extensão de Cotações (`Quote`)**:
   - Inclusão dos campos opcionais `pharmaceuticalForm` (ex.: biscoito medicamentoso, pasta oral, suspensão flavorizada), `flavoring` (ex.: carne, frango, peixe) e `estimatedPreparationDays`.
   - O preço permanece representado estritamente em centavos (`priceCents: Int`), mantendo integridade com as regras financeiras do sistema.

6. **Migração com Backfill Idempotente e Não Destrutivo**:
   - Migration `20261028233455_vet_model_and_capabilities` aplica a criação das tabelas e tipos sem alterar o comportamento de dados legados.
   - Script de backfill executa:
     a) `UPDATE "Prescription" SET "kind" = 'HUMAN' WHERE "kind" IS NULL;`
     b) Inserção de `PharmacyCapability` do tipo `HUMAN_COMPOUNDING` para todas as farmácias existentes, mapeando 1:1 o `verificationStatus` atual (`VERIFIED` -> `VERIFIED`, `REJECTED` -> `REJECTED`, demais -> `PENDING_VERIFICATION`).
     c) Nenhuma farmácia existente recebe a capacidade `VETERINARY_COMPOUNDING`, garantindo que nenhuma farmácia acesse receitas veterinárias sem credenciamento sanitário específico junto ao MAPA/CRMV.

7. **Seed Sintético Isolado**:
   - `prisma/seed.ts` atualizado para incluir 1 tutor com 2 animais (cão e gato), 1 farmácia com capacidade dupla (`HUMAN_COMPOUNDING` e `VETERINARY_COMPOUNDING` verificadas), 1 farmácia exclusivamente humana e 1 receita veterinária de exemplo.
   - Bloqueio rígido de segurança impedindo execução em produção mantido (`NODE_ENV === 'production'`).

## Consequências

- **Positivas**:
  - Paridade e convivência segura entre receitas humanas e veterinárias sem duplicação de infraestrutura.
  - O banco de dados rejeita estados incoerentes (ex.: receita humana apontando para pet, ou receita veterinária sem pet/CRMV) a nível de engine SQL.
  - 100% de compatibilidade reversa com a suíte de testes de manipulação humana (215 testes legados mantidos intactos e verdes).
- **Trade-offs**:
  - Exige que controllers e formulários futuros passem a gerenciar e consultar capacidades específicas (`PharmacyCapability`) em vez de checar exclusivamente a coluna legada `verificationStatus` da farmácia.
