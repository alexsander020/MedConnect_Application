# MedConnect — Frontend (SPA)

Aplicação web moderna para cotação, manipulação e rastreamento de medicamentos manipulados em farmácias credenciadas.

---

## 🚀 Tecnologias e Arquitetura

- **Core**: React 19 + Vite
- **Gerenciamento de Estado e Servidor**: [TanStack Query v5](https://tanstack.com/query/latest) (cache reativo, estados de loading/error/empty, invalidação inteligente)
- **Roteamento**: React Router v7
- **Comunicação em Tempo Real**: Socket.IO Client (notificações push e sincronização de pedidos)
- **Requisições HTTP**: Axios configurado com interceptors para renovação automática de access token em memória (rotacionado com Refresh Tokens em cookies `HttpOnly`)
- **Estilização**: CSS Vanilla com Tokens Semânticos, Aurora Glassmorphism e microinterações
- **Acessibilidade**: Notificações por Toast acessível (`role="status"`, `aria-live="polite"`) em substituição ao `alert()` nativo

---

## 📂 Estrutura de Diretórios

```
MedConnect/src/
├── components/          # Componentes reutilizáveis (Header, BottomNav, StarRating, etc.)
├── constants/           # Constantes compartilhadas e de status (orderStatuses, etc.)
├── context/             # Contextos globais (AuthContext, ToastContext)
├── lib/                 # Configurações de bibliotecas (queryClient com Socket.IO invalidation)
├── pages/
│   ├── admin/           # Painel Regulatório para aprovação de farmácias pendentes
│   ├── pharmacy/        # Dashboard, cotações, produção e avaliações da farmácia
│   └── user/            # Dashboard do paciente, envio de receita, comparador e rastreamento
└── services/            # Instância central do Axios (api.js) e Socket.IO
```

---

## 🛠️ Como Executar

### Pré-requisitos
- Node.js 18+
- Backend MedConnect ativo (porta `3000`)

### Instalação
```bash
npm install
```

### Executar em Desenvolvimento
```bash
npm run dev
```
Acesse: [http://localhost:5173](http://localhost:5173)

### Build para Produção
```bash
npm run build
```

---

## 🔒 Segurança e Dados Reais

1. **Eliminação Integral de Mocks**: Todos os fluxos conectam-se diretamente à API REST real e aos modelos relacionais do PostgreSQL.
2. **Tokens em Memória**: O token JWT de acesso é mantido exclusivamente em memória (nunca em `localStorage` ou `sessionStorage`), mitigando riscos de XSS.
3. **URLs Assinadas**: Receitas confidenciais são carregadas via URLs assinadas de curta duração (5 minutos), com registro de auditoria no servidor (LGPD Art. 11).
