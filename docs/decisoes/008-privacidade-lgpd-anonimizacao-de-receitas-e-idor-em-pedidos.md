# ADR 008: Anonimização de Receitas Disponíveis e Prevenção de IDOR em Pedidos

## Status
Aceito

## Contexto
Na listagem pública de receitas disponíveis para cotação (`GET /api/prescriptions/available`), qualquer farmácia autenticada tinha acesso a dados pessoais e de contato do paciente (`phone`, `address`, nome) e ao documento médico anexado (`fileUrl`), violando o princípio da necessidade e da minimização da LGPD (Art. 6º, III e Art. 11). Farmácias só precisam saber os dados clínicos/medicamentosos para formular o orçamento; dados de identificação e contato só devem ser disponibilizados após a escolha e contratação do serviço pelo paciente (pedido gerado e aceito).
Além disso, não existia endpoint com validação estrita de autorização no nível do objeto (IDOR) para consulta detalhada de pedidos (`GET /api/orders/:id`), arriscando vazamento de dados de pedidos entre usuários ou farmácias não correlacionadas.

## Decisão
1. **Anonimização de Receitas na Cotação (`getAvailableForPharmacy`)**:
   - Remoção de `phone` e `address` do payload retornado para farmácias concorrentes.
   - Omissão de `fileUrl` nesta fase de cotação aberta.
   - Pseudonimização do identificador do paciente via `patient.anonymousId` (ex.: "Paciente #A1B2C"), garantindo que nenhuma farmácia trace o perfil do paciente antes da contratação.
   - Inclusão apenas dos metadados clínicos estritamente necessários para a cotação.

2. **Prevenção de IDOR em Pedidos (`getOrderById`)**:
   - Criação da rota `GET /api/orders/:id` protegida por autenticação.
   - Verificação rigorosa de autorização no controller: a requisição só é autorizada se o usuário solicitante for o paciente dono do pedido (`order.userId === req.user.id`) ou a farmácia contratada (`order.pharmacyId === req.user.pharmacyId` ou `pharmacy.userId === req.user.id`).
   - Retorno imediato de HTTP 403 Forbidden para acessos não autorizados de terceiros.

3. **Adequação do Frontend e Documentação**:
   - A tela de solicitações da farmácia (`Requests.jsx`) agora exibe o identificador pseudonimizado e orienta que a receita médica com dados completos de entrega é liberada somente após o aceite do orçamento pelo paciente.
   - Swagger OpenAPI (`swagger.yaml`) atualizado com o schema `AnonymousPrescriptionResponse` e a especificação da rota `GET /api/orders/{id}` com códigos 403 e 404 documentados.
