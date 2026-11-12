# ADR 019: Isolamento por Feature Flags e Kill Switch da Vertical Veterinária

## Status
Aceito

## Contexto
A vertical de manipulação veterinária no MedConnect atende a um regime regulatório distinto (MAPA, CRMV, CFF) e a um modelo de negócio em fase de expansão. Para garantir estabilidade absoluta, o sistema deve ser capaz de:
1. Operar com a vertical desativada sem qualquer impacto no fluxo humano tradicional.
2. Permitir ativação e desativação instantânea em ambientes de Desenvolvimento, Staging e Produção sem necessidade de deploy de código.
3. Fornecer um mecanismo de emergência (Kill Switch) para mitigar eventuais incidentes regulatórios ou técnicos em menos de 1 minuto.

## Decisão

1. **Definição de Feature Flags Granulares via Variáveis de Ambiente**:
   - `VET_ENABLED`: Flag mestra (boolean). Quando `false`, todos os endpoints da vertical veterinária retornam `404 Not Found` (fail-closed) e o frontend esconde totalmente menus, seletores e fluxos de animais/pets.
   - `VET_ALLOW_FOOD_PRODUCING`: Controla permissão para animais destinados à cadeia de produção/consumo humano (bovinos, suínos, aves de corte). Padrão `false` para evitar contaminação alimentar e exigências de carência sem suporte operacional.
   - `VET_CONTROLLED_ENABLED`: Controla o aceite de Notificações de Receita Veterinária do MAPA (SIPEAGRO). Padrão `true` em desenvolvimento/staging.

2. **Endpoint Público de Configuração (`GET /api/config`)**:
   - Exposição somente-leitura dos valores booleanos das flags em JSON para o frontend.
   - Resposta com cabeçalho `Cache-Control: no-store` para impedir cache em proxies e navegadores.
   - O frontend sincroniza em tempo de execução via hook `usePublicConfig` (TanStack Query), garantindo adaptação dinâmica sem mocks.

3. **Arquitetura de Isolamento Fail-Closed**:
   - Se `VET_ENABLED=false`:
     - Tentativas de cadastro de pets (`POST /api/animals`) retornam `404`.
     - Tentativas de envio de receita com `kind = 'VETERINARY'` retornam `404`.
     - Cotações e habilitações veterinárias são bloqueadas imediatamente.
     - Cotações e pedidos humanos continuam seu curso normal sem qualquer degradação.

4. **Kill Switch Operacional**:
   - Em caso de emergência regulatória ou instabilidade, a vertical é desativada alterando `VET_ENABLED=false` no painel de ambiente do provedor (ex: Render, AWS, Kubernetes).
   - O backend relê as variáveis e aplica o bloqueio fail-closed no próximo request.
   - Pedidos veterinários já aprovados e em manipulação permanecem íntegros no banco de dados e acessíveis ao ADMIN para cumprimento do dever sanitário.

## Consequências
- **Positivas**:
  - Risco zero de regressão no fluxo de pacientes humanos.
  - Controle operacional fino para o time de produto e compliance.
  - Conformidade com os princípios de resiliência e fail-safe do MedConnect.
- **Trade-offs**:
  - Exige manter suítes de testes parametrizadas testando o sistema em ambos os estados (flag ligada e desligada).

