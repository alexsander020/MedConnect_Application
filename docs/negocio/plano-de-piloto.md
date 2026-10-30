# Plano Operacional de Piloto Comercial — MedConnect

> **DEFINIÇÃO DO EXPERIMENTO:**
> Validação de viabilidade operacional, tração e unit economics em ambiente real controlado.
> **Escopo**: 3 a 5 farmácias de manipulação credenciadas | 1 região geográfica delimitada | Duração: 4 semanas.

---

## 1. Objetivos do Piloto e Hipóteses Críticas

O piloto tem como finalidade primordial responder se a plataforma é capaz de gerar valor econômico sustentável tanto para o paciente quanto para a farmácia de manipulação, medindo o atrito operacional e a retenção.

### Hipóteses do Piloto:
1. **Agilidade no Orçamento**: Farmácias conseguem enviar a 1ª proposta em menos de 120 minutos (2 horas) em horário comercial.
2. **Liquidez de Propostas**: Cada paciente recebe em média pelo menos 2 cotações concorrentes por receita válida enviada.
3. **Conversão do Funil**: Pelo menos 25% a 35% das cotações apresentadas aos pacientes convertem em pedidos pagos.
4. **Controle de Desintermediação**: A taxa de vazamento (pacientes que cotam no app mas compram por fora) mantém-se abaixo de 20%.

---

## 2. Escopo Geográfico e Seleção das Farmácias

### 2.1 Região Piloto Selecionada
- **Critério**: Região urbana com alta densidade de consultórios médicos (dermatologistas, endocrinologistas, nutrólogos), bom poder aquisitivo e cobertura logística eficiente por motoboys.
- **Zona Recomendada**: Raio de 5 a 10 km abrangendo bairros centrais/nobres (ex: Zona Sul / Centro expandido de São Paulo ou similar em capital estadual).

### 2.2 Perfil das 3 a 5 Farmácias Participantes
- **Farmácia 1**: Farmácia tradicional estabelecida com grande volume (referência de mercado local).
- **Farmácia 2 e 3**: Farmácias médias com laboratório ágil e capacidade ociosa querendo crescer.
- **Farmácia 4 e 5**: Farmácias com forte atuação em dermatologia e suplementação de performance.
- **Critérios Obrigatórios**: Alvará Sanitário ativo, AFE da ANVISA e assinatura do Termo de Adesão e Acordo de Confidencialidade.

---

## 3. Cronograma das 4 Semanas

| Fase / Semana | Foco Principal | Ações da Equipe MedConnect | Ações das Farmácias | Critério de Passagem |
| :--- | :--- | :--- | :--- | :--- |
| **Semana 1: Onboarding e Testes em Vazio** | Treinamento e simulação operacional | - Cadastro e verificação das 5 farmácias no painel.<br>- Envio de 5 receitas de teste para calibrar tempo de resposta e notificações.<br>- Alinhamento de SLA e canal de WhatsApp de suporte ao piloto. | - Designar 1 operador e 1 farmacêutico responsáveis.<br>- Testar envio de proposta na tela `/pharmacy/requests`.<br>- Confirmar chave Pix/recebimento bancário. | 100% das farmácias enviam cotação de teste em < 30 min. |
| **Semana 2: Abertura para Pacientes e 1ª Demanda** | Aquisição inicial de receitas reais | - Ativação de canal direto com 30 a 50 pacientes pré-cadastrados (early adopters das entrevistas).<br>- Tráfego hiperlocal direcionado à região com incentivo de frete grátis na 1ª compra.<br>- Monitoramento em tempo real do tempo de resposta. | - Responder cotações reais recebidas no painel em até 2 horas.<br>- Atualizar status de manipulação (`PRODUCTION`). | Pelo menos 20 receitas reais recebidas na semana. |
| **Semana 3: Operação, Entregas e SLAs** | Logística, experiência e qualidade | - Acompanhamento das primeiras entregas e coletas de receitas físicas (se aplicável).<br>- Pesquisa de satisfação rápida pós-entrega (CSAT e NPS) com o paciente.<br>- Intervenção imediata em caso de atraso na cotação. | - Concluir manipulação no prazo acordado.<br>- Despachar via motoboy e marcar `DELIVERY` e `DELIVERED`. | Zero reclamações de erro na fórmula; SLA de entrega > 90%. |
| **Semana 4: Recompra, Análise e Fechamento** | Mensuração de retenção e balanço financeiro | - Envio de lembrete de recompra para receitas de uso contínuo.<br>- Cálculo das 5 métricas consolidadas.<br>- Entrevistas pós-piloto com os donos de farmácias e pacientes. | - Reunião de feedback com o time executivo.<br>- Definição de continuidade no modelo comercial pago. | Apresentação do Relatório Final do Piloto com decisão Go/Pivot. |

---

## 4. Métricas-Chave do Piloto (Fórmulas e Metas)

### 4.1 Métrica 1: Tempo até a 1ª Cotação (Time to First Quote - TTFQ)
- **Definição**: Intervalo de tempo entre o envio da receita pelo paciente (`Prescription.createdAt`) e a criação da primeira cotação de qualquer farmácia (`Quote.createdAt`).
- **Fórmula**: $\text{TTFQ} = \text{Quote}_{1}\text{.createdAt} - \text{Prescription.createdAt}$ (em minutos durante horário comercial).
- **Meta do Piloto**: $\le 120\text{ minutos}$ (Meta ideal: $< 45\text{ minutos}$).

