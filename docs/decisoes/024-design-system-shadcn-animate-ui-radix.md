# ADR 024: Design System: Tailwind v4, shadcn/ui animado pelo Animate UI e pop-ups em Radix UI

> Numeração: este ADR foi escrito como **ADR 020** e renumerado para 024 na integração com a vertical veterinária (que publicou os ADRs 018–021 antes).

## Status
Aceito

## Contexto
O frontend acumulava três sistemas visuais concorrentes: ~1.440 linhas de CSS próprio (`.btn`, `.card`, `.badge`, glassmorphism), um tema Material 3 no `tailwind.config.js` (v3) usado só no layout da farmácia (com textos em inglês e ícones Material Symbols carregados do Google) e estilos inline nos componentes de estado. Diálogos eram montados à mão, sem gerenciamento de foco, e um evento de tempo real ainda usava `alert()`.
Para a Fase 6 (novas telas de gestão para farmácia e administração, Política de Privacidade e Termos), era preciso uma base única, acessível e consistente, com movimento discreto adequado a um produto de saúde.

## Decisão
1. **Tailwind CSS v4** via `@tailwindcss/vite` (sem `tailwind.config.js`/PostCSS). Os tokens ficam em `MedConnect/src/index.css` (`:root` + `@theme inline`): base branca, verde-menta `hsl(168 44% 36%)` como cor de ação, `mint-wash` para faixas, coral apenas para urgência, `slate-deep` no rodapé. Tipografia Outfit (títulos/números, `tabular-nums`) + Inter (texto).
2. **Fontes auto-hospedadas** (`@fontsource-variable/inter` e `/outfit`). O `index.html` deixou de chamar o Google Fonts, então nenhum IP de visitante é enviado a terceiros só para carregar fontes.
3. **shadcn/ui** (estilo `radix-vega`, JSX, `components.json`) como biblioteca de componentes, copiada para `src/components/ui/`. Base Radix UI (pacote unificado `radix-ui`).
4. **Animate UI** (`@animate-ui/react`): após instalar os componentes, `npx @animate-ui/cli@latest animate all` trocou o import do primitivo de 18 componentes (`radix-ui` → `@animate-ui/react/primitives/radix-ui`). A API e os estilos continuam os do shadcn/ui; só o primitivo passa a ter animação (molas e tweens curtos, saídas mais rápidas que entradas, só transform/opacity, movimento reduzido respeitado). Ao adicionar um componente novo do shadcn/ui, rodar o comando de novo.
5. **Pop-ups sempre em Radix UI**: Dialog, AlertDialog (`components/shared/ConfirmDialog.jsx`, com motivo obrigatório quando a ação é auditada), Sheet (detalhes em listas de gestão), Popover (notificações), DropdownMenu, Select, Tooltip, HoverCard.
6. **Toasts em Radix UI Toast** (`components/ui/toast.jsx` + `context/ToastContext.jsx`): API `useToast()` mantida (`success/error/warning/info`) e evento global `app:toast` para fontes fora do React (Socket.IO). Erros usam `type="foreground"` (anúncio assertivo), demais `background` (polite). Arrastar para a direita dispensa.
7. **Movimento** com Motion (`motion/react`) em primitivas próprias (`components/motion`): `FadeUp`, `Stagger`/`StaggerItem`, `ClipReveal`, `PopIn`, `LiftCard`, `PageTransition`; `MotionConfig reducedMotion="user"` na raiz e regra CSS global para `prefers-reduced-motion`. Nada quica.
8. **Layouts únicos**: `PublicLayout` (navbar com pílula ao vivo de farmácias abertas, calculada dos horários cadastrados; rodapé; CTA fixa no celular) e `AppShell` (sidebar do shadcn/ui por papel, notificações, menu da conta, navegação inferior do paciente). Rotas carregadas sob demanda (`React.lazy`) e dependências estáveis em chunks próprios.

## Consequências
- Uma única fonte de verdade visual; telas novas compõem peças prontas (`PageHeader`, `StatCard`, `StatusBadge`, `OpenStatusPill`, `DataPagination`, `KeyValue`, `OrderTimeline`).
- Foco, `aria-*` e navegação por teclado dos pop-ups vêm do Radix UI, sem código próprio.
- Os componentes em `src/components/ui/` são código do projeto: atualizações do shadcn/ui são manuais (`npx shadcn@latest add -o <componente>` seguido de `animate-ui animate`).
- Jest precisou transformar pacotes publicados só como ESM (`motion`, `@animate-ui`, `radix-ui`, `cn`) e ganhou shims de `matchMedia`, `IntersectionObserver` e `ResizeObserver` (`MedConnect/jest.config.js`, `jest.setup.js`).
- O npm 12 bloqueia scripts de instalação por padrão; o `package.json` da raiz lista em `allowScripts` apenas os pacotes que precisam deles (Prisma, bcrypt, esbuild, unrs-resolver do Jest).
