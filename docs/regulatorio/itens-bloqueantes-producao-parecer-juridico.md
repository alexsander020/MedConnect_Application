# RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA
# Lista Consolidada de Itens que Dependem do Advogado e que BLOQUEIAM a Ativação das Flags em Produção

> **AVISO IMPORTANTE / DISCLAIMER LEGAL:**
> **RASCUNHO — REVISÃO JURÍDICA OBRIGATÓRIA.**
> Este documento relaciona formalmente os itens técnico-regulatórios que exigem **parecer jurídico formal conclusivo** antes de qualquer acionamento das feature flags (`VET_ENABLED=true`, `VET_ALLOW_FOOD_PRODUCING=true`, `VET_CONTROLLED_ENABLED=true`) no ambiente de **Produção** da plataforma MedConnect. A equipe de engenharia **NÃO afirma conformidade legal** e recomenda a manutenção do estado **fail-closed** até a emissão do parecer favorável pelo departamento jurídico e pelo DPO.

---

## Matriz de Bloqueio em Produção por Feature Flag

| Flag / Recurso | Estado Atual Recomendado em Produção | Status de Bloqueio | Exigência Jurídica para Desbloqueio |
| :--- | :---: | :---: | :--- |
| `VET_ENABLED` (Flag Mestra da Vertical Veterinária) | `false` | **BLOQUEADO** | Parecer sobre a legalidade da intermediação de cotações perante Decreto 5.053/2004 (MAPA) e Resoluções CFF/CFMV; homologação dos Termos de Uso e Política de Privacidade. |
| `VET_CONTROLLED_ENABLED` (Medicamentos Veterinários de Controle Especial) | `false` | **BLOQUEADO** | Validação sobre a responsabilidade da plataforma frente à exigência do MAPA de retenção prévia da via física da Notificação de Receita Veterinária (SIPEAGRO). |
| `VET_ALLOW_FOOD_PRODUCING` (Animais de Produção / Alimentação Humana) | `false` | **BLOQUEADO** | Análise de risco sanitário e responsabilidade civil/penal por resíduos medicamentosos em alimentos e período de carência (*withdrawal period*). |

---

## 1. Itens Jurídico-Regulatórios Bloqueantes (MAPA / CFMV / CFF)

### 1.1 Legalidade da Intermediação Digital de Fórmulas Veterinárias
- **Fundamento**: Lei Federal nº 5.991/1973 e Decreto Federal nº 5.053/2004.
- **Dúvida Bloqueante**: A atividade de aproximar tutores e farmácias magistrais com registro no MAPA para emissão de cotações prévias pode ser interpretada como intermediação clandestina de medicamentos de uso veterinário pelos fiscais federais agropecuários?
- **Impacto do Bloqueio**: Se houver risco de infração sanitária para a plataforma, a flag `VET_ENABLED` **não pode ser ligada em produção**.

### 1.2 Retenção Física de Notificação de Receita Veterinária (Controlados)
- **Fundamento**: Normas do MAPA sobre substâncias e produtos de uso veterinário controlados.
- **Dúvida Bloqueante**: A conferência apenas por imagem/PDF na cotação eletrônica é admitida pelo MAPA para o início da preparação, ou a farmácia incorre em infração grave caso inicie a manipulação antes de ter em mãos a via original em papel retida?
- **Impacto do Bloqueio**: Enquanto não houver validação formal e cláusula contratual eximindo a plataforma, a flag `VET_CONTROLLED_ENABLED` deve permanecer **desligada (`false`) em produção**.

### 1.3 Período de Carência e Animais de Corte/Leite/Consumo
- **Fundamento**: Decreto Federal nº 5.053/2004 e Código Penal Brasileiro (Art. 272 — Corrupção ou adulteração de substância alimentícia).
- **Dúvida Bloqueante**: Em caso de contaminação de lote de leite ou carne com resíduos de antibióticos manipulados por meio da plataforma sem observância do período de carência, a MedConnect pode responder solidariamente com o pecuarista e com a farmácia?
- **Impacto do Bloqueio**: A flag `VET_ALLOW_FOOD_PRODUCING` deve permanecer **estritamente bloqueada (`false`) em produção**, atendendo-se apenas animais de estimação (pets/domésticos) em que não há destinação para a cadeia alimentar humana.

### 1.4 Exigência de CRMV da Empresa versus Jurisprudência do STJ
- **Fundamento**: Resoluções do CFMV sobre inscrição de pessoas jurídicas versus precedentes judiciais do Superior Tribunal de Justiça (STJ) que desobrigam farmácias de manipulação de inscrição no CRMV quando já registradas no CRF e no MAPA.
- **Dúvida Bloqueante**: A MedConnect deve manter a exigência do CRMV-PJ como requisito compulsório para todas as farmácias, ou deve admitir certidões judiciais/liminares em estados onde a exigência foi afastada judicialmente?
- **Impacto do Bloqueio**: Definição do checklist operacional do ADMIN para evitar recusas indevidas que gerem litígios comerciais.

---

## 2. Itens de Privacidade e Proteção de Dados Bloqueantes (LGPD)

### 2.1 Equiparação Reflexa de Dados de Animais e Base Legal Apropriada
- **Fundamento**: Lei Geral de Proteção de Dados (Lei nº 13.709/2018), Art. 7º (Dados Comuns) e Art. 11 (Dados Sensíveis de Saúde).
- **Dúvida Bloqueante**: A receita veterinária e o histórico do animal devem ser tratados formalmente sob **Consentimento Específico (Art. 11, I)** por revelarem indiretamente rotinas do tutor, ou sob **Execução de Contrato (Art. 7º, V)**?
- **Impacto do Bloqueio**: Homologação do texto do termo de consentimento que será apresentado ao tutor na tela de cotação.

### 2.2 Prazos de Retenção Sanitária versus Solicitação de Exclusão (LGPD Art. 16, I e Art. 18, VI)
- **Fundamento**: Dever de prestação de contas sanitárias perante o MAPA (guarda de 2 a 5 anos) versus direito do tutor de solicitar eliminação de dados pessoais.
- **Dúvida Bloqueante**: Qual é a redação e o procedimento jurídico recomendados para a resposta formal ao tutor que solicita a exclusão total de sua conta e de seus animais, esclarecendo que as receitas já dispensadas permanecerão arquivadas em caráter restrito por obrigação legal sanitária?
- **Impacto do Bloqueio**: Homologação do fluxo do controller de LGPD para a vertical veterinária.

---

## 3. Conclusão e Recomendação Técnica

> [!WARNING]
> A equipe de engenharia de software concluiu a implementação técnica completa com arquitetura resiliente e fail-closed. No entanto, por prudência regulatória e governança corporativa, **NENHUMA das três feature flags veterinárias (`VET_ENABLED`, `VET_CONTROLLED_ENABLED`, `VET_ALLOW_FOOD_PRODUCING`) deve ser ligada no ambiente de Produção** sem que a assessoria jurídica emita **Parecer Escrito e Assinado** liberando expressamente as operações e homologando as minutas contratuais elaboradas.