### 4.2 Métrica 2: Densidade de Cotações por Receita (Quote Density)
- **Definição**: Número médio de farmácias que responderam com proposta válida para cada receita elegível.
- **Fórmula**: $\text{Densidade} = \frac{\sum \text{Total de Cotações Criadas}}{\text{Total de Receitas Válidas Enviadas}}$.
- **Meta do Piloto**: $\ge 2{,}2\text{ cotações por receita}$ (mínimo de 2 opções para o paciente comparar).

### 4.3 Métrica 3: Taxa de Aceitação (Acceptance Rate)
- **Definição**: Proporção de receitas orçadas que tiveram ao menos uma proposta formalmente aceita pelo paciente.
- **Fórmula**: $\text{Taxa de Aceitação} = \frac{\text{Receitas com } \ge 1\text{ Quote ACCEPTED}}{\text{Total de Receitas com } \ge 1\text{ Quote Encontrada}} \times 100\%$.
- **Meta do Piloto**: $\ge 30\%$.

### 4.4 Métrica 4: Taxa de Recompra / Retenção de Coorte (Repeat Rate)
- **Definição**: Pacientes que realizaram um segundo pedido na plataforma dentro da janela de observação ou declararam intenção de renovação na pesquisa de 30 dias.
- **Fórmula**: $\text{Recompra} = \frac{\text{Pacientes com } \ge 2\text{ Pedidos Concluídos}}{\text{Total de Pacientes com 1º Pedido Concluído há } \ge 21\text{ dias}} \times 100\%$.
- **Meta do Piloto**: $\ge 20\%$ no ciclo de 30 dias para uso contínuo.

### 4.5 Métrica 5: Taxa de Vazamento / Desintermediação (Leakage Rate)
- **Definição**: Prescrições que receberam cotações atrativas, foram visualizadas pelo paciente, mas foram canceladas na plataforma e posteriormente confirmadas como manipuladas na farmácia parceira por fora.
- **Fórmula**: $\text{Taxa de Vazamento} = \frac{\text{Casos confirmados de compra direta na farmácia}}{\text{Total de Cotações Visualizadas}} \times 100\%$.
- **Meta de Segurança**: $\le 15\%$. (Se $> 25\%$, acionar gatilho de ocultamento do nome da farmácia antes do aceite).

---

## 5. Eventos de Analytics Anonimizados (Privacy-by-Design)

Para respeitar rigorosamente a LGPD e o sigilo de dados de saúde, **NENHUM evento de telemetria contém dado pessoal sensível** (sem imagens de receitas, nomes de substâncias, nomes de pessoas, CPFs, telefones ou endereços).

Os eventos são disparados estritamente com identificadores opacos pseudoaleatórios e métricas de tempo/valor:

```json
// Evento 1: Receita Enviada (Sem dado de saúde)
{
  "event": "prescription_submitted",
  "anonymousSubjectId": "anon_u_9f81a7b",
  "timestamp": "2026-11-02T14:10:00Z",
  "regionCode": "SP_ZONA_SUL",
  "consentHealthVersion": "v1.0.0"
}

// Evento 2: Cotação Emitida pela Farmácia
{
  "event": "quote_submitted",
  "anonymousPharmacyId": "anon_pharm_4c1",
  "anonymousPrescriptionId": "anon_rx_3e2",
  "timeToQuoteMinutes": 42,
  "deliveryDaysOffered": 2,
  "priceCents": 12500,
  "timestamp": "2026-11-02T14:52:00Z"
}

// Evento 3: Proposta Aceita pelo Paciente
{
  "event": "quote_accepted",
  "anonymousPrescriptionId": "anon_rx_3e2",
  "anonymousPharmacyId": "anon_pharm_4c1",
  "quotesAvailableCount": 3,
  "chosenPriceRank": 1, // 1 = escolheu a mais barata
  "timestamp": "2026-11-02T15:15:00Z"
}

// Evento 4: Pedido Entregue
{
  "event": "order_delivered",
  "anonymousOrderId": "anon_ord_882",
  "totalCycleTimeHours": 48.5,
  "onTime": true,
  "timestamp": "2026-11-04T16:00:00Z"
}
```

---

## 6. Painel Simples de Acompanhamento (Admin Pilot Dashboard)

O painel de controle administrativo da MedConnect (`/admin`) incorpora uma visão de **Métricas do Piloto**, alimentada pelo endpoint agregado de telemetria `GET /api/admin/pilot-metrics`:

```text
+-----------------------------------------------------------------------------------+
|                           MEDCONNECT - PAINEL DO PILOTO                           |
+-----------------------------------------------------------------------------------+
| Região: SP - Zona Sul       | Farmácias Ativas: 4/5       | Semana do Piloto: 2/4 |
+-----------------------------------------------------------------------------------+
|  [ TTFQ Médio ]    |  [ Cotações/Receita ]  |  [ Taxa Aceitação ] | [ Pedidos OK ]|
|     38 minutos     |     2.7 propostas      |       34.2%         |   41 pedidos  |
|  (Meta: <= 120m)   |   (Meta: >= 2.0)       |   (Meta: >= 30%)    | (Faturados)   |
+-----------------------------------------------------------------------------------+
|  [ Taxa de Recompra ] : 22.5%               | [ Vazamento Estimado ] : 8.1%       |
+-----------------------------------------------------------------------------------+
```
