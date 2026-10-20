# ADR 007: Eliminação de Fallback para MockData no Frontend

## Status
Aceito

## Contexto
Telas críticas da aplicação (`Orders`, `Requests` e `OrderManagement`) utilizavam dados fictícios (`mockData`) como estado inicial ou como fallback silencioso em blocos `catch` quando a API falhava. Em um sistema de saúde, apresentar dados demonstrativos após uma falha de rede mascara erros reais, gera confusão ao paciente e à farmácia, e induz a falsas impressões sobre cotações e pedidos reais.

## Decisão
1. **Componentes Padronizados de Estado**:
   - `ErrorState`: exibe mensagem de erro contextualizada e ação de retry ("Tentar novamente") invocando a função de recarga.
   - `LoadingState`: spinner unificado com feedback visual.
   - `EmptyState`: distinção explícita entre ausência de conexão (erro) e lista vazia legítima retornada pela API.
2. **Refatoração das Telas Afetadas**:
   - `Orders.jsx` (Paciente): estado inicial vazio `[]`; em caso de erro, exibe `ErrorState` com retry, sem carregar `mockOrders`.
   - `Requests.jsx` (Farmácia): estado inicial vazio `[]`; sob erro, exibe `ErrorState`, sem carregar `mockPharmacyRequests`.
   - `OrderManagement.jsx` (Farmácia): estado inicial vazio `[]`; em falhas de API na listagem ou avanço de status, não recorre a mutações cosméticas em mocks.
3. **Validação Automatizada de Componentes**:
   - Implementado teste de integração em `MedConnect/src/pages/api-error-fallback.test.jsx` cobrindo as 3 páginas sob falha forçada de API e validando que nenhum elemento de `mockData` é renderizado.
