# ADR 021: Governança de Capacidades Regulatórias por Farmácia e Auditoria MAPA

## Status
Aceito

## Contexto
O modelo legado do MedConnect tratava a farmácia com um único campo booleano `verified`. No entanto, a manipulação de medicamentos humanos (sob controle da ANVISA e Conselhos Regionais de Farmácia — CRF) e a manipulação veterinária (sob controle do Ministério da Agricultura e Pecuária — MAPA e CRMV) exigem autorizações sanitárias e fiscalizações independentes. Uma farmácia pode ser plenamente autorizada para humanos, mas não possuir licença do MAPA para produtos de uso veterinário, ou vice-versa.

## Decisão

1. **Entidade `PharmacyCapability` e Unicidade por Tipo**:
   - Cada farmácia pode possuir múltiplos registros de capacidade através da tabela `PharmacyCapability`, com restrição de unicidade `@@unique([pharmacyId, type])`.
   - Tipos suportados (`CapabilityType`):
     - `HUMAN_COMPOUNDING`: AFE/ANVISA, Alvará Sanitário Municipal, CRF.
     - `VETERINARY_COMPOUNDING`: Registro no MAPA (Decreto 5.053/2004), CRMV da Pessoa Jurídica, Responsável Técnico Farmacêutico ou Veterinário com CRF/CRMV.

2. **Ciclo de Vida da Capacidade (`CapabilityStatus`)**:
   - `PENDING_VERIFICATION`: Estado inicial compulsório após solicitação com envio de evidências documentais privadas.
   - `VERIFIED`: Capacidade conferida e homologada por um administrador. Libera o mural de receitas veterinárias e o envio de propostas.
   - `REJECTED`: Recusada por inconformidade documental com justificativa obrigatória e notificação à farmácia para eventual reenvio.
   - `SUSPENDED`: Suspensa pela administração (ex: licença vencida, fiscalização do MAPA).

3. **Regra de Suspensão com Preservação de Direitos**:
   - Suspender uma capacidade `VETERINARY_COMPOUNDING`:
     - Bloqueia imediatamente o acesso a novas receitas veterinárias no mural.
     - Bloqueia o envio de novas cotações para receitas veterinárias.
     - **Preserva integralmente** todos os orçamentos e pedidos já contratados por tutores (`PRODUCTION`, `DELIVERY`, `DELIVERED`).
     - Mantém pedidos visíveis para o ADMIN no painel para fins de fiscalização e cumprimento sanitário.

4. **Painel de Auditoria ADMIN com Checklist Humano**:
   - O sistema não simula nem inventa integrações automáticas inexistentes com sistemas governamentais fechados do MAPA/CRMV.
   - A conferência é realizada por analistas humanos credenciados através de um checklist visual na plataforma:
     - [x] Registro MAPA conferido
     - [x] CRMV da empresa conferido
     - [x] RT e CRF conferidos
   - A aprovação exige a confirmação do checklist e é assinada digitalmente com ID do administrador, data e hora em `AuditLog`.

## Consequências
- Aderência estrita à legislação sanitária agropecuária brasileira.
- Eliminação do risco de farmácias sem autorização do MAPA manipularem fórmulas veterinárias.
- Proteção da saúde pública e bem-estar animal.

