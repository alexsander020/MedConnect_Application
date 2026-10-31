# Guia de Operação: Como Desativar a Vertical Veterinária Rapidamente (Kill Switch)

Este guia rápido descreve as instruções de contingência e emergência para desativar a vertical veterinária no MedConnect em menos de 1 minuto em ambientes de Staging ou Produção.

---

## 1. Quando Utilizar o Kill Switch?
- Notificação emergencial do Ministério da Agricultura e Pecuária (MAPA) ou CRMV exigindo paralisação de atividade.
- Detecção de inconsistência sanitária crítica ou suspeita de fraude em receitas veterinárias.
- Sobrecarga operacional ou falha grave na prestação do serviço pelas farmácias veterinárias credenciadas.

---

## 2. Efeito Imediato do Kill Switch (`VET_ENABLED=false`)
Ao desligar a flag:
- **No Frontend**: Menus, rotas (`/my-pets`, `/pharmacy/veterinary-capability`), o seletor "Para meu pet" e botões veterinários desaparecem instantaneamente. A interface passa a operar em modo puramente humano.
- **Na API Backend**: Todos os endpoints veterinários (`/api/animals`, `/api/prescriptions` tipo vet, `/api/pharmacy/capabilities/veterinary`) passam a responder `404 Not Found` (fail-closed).
- **No Banco de Dados**: Nenhum dado é excluído. Pedidos veterinários já aprovados e em manipulação permanecem íntegros para entrega aos tutores e visíveis para a administração no painel (`/admin`).

---

## 3. Passo a Passo de Execução

### Opção A: Via Provedor Gerenciado (Render / Cloud / PaaS)
1. Acesse o dashboard do projeto no Render / provedor de nuvem.
2. Navegue até o serviço do **Backend** -> **Environment**.
3. Localize a variável:
   ```env
   VET_ENABLED=true
   ```
4. Altere seu valor para:
   ```env
   VET_ENABLED=false
   ```
5. Clique em **Save Changes**. O container reiniciará automaticamente em menos de 30 segundos.

### Opção B: Via Terminal / Servidor Docker / Kubernetes
Execute diretamente no terminal do servidor ou altere o ConfigMap/Secret:

```bash
# Docker Compose
docker compose exec backend sh -c 'export VET_ENABLED=false'
# Ou no arquivo .env da raiz do servidor:
sed -i 's/VET_ENABLED=true/VET_ENABLED=false/g' .env
docker compose restart backend
```

```bash
# Kubernetes
kubectl set env deployment/medconnect-backend VET_ENABLED="false"
```

---

## 4. Verificação Pós-Desativação

1. **Teste do Endpoint de Configuração**:
   Execute via terminal ou navegador:
   ```bash
   curl -s https://api.medconnect.com/api/config
   ```
   **Resposta esperada**:
   ```json
   {
     "vetEnabled": false,
     "vetAllowFoodProducing": false,
     "vetControlledEnabled": false
   }
   ```

2. **Teste de Bloqueio Fail-Closed**:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -X GET https://api.medconnect.com/api/animals
   ```
   **Código HTTP esperado**: `404`

3. **Validação do Fluxo Humano**:
   - Faça login como paciente e verifique que o fluxo humano de cotações (`/new-quote`, `/quotes`, `/orders`) continua respondendo normalmente com status `200`.

---

## 5. Procedimento de Reativação
Após a resolução do incidente ou liberação regulatória:
1. Reconfigure `VET_ENABLED=true` nas variáveis de ambiente.
2. Salve as alterações.
3. A vertical veterinária volta a funcionar imediatamente com todos os cadastros e dados históricos preservados.
